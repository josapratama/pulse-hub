<template>
  <div class="flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-[#070b14] text-slate-200">
    <!-- ─── Top Control Toolbar ─── -->
    <div class="px-4 py-2.5 bg-[#0b101d] border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap shrink-0">
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Start / Stop Button -->
        <button
          @click="toggleCapture"
          class="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md"
          :class="
            isCapturing
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
          "
        >
          <span class="w-2.5 h-2.5 rounded-full" :class="isCapturing ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'"></span>
          {{ isCapturing ? 'Jeda Capture' : 'Mulai Capture' }}
        </button>

        <!-- Interface Selector -->
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <span class="text-slate-400">Interface:</span>
          <select
            v-model="selectedInterface"
            @change="handleInterfaceChange"
            class="bg-transparent text-cyan-400 font-mono font-semibold focus:outline-none cursor-pointer"
          >
            <option v-for="iface in interfaces" :key="iface" :value="iface" class="bg-slate-900 text-white">
              {{ iface }}
            </option>
          </select>
        </div>

        <!-- Filter Protocol Dropdown -->
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <span class="text-slate-400">Protokol:</span>
          <select
            v-model="selectedProtocol"
            class="bg-transparent text-indigo-300 font-semibold focus:outline-none cursor-pointer"
          >
            <option value="ALL" class="bg-slate-900 text-white">Semua Protokol</option>
            <option value="HTTP" class="bg-slate-900 text-white">HTTP</option>
            <option value="HTTPS/TLS" class="bg-slate-900 text-white">HTTPS / TLS</option>
            <option value="DNS" class="bg-slate-900 text-white">DNS</option>
            <option value="TCP" class="bg-slate-900 text-white">TCP</option>
            <option value="UDP" class="bg-slate-900 text-white">UDP</option>
            <option value="ICMP" class="bg-slate-900 text-white">ICMP (Ping)</option>
            <option value="MQTT" class="bg-slate-900 text-white">MQTT</option>
          </select>
        </div>

        <!-- Search Input Bar -->
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Filter IP, Port, URL, teks..."
            class="w-48 sm:w-64 px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
          <span v-if="searchQuery" @click="searchQuery = ''" class="absolute right-2.5 top-1.5 text-xs text-slate-500 hover:text-white cursor-pointer">✕</span>
        </div>
      </div>

      <!-- Right Action Controls -->
      <div class="flex items-center gap-2">
        <label class="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
          <input type="checkbox" v-model="autoScroll" class="rounded bg-slate-800 border-slate-700 text-cyan-500" />
          <span>Auto-Scroll</span>
        </label>

        <!-- Clear Button -->
        <button
          @click="clearPackets"
          class="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          title="Bersihkan Buffer Paket"
        >
          <span>🗑️</span>
          <span class="hidden sm:inline">Bersihkan</span>
        </button>

        <!-- Export PCAP Button -->
        <a
          href="/api/packets/export/pcap"
          download
          class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all"
          title="Unduh sesi dalam format PCAP untuk dibuka di Wireshark"
        >
          <span>💾</span>
          <span>Ekspor .PCAP</span>
        </a>
      </div>
    </div>

    <!-- ─── Live Metrics & Protocol Distribution Strip ─── -->
    <div class="px-4 py-2 bg-[#090d18] border-b border-slate-800/60 flex items-center justify-between gap-4 text-xs font-mono shrink-0 overflow-x-auto">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1.5">
          <span class="text-slate-400">Paket:</span>
          <span class="font-bold text-white">{{ filteredPackets.length }}</span>
          <span class="text-slate-500">/ {{ stats.totalPackets }}</span>
        </div>
        <span class="text-slate-700">|</span>
        <div class="flex items-center gap-1.5">
          <span class="text-slate-400">Throughput:</span>
          <span class="font-bold text-cyan-400">{{ (stats.bytesPerSec / 1024).toFixed(1) }} KB/s</span>
          <span class="text-slate-500">({{ stats.packetsPerSec }} pkt/s)</span>
        </div>
      </div>

      <!-- Protocol Distribution Pills -->
      <div class="flex items-center gap-1.5 flex-wrap">
        <span
          v-for="(count, proto) in stats.protocolDistribution"
          :key="proto"
          class="px-2 py-0.5 rounded-md border text-[10px] font-semibold"
          :class="getProtocolBadgeClass(proto as string)"
        >
          {{ proto }}: {{ count }}
        </span>
      </div>
    </div>

    <!-- ─── 3-Pane Inspection Architecture ─── -->
    <div class="flex-1 flex flex-col min-h-0">
      
      <!-- Pane 1: Packet Stream Table (Top 55% Height) -->
      <div class="flex-1 overflow-y-auto border-b border-slate-800" ref="tableContainer">
        <table class="w-full text-left text-xs font-mono border-collapse select-text">
          <thead class="sticky top-0 z-20 bg-[#0d1322] border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th class="py-2 px-3 w-16 text-slate-500">No.</th>
              <th class="py-2 px-3 w-28">Waktu</th>
              <th class="py-2 px-3 w-48">Source</th>
              <th class="py-2 px-3 w-48">Destination</th>
              <th class="py-2 px-3 w-28">Protokol</th>
              <th class="py-2 px-3 w-20">Panjang</th>
              <th class="py-2 px-3">Info / Ringkasan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/40">
            <tr
              v-for="pkt in filteredPackets"
              :key="pkt.id"
              @click="selectedPacket = pkt"
              class="cursor-pointer transition-colors"
              :class="
                selectedPacket?.id === pkt.id
                  ? 'bg-cyan-500/20 text-cyan-200 font-semibold'
                  : 'hover:bg-slate-800/60 text-slate-300'
              "
            >
              <td class="py-1.5 px-3 text-slate-500">{{ pkt.id }}</td>
              <td class="py-1.5 px-3 text-slate-400 whitespace-nowrap">{{ pkt.timeFormatted }}</td>
              <td class="py-1.5 px-3 text-cyan-300 truncate max-w-[180px]">
                {{ pkt.sourceIp }}{{ pkt.sourcePort ? `:${pkt.sourcePort}` : '' }}
              </td>
              <td class="py-1.5 px-3 text-indigo-300 truncate max-w-[180px]">
                {{ pkt.destIp }}{{ pkt.destPort ? `:${pkt.destPort}` : '' }}
              </td>
              <td class="py-1.5 px-3">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold border" :class="getProtocolBadgeClass(pkt.protocol)">
                  {{ pkt.protocol }}
                </span>
              </td>
              <td class="py-1.5 px-3 text-slate-400">{{ pkt.length }} B</td>
              <td class="py-1.5 px-3 truncate max-w-[320px] sm:max-w-md lg:max-w-xl text-slate-200" :title="pkt.info">
                {{ pkt.info }}
              </td>
            </tr>
            <tr v-if="filteredPackets.length === 0">
              <td colspan="7" class="py-12 text-center text-slate-500">
                Belum ada paket yang cocok dengan filter atau sedang menunggu data capture...
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Split Bottom View: Pane 2 (Layer Tree) + Pane 3 (Hex & ASCII Dump) -->
      <div class="h-64 sm:h-72 flex border-t border-slate-800 divide-x divide-slate-800 bg-[#080c16] shrink-0">
        
        <!-- Pane 2: Layer Tree Accordion (Left 45%) -->
        <div class="w-1/2 overflow-y-auto p-3 text-xs font-mono space-y-2">
          <div class="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
            <span class="text-xs font-bold uppercase tracking-wider text-cyan-400">
              🔍 Detail Lapisan Paket (Layer Tree)
            </span>
            <span v-if="selectedPacket" class="text-[10px] text-slate-400 font-bold">
              Paket #{{ selectedPacket.id }}
            </span>
          </div>

          <div v-if="!selectedPacket" class="py-8 text-center text-slate-500">
            Klik salah satu baris paket di tabel atas untuk melihat dekonstruksi layer protokol.
          </div>

          <div v-else class="space-y-1.5 select-text">
            <!-- Frame Layer -->
            <details class="bg-slate-900/60 border border-slate-800 rounded-lg p-2" open>
              <summary class="font-bold text-slate-300 cursor-pointer hover:text-cyan-400">
                ▶ Frame {{ selectedPacket.layers.frame.number }}: {{ selectedPacket.layers.frame.length }} bytes pada interface {{ selectedPacket.layers.frame.interface }}
              </summary>
              <div class="mt-1.5 pl-4 space-y-0.5 text-slate-400 text-[11px]">
                <div>Waktu Arrival: {{ selectedPacket.layers.frame.time }}</div>
                <div>Panjang Frame: {{ selectedPacket.layers.frame.length }} bytes ({{ selectedPacket.layers.frame.length * 8 }} bits)</div>
                <div>Status Interface: {{ selectedPacket.layers.frame.interface }}</div>
              </div>
            </details>

            <!-- Ethernet II Layer -->
            <details class="bg-slate-900/60 border border-slate-800 rounded-lg p-2" open>
              <summary class="font-bold text-slate-300 cursor-pointer hover:text-cyan-400">
                ▶ Ethernet II, Src: {{ selectedPacket.layers.ethernet.srcMac }}, Dst: {{ selectedPacket.layers.ethernet.dstMac }}
              </summary>
              <div class="mt-1.5 pl-4 space-y-0.5 text-slate-400 text-[11px]">
                <div>Destination MAC: {{ selectedPacket.layers.ethernet.dstMac }}</div>
                <div>Source MAC: {{ selectedPacket.layers.ethernet.srcMac }}</div>
                <div>Tipe EtherType: {{ selectedPacket.layers.ethernet.type }}</div>
              </div>
            </details>

            <!-- IPv4 Layer -->
            <details v-if="selectedPacket.layers.ip" class="bg-slate-900/60 border border-slate-800 rounded-lg p-2" open>
              <summary class="font-bold text-slate-300 cursor-pointer hover:text-cyan-400">
                ▶ Internet Protocol v4, Src: {{ selectedPacket.layers.ip.src }}, Dst: {{ selectedPacket.layers.ip.dst }}
              </summary>
              <div class="mt-1.5 pl-4 space-y-0.5 text-slate-400 text-[11px]">
                <div>Versi IP: 4</div>
                <div>Source IP Address: {{ selectedPacket.layers.ip.src }}</div>
                <div>Destination IP Address: {{ selectedPacket.layers.ip.dst }}</div>
                <div>Time to Live (TTL): {{ selectedPacket.layers.ip.ttl }}</div>
                <div>Protokol: {{ selectedPacket.layers.ip.protocol }}</div>
              </div>
            </details>

            <!-- Transport Layer (TCP / UDP) -->
            <details v-if="selectedPacket.layers.transport" class="bg-slate-900/60 border border-slate-800 rounded-lg p-2" open>
              <summary class="font-bold text-slate-300 cursor-pointer hover:text-cyan-400">
                ▶ {{ selectedPacket.layers.transport.protocol }}, Src Port: {{ selectedPacket.layers.transport.srcPort }}, Dst Port: {{ selectedPacket.layers.transport.dstPort }}
              </summary>
              <div class="mt-1.5 pl-4 space-y-0.5 text-slate-400 text-[11px]">
                <div>Source Port: {{ selectedPacket.layers.transport.srcPort }}</div>
                <div>Destination Port: {{ selectedPacket.layers.transport.dstPort }}</div>
                <div v-if="selectedPacket.layers.transport.flags">Flags: {{ selectedPacket.layers.transport.flags }}</div>
                <div v-if="selectedPacket.layers.transport.seq">Sequence Number: {{ selectedPacket.layers.transport.seq }}</div>
              </div>
            </details>

            <!-- Application Layer -->
            <details v-if="selectedPacket.layers.app" class="bg-slate-900/60 border border-cyan-500/30 rounded-lg p-2" open>
              <summary class="font-bold text-cyan-300 cursor-pointer hover:text-white">
                ▶ Application Data ({{ selectedPacket.protocol }})
              </summary>
              <div class="mt-1.5 pl-4 space-y-0.5 text-cyan-100 text-[11px]">
                <div v-for="(val, key) in selectedPacket.layers.app" :key="key">
                  <span class="text-slate-400 uppercase font-semibold">{{ key }}:</span> {{ val }}
                </div>
              </div>
            </details>
          </div>
        </div>

        <!-- Pane 3: Hex & ASCII Inspector (Right 55%) -->
        <div class="w-1/2 overflow-y-auto p-3 text-xs font-mono flex flex-col bg-[#050811]">
          <div class="flex items-center justify-between pb-1.5 border-b border-slate-800/80 mb-2">
            <span class="text-xs font-bold uppercase tracking-wider text-amber-400">
              💾 Raw Packet Hex & ASCII Inspector (Hexdump)
            </span>
            <span class="text-[10px] text-slate-500">Wireshark Format</span>
          </div>

          <div v-if="!selectedPacket" class="flex-1 flex items-center justify-center text-slate-600">
            Pilih paket untuk melihat hexdump mentah
          </div>

          <div v-else class="flex-1 overflow-x-auto select-text">
            <div class="grid grid-cols-12 gap-2 text-[11px] text-slate-300">
              <!-- Hex Dump View with Offsets -->
              <div class="col-span-8 font-mono space-y-0.5 text-emerald-400/90 leading-relaxed">
                <div v-for="(row, idx) in formatHexRows(selectedPacket.rawHex)" :key="idx" class="flex gap-3">
                  <span class="text-slate-500 select-none">{{ (idx * 16).toString(16).padStart(4, '0') }}</span>
                  <span class="text-slate-300 font-semibold">{{ row }}</span>
                </div>
              </div>
              
              <!-- ASCII Text Representation -->
              <div class="col-span-4 font-mono space-y-0.5 text-indigo-300/90 border-l border-slate-800 pl-2 leading-relaxed">
                <div v-for="(row, idx) in formatAsciiRows(selectedPacket.rawAscii)" :key="idx">
                  <span>{{ row }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";

interface PacketRecord {
  id: number;
  timestamp: number;
  timeFormatted: string;
  sourceIp: string;
  sourcePort?: number;
  destIp: string;
  destPort?: number;
  protocol: string;
  length: number;
  info: string;
  layers: any;
  rawHex: string;
  rawAscii: string;
}

const packets = ref<PacketRecord[]>([]);
const selectedPacket = ref<PacketRecord | null>(null);
const isCapturing = ref(true);
const selectedInterface = ref("any");
const interfaces = ref<string[]>(["any"]);
const selectedProtocol = ref("ALL");
const searchQuery = ref("");
const autoScroll = ref(true);
const tableContainer = ref<HTMLElement | null>(null);

const stats = ref({
  isCapturing: true,
  activeInterface: "any",
  totalPackets: 0,
  bytesReceived: 0,
  packetsPerSec: 0,
  bytesPerSec: 0,
  protocolDistribution: {} as Record<string, number>,
});

let eventSource: EventSource | null = null;

const filteredPackets = computed(() => {
  return packets.value.filter((p) => {
    // Protocol Filter
    if (selectedProtocol.value !== "ALL" && p.protocol !== selectedProtocol.value) {
      return false;
    }
    // Search Filter
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      const matchIp = p.sourceIp.toLowerCase().includes(q) || p.destIp.toLowerCase().includes(q);
      const matchPort = (p.sourcePort && String(p.sourcePort).includes(q)) || (p.destPort && String(p.destPort).includes(q));
      const matchInfo = p.info.toLowerCase().includes(q);
      const matchProto = p.protocol.toLowerCase().includes(q);
      if (!matchIp && !matchPort && !matchInfo && !matchProto) return false;
    }
    return true;
  });
});

