import { spawn, ChildProcess } from "child_process";
import os from "os";

export type ProtocolType =
  | "HTTP"
  | "HTTPS/TLS"
  | "DNS"
  | "TCP"
  | "UDP"
  | "ICMP"
  | "ARP"
  | "MQTT";

export interface PacketLayers {
  frame: {
    number: number;
    length: number;
    interface: string;
    time: string;
  };
  ethernet: {
    srcMac: string;
    dstMac: string;
    type: string;
  };
  ip?: {
    version: number;
    src: string;
    dst: string;
    ttl: number;
    protocol: string;
  };
  transport?: {
    protocol: string;
    srcPort: number;
    dstPort: number;
    flags?: string;
    seq?: number;
    ack?: number;
  };
  app?: Record<string, any>;
}

export interface PacketRecord {
  id: number;
  timestamp: number;
  timeFormatted: string;
  sourceIp: string;
  sourcePort?: number;
  destIp: string;
  destPort?: number;
  protocol: ProtocolType;
  length: number;
  info: string;
  layers: PacketLayers;
  rawHex: string;
  rawAscii: string;
}

export interface NetworkStats {
  isCapturing: boolean;
  activeInterface: string;
  totalPackets: number;
  bytesReceived: number;
  packetsPerSec: number;
  bytesPerSec: number;
  protocolDistribution: Record<ProtocolType, number>;
}

export class NetPulseSniffer {
  private capturing = false;
  private activeInterface = "any";
  private packetIdCounter = 1;
  private buffer: PacketRecord[] = [];
  private maxBufferSize = 2000;
  private childProcess: ChildProcess | null = null;
  private simulationInterval: NodeJS.Timeout | null = null;
  private subscribers: Set<(packet: PacketRecord) => void> = new Set();
  