function getProtocolBadgeClass(proto: string): string {
  switch (proto) {
    case "HTTP":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "HTTPS/TLS":
      return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
    case "DNS":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "MQTT":
      return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    case "TCP":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "UDP":
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "ICMP":
      return "bg-pink-500/15 text-pink-400 border-pink-500/30";
    default:
      return "bg-slate-500/15 text-slate-400 border-slate-500/30";
  }
}

function formatHexRows(hexStr: string): string[] {
  if (!hexStr) return [];
  const bytes = hexStr.split(" ");
  const rows: string[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    rows.push(bytes.slice(i, i + 16).join(" "));
  }
  return rows;
}

function formatAsciiRows(asciiStr: string): string[] {
  if (!asciiStr) return [];
  const rows: string[] = [];
  for (let i = 0; i < asciiStr.length; i += 16) {
    rows.push(asciiStr.substring(i, i + 16));
  }
  return rows;
}

async function loadInterfaces() {
  try {
    const res = await fetch("/api/packets/interfaces");
    const j = await res.json();
    if (j.interfaces) interfaces.value = j.interfaces;
  } catch (e) {}
}

async function fetchInitialPackets() {
  try {
    const res = await fetch("/api/packets?limit=150");
    const j = await res.json();
    if (j.packets) {
      packets.value = j.packets;
      if (packets.value.length > 0 && !selectedPacket.value) {
        selectedPacket.value = packets.value[packets.value.length - 1];
      }
    }
    if (j.stats) stats.value = j.stats;
  } catch (e) {}
}