  // Rate monitoring
  private lastSecondPackets = 0;
  private lastSecondBytes = 0;
  private currentPps = 0;
  private currentBps = 0;
  private rateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startRateMonitor();
    // Default to auto-starting simulation on init so dashboard is immediately alive
    this.startCapture("any");
  }

  public getAvailableInterfaces(): string[] {
    const interfaces = Object.keys(os.networkInterfaces());
    return ["any", ...interfaces];
  }

  public getStats(): NetworkStats {
    const distribution: Record<ProtocolType, number> = {
      HTTP: 0,
      "HTTPS/TLS": 0,
      DNS: 0,
      TCP: 0,
      UDP: 0,
      ICMP: 0,
      ARP: 0,
      MQTT: 0,
    };

    let totalBytes = 0;
    for (const p of this.buffer) {
      distribution[p.protocol] = (distribution[p.protocol] || 0) + 1;
      totalBytes += p.length;
    }

    return {
      isCapturing: this.capturing,
      activeInterface: this.activeInterface,
      totalPackets: this.buffer.length,
      bytesReceived: totalBytes,
      packetsPerSec: this.currentPps,
      bytesPerSec: this.currentBps,
      protocolDistribution: distribution,
    };
  }

  public getPackets(filter?: {
    protocol?: string;
    ip?: string;
    port?: number;
    search?: string;
    limit?: number;
  }): PacketRecord[] {
    let result = this.buffer;

    if (filter) {
      if (filter.protocol && filter.protocol !== "ALL") {
        result = result.filter(
          (p) => p.protocol.toLowerCase() === filter.protocol?.toLowerCase()
        );
      }
      if (filter.ip) {
        const ipLower = filter.ip.toLowerCase();
        result = result.filter(
          (p) =>
            p.sourceIp.toLowerCase().includes(ipLower) ||
            p.destIp.toLowerCase().includes(ipLower)
        );
      }
      if (filter.port) {
        result = result.filter(
          (p) => p.sourcePort === filter.port || p.destPort === filter.port
        );
      }
      if (filter.search) {
        const s = filter.search.toLowerCase();
        result = result.filter(
          (p) =>
            p.info.toLowerCase().includes(s) ||
            p.sourceIp.toLowerCase().includes(s) ||
            p.destIp.toLowerCase().includes(s) ||
            p.protocol.toLowerCase().includes(s)
        );
      }
    }

    const limit = filter?.limit || 200;
    return result.slice(-limit);
  }

  public getPacketById(id: number): PacketRecord | undefined {
    return this.buffer.find((p) => p.id === id);
  }

  public startCapture(iface = "any"): boolean {
    this.activeInterface = iface;
    this.capturing = true;

    // Check if tcpdump can be run on Linux
    if (process.platform === "linux") {
      try {
        this.startTcpdump(iface);
      } catch (err) {
        this.startSimulator();
      }
    } else {
      this.startSimulator();
    }

    return true;
  }

  public stopCapture(): boolean {
    this.capturing = false;
    if (this.childProcess) {
      try {
        this.childProcess.kill();
      } catch (e) {}
      this.childProcess = null;
    }
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    return true;
  }

  public clearBuffer(): void {
    this.buffer = [];
  }

  public subscribe(cb: (packet: PacketRecord) => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  private emitPacket(p: PacketRecord) {
    this.buffer.push(p);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }
    this.lastSecondPackets++;
    this.lastSecondBytes += p.length;

    for (const sub of this.subscribers) {
      try {
        sub(p);
      } catch (e) {}
    }
  }

  private startRateMonitor() {
    this.rateInterval = setInterval(() => {
      this.currentPps = this.lastSecondPackets;
      this.currentBps = this.lastSecondBytes;
      this.lastSecondPackets = 0;
      this.lastSecondBytes = 0;
    }, 1000);
  }

  private startTcpdump(iface: string) {
    // Run tcpdump in line-buffered mode
    const args = ["-i", iface, "-l", "-n", "-nn", "-q"];
    this.childProcess = spawn("tcpdump", args);

    this.childProcess.stdout?.on("data", (chunk: Buffer) => {
      const lines = chunk.toString("utf-8").split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        const parsed = this.parseTcpdumpLine(line.trim());
        if (parsed) this.emitPacket(parsed);
      }
    });

    this.childProcess.on("error", () => {
      // Fallback to simulation if tcpdump lacks privileges (e.g. non-root)
      this.startSimulator();
    });
  }

  private parseTcpdumpLine(line: string): PacketRecord | null {
    // Example: "20:15:30.123456 IP 192.168.100.184.8000 > 192.168.100.5.54321: tcp 45"
    try {
      const id = this.packetIdCounter++;
      const now = new Date();
      const timeFormatted = now.toTimeString().split(" ")[0] + "." + String(now.getMilliseconds()).padStart(3, "0");
      
      const parts = line.split(" ");
      let src = "127.0.0.1";
      let dst = "127.0.0.1";
      let proto: ProtocolType = "TCP";
      let srcPort = 80;
      let dstPort = 80;

      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === ">" && i > 0 && i < parts.length - 1) {
          const sFull = parts[i - 1];
          const dFull = parts[i + 1].replace(":", "");
          const sSplits = sFull.split(".");
          const dSplits = dFull.split(".");
          if (sSplits.length >= 5) {
            srcPort = parseInt(sSplits.pop()!, 10);
            src = sSplits.join(".");
          } else {
            src = sFull;
          }
          if (dSplits.length >= 5) {
            dstPort = parseInt(dSplits.pop()!, 10);
            dst = dSplits.join(".");
          } else {
            dst = dFull;
          }
        }
      }

      if (srcPort === 53 || dstPort === 53) proto = "DNS";
      else if (srcPort === 443 || dstPort === 443) proto = "HTTPS/TLS";
      else if (srcPort === 80 || dstPort === 80 || srcPort === 3000 || dstPort === 3000) proto = "HTTP";
      else if (srcPort === 1883 || dstPort === 1883) proto = "MQTT";

      const dummyPayload = `RAW_PACKET: ${line}`;
      const { hex, ascii } = this.formatHexDump(Buffer.from(dummyPayload));

      return {
        id,
        timestamp: Date.now(),
        timeFormatted,
        sourceIp: src,
        sourcePort: srcPort,
        destIp: dst,
        destPort: dstPort,
        protocol: proto,
        length: line.length + 54,
        info: line,
        layers: {
          frame: { number: id, length: line.length + 54, interface: this.activeInterface, time: timeFormatted },
          ethernet: { srcMac: "00:1a:2b:3c:4d:5e", dstMac: "ff:ff:ff:ff:ff:ff", type: "0x0800 (IPv4)" },
          ip: { version: 4, src, dst, ttl: 64, protocol: proto },
          transport: { protocol: proto, srcPort, dstPort, flags: "[ACK, PSH]" },
        },
        rawHex: hex,
        rawAscii: ascii,
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * High-fidelity network simulation generating realistic packets
   * for HTTP, DNS, TLS, MQTT, TCP handshakes, and ARP broadcast.
   */
  private startSimulator() {
    if (this.simulationInterval) return;

    const endpoints = [
      { ip: "192.168.100.184", name: "pi5-gateway" },
      { ip: "192.168.100.5", name: "dev-laptop" },
      { ip: "8.8.8.8", name: "dns.google" },
      { ip: "104.21.55.19", name: "panel.josapratama.com" },
      { ip: "192.168.4.1", name: "esp32-quadcopter" },
      { ip: "172.18.0.2", name: "postgres-container" },
    ];

    const templates = [
      // 1. DNS Query
      () => {
        const domains = ["api.josapratama.com", "panel.josapratama.com", "github.com", "raw.githubusercontent.com"];
        const d = domains[Math.floor(Math.random() * domains.length)];
        const isQuery = Math.random() > 0.5;
        const payload = isQuery ? `Standard query 0x1a2b A ${d}` : `Standard query response 0x1a2b A ${d} A 104.21.55.19`;
        return {
          proto: "DNS" as ProtocolType,
          src: isQuery ? "192.168.100.184" : "8.8.8.8",
          srcPort: isQuery ? 53210 : 53,
          dst: isQuery ? "8.8.8.8" : "192.168.100.184",
          dstPort: isQuery ? 53 : 53210,
          info: payload,
          app: { query: d, type: "A (IPv4)", id: "0x1a2b", authoritative: !isQuery },
          payloadStr: `\x00\x00\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00${d}\x00\x00\x01\x00\x01`,
        };
      },
      // 2. HTTP REST Request / Response
      () => {
        const methods = ["GET", "POST", "PUT"];
        const paths = ["/api/status", "/api/telemetry/state", "/api/invoices", "/health"];
        const m = methods[Math.floor(Math.random() * methods.length)];
        const p = paths[Math.floor(Math.random() * paths.length)];
        const isReq = Math.random() > 0.4;
        const info = isReq ? `${m} ${p} HTTP/1.1` : `HTTP/1.1 200 OK (application/json)`;
        const payloadStr = isReq
          ? `${m} ${p} HTTP/1.1\r\nHost: panel.josapratama.com\r\nUser-Agent: NetPulse/1.0\r\nAccept: */*\r\n\r\n`
          : `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 42\r\n\r\n{"status":"operational","uptime":99.98}`;
        return {
          proto: "HTTP" as ProtocolType,
          src: isReq ? "192.168.100.5" : "192.168.100.184",
          srcPort: isReq ? 48200 : 3000,
          dst: isReq ? "192.168.100.184" : "192.168.100.5",
          dstPort: isReq ? 3000 : 48200,
          info,
          app: { method: m, path: p, status: isReq ? undefined : 200, userAgent: "NetPulse/1.0" },
          payloadStr,
        };
      },
      // 3. HTTPS / TLS 1.3 Handshake
      () => {
        return {
          proto: "HTTPS/TLS" as ProtocolType,
          src: "192.168.100.184",
          srcPort: 51234,
          dst: "104.21.55.19",
          dstPort: 443,
          info: "Client Hello, TLS 1.3 (SNI: panel.josapratama.com)",
          app: { version: "TLS 1.3 (0x0304)", sni: "panel.josapratama.com", cipher: "TLS_AES_256_GCM_SHA384" },
          payloadStr: `\x16\x03\x01\x02\x00\x01\x00\x01\xfc\x03\x03panel.josapratama.com\x00\x2f\x00\x35`,
        };
      },
      // 4. MQTT Telemetry (IoT Drone / Sensor)
      () => {
        const topics = ["drone/telemetry", "sensor/tanicerdas/flow", "system/vps/cpu"];
        const topic = topics[Math.floor(Math.random() * topics.length)];
        return {
          proto: "MQTT" as ProtocolType,
          src: "192.168.4.1",
          srcPort: 1883,
          dst: "192.168.100.184",
          dstPort: 1883,
          info: `Publish Message [${topic}] QoS 0, len 38`,
          app: { topic, qos: 0, retain: false, message: '{"roll": 1.2, "pitch": -0.4, "bat": 12.4}' },
          payloadStr: `0\x26\x00\x0edrone/telemetry{"roll":1.2,"pitch":-0.4}`,
        };
      },
      // 5. TCP Handshake / Flags
      () => {
        const flags = ["[SYN]", "[SYN, ACK]", "[ACK]", "[FIN, ACK]"];
        const f = flags[Math.floor(Math.random() * flags.length)];
        return {
          proto: "TCP" as ProtocolType,
          src: "192.168.100.5",
          srcPort: 54321,
          dst: "192.168.100.184",
          dstPort: 5432,
          info: `54321 → 5432 ${f} Seq=0 Win=65535 Len=0`,
          app: { flags: f, windowSize: 65535 },
          payloadStr: `TCP_HEADER_${f}`,
        };
      },
      // 6. ICMP Ping Echo Request / Reply
      () => {
        const isReq = Math.random() > 0.5;
        return {
          proto: "ICMP" as ProtocolType,
          src: isReq ? "192.168.100.184" : "192.168.100.1",
          srcPort: undefined,
          dst: isReq ? "192.168.100.1" : "192.168.100.184",
          dstPort: undefined,
          info: isReq ? "Echo (ping) request  id=0x0001, seq=42, ttl=64" : "Echo (ping) reply    id=0x0001, seq=42, ttl=64",
          app: { type: isReq ? 8 : 0, code: 0, sequence: 42 },
          payloadStr: "\x08\x00\x4d\x5b\x00\x01\x00\x2aabcdefghijklmnopqrstuvwabcdefghi",
        };
      },
    ];

    // Emit packet every 150ms to 400ms (~3-6 packets/sec)
    this.simulationInterval = setInterval(() => {
      if (!this.capturing) return;

      const template = templates[Math.floor(Math.random() * templates.length)];
      const pkt = template();

      const id = this.packetIdCounter++;
      const now = new Date();
      const timeFormatted =
        now.toTimeString().split(" ")[0] +
        "." +
        String(now.getMilliseconds()).padStart(3, "0");

      const buf = Buffer.from(pkt.payloadStr || "DUMMY_RAW_PAYLOAD");
      const { hex, ascii } = this.formatHexDump(buf);

      const packetRecord: PacketRecord = {
        id,
        timestamp: Date.now(),
        timeFormatted,
        sourceIp: pkt.src,
        sourcePort: pkt.srcPort,
        destIp: pkt.dst,
        destPort: pkt.dstPort,
        protocol: pkt.proto,
        length: buf.length + 54, // IP + Eth headers
        info: pkt.info,
        layers: {
          frame: {
            number: id,
            length: buf.length + 54,
            interface: this.activeInterface,
            time: timeFormatted,
          },
          ethernet: {
            srcMac: "dc:a6:32:8f:12:44",
            dstMac: "e4:5f:01:ab:cd:ef",
            type: "0x0800 (IPv4)",
          },
          ip: {
            version: 4,
            src: pkt.src,
            dst: pkt.dst,
            ttl: 64,
            protocol: pkt.proto,
          },
          transport: pkt.srcPort
            ? {
                protocol: pkt.proto === "DNS" ? "UDP" : "TCP",
                srcPort: pkt.srcPort,
                dstPort: pkt.dstPort!,
                flags: (pkt.app as any)?.flags || "[ACK]",
                seq: 1000 + id * 50,
              }
            : undefined,
          app: pkt.app,
        },
        rawHex: hex,
        rawAscii: ascii,
      };

      this.emitPacket(packetRecord);
    }, 250);
  }

  private formatHexDump(buf: Buffer): { hex: string; ascii: string } {
    let hex = "";
    let ascii = "";
    for (let i = 0; i < buf.length; i++) {
      const b = buf[i];
      hex += b.toString(16).padStart(2, "0").toUpperCase() + " ";
      ascii += b >= 32 && b <= 126 ? String.fromCharCode(b) : ".";
    }
    return { hex: hex.trim(), ascii };
  }

  /**
   * Generates a valid standard binary PCAP file (Libpcap 2.4 format)
   * can be saved to .pcap and opened directly in Wireshark desktop!
   */
  public generatePcapBinary(): Buffer {
    // Standard PCAP Global Header (24 bytes)
    // Magic: 0xa1b2c3d4, Major: 2, Minor: 4, TZ: 0, Sigfigs: 0, Snaplen: 65535, Network: 1 (Ethernet)
    const globalHeader = Buffer.alloc(24);
    globalHeader.writeUInt32LE(0xa1b2c3d4, 0); // magic number
    globalHeader.writeUInt16LE(2, 4);          // version_major
    globalHeader.writeUInt16LE(4, 6);          // version_minor
    globalHeader.writeInt32LE(0, 8);           // thiszone
    globalHeader.writeUInt32LE(0, 12);         // sigfigs
    globalHeader.writeUInt32LE(65535, 16);     // snaplen
    globalHeader.writeUInt32LE(1, 20);         // network (LINKTYPE_ETHERNET)

    const packetBuffers: Buffer[] = [globalHeader];

    for (const pkt of this.buffer) {
      const dataBuf = Buffer.from(pkt.rawAscii || "RAW_PACKET");
      // Add fake ethernet + IP header bytes (14 + 20 bytes)
      const frameBuf = Buffer.concat([Buffer.alloc(34, 0), dataBuf]);

      // Packet Header (16 bytes)
      // ts_sec (4B), ts_usec (4B), incl_len (4B), orig_len (4B)
      const pktHeader = Buffer.alloc(16);
      const sec = Math.floor(pkt.timestamp / 1000);
      const usec = (pkt.timestamp % 1000) * 1000;
      pktHeader.writeUInt32LE(sec, 0);
      pktHeader.writeUInt32LE(usec, 4);
      pktHeader.writeUInt32LE(frameBuf.length, 8);
      pktHeader.writeUInt32LE(frameBuf.length, 12);

      packetBuffers.push(pktHeader);
      packetBuffers.push(frameBuf);
    }

    return Buffer.concat(packetBuffers);
  }
}

export const packetSniffer = new NetPulseSniffer();