function startSseStream() {
  if (eventSource) eventSource.close();
  eventSource = new EventSource("/api/packets/stream");

  eventSource.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "packet") {
        packets.value.push(msg.data);
        if (packets.value.length > 1000) {
          packets.value.shift();
        }
        if (!selectedPacket.value) {
          selectedPacket.value = msg.data;
        }
        if (autoScroll.value && tableContainer.value) {
          nextTick(() => {
            if (tableContainer.value) {
              tableContainer.value.scrollTop = tableContainer.value.scrollHeight;
            }
          });
        }
      } else if (msg.type === "stats") {
        stats.value = msg.data;
      }
    } catch (e) {}
  };
}

async function toggleCapture() {
  isCapturing.value = !isCapturing.value;
  try {
    if (isCapturing.value) {
      await fetch("/api/packets/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interface: selectedInterface.value }),
      });
    } else {
      await fetch("/api/packets/stop", { method: "POST" });
    }
  } catch (e) {}
}

async function handleInterfaceChange() {
  if (isCapturing.value) {
    await fetch("/api/packets/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interface: selectedInterface.value }),
    });
  }
}

async function clearPackets() {
  try {
    await fetch("/api/packets", { method: "DELETE" });
    packets.value = [];
    selectedPacket.value = null;
  } catch (e) {}
}

onMounted(() => {
  loadInterfaces();
  fetchInitialPackets();
  startSseStream();
});

onUnmounted(() => {
  if (eventSource) eventSource.close();
});
</script>

