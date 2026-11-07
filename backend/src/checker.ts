import tls from "tls";
import net from "net";
import { URL } from "url";
import { db } from "./db.js";
import { alerter } from "./alerter.js";
import type { Monitor, MonitorStatus, CheckRecord } from "./types.js";

async function checkSslDays(urlStr: string): Promise<number | undefined> {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:") return undefined;

    return new Promise((resolve) => {
      const socket = tls.connect(
        {
          host: parsed.hostname,
          port: parsed.port ? Number(parsed.port) : 443,
          servername: parsed.hostname,
          rejectUnauthorized: false,
          timeout: 5000,
        },
        () => {
          const cert = socket.getPeerCertificate();
          socket.destroy();
          if (cert && cert.valid_to) {
            const validTo = new Date(cert.valid_to).getTime();
            const daysRemaining = Math.max(0, Math.floor((validTo - Date.now()) / (24 * 3600 * 1000)));
            resolve(daysRemaining);
          } else {
            resolve(undefined);
          }
        }
      );

      socket.on("error", () => {
        socket.destroy();
        resolve(undefined);
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve(undefined);
      });
    });
  } catch {
    return undefined;
  }
}

async function checkTcpPort(
  host: string,
  port: number,
  timeoutSec = 5
): Promise<{ success: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(timeoutSec * 1000);

    socket.on("connect", () => {
      const latencyMs = Date.now() - start;
      socket.destroy();
      resolve({ success: true, latencyMs });
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve({
        success: false,
        latencyMs: Date.now() - start,
        error: `Connection timed out after ${timeoutSec}s`,
      });
    });

    socket.on("error", (err: any) => {
      socket.destroy();
      resolve({
        success: false,
        latencyMs: Date.now() - start,
        error: err.message,
      });
    });
  });
}

interface ProbeResult {
  status: MonitorStatus;
  statusCode?: number;
  latencyMs: number;
  errorMsg?: string;
  sslDays?: number;
}

export class HealthCheckerEngine {
  private timer: NodeJS.Timeout | null = null;
  private isChecking = false;

  public start() {
    console.log("⏱️ [PulseHub] Starting automated health check background worker...");
    // Initial run immediately
    this.runAllChecks();
    // Recurring runner every 60s
    this.timer = setInterval(() => this.runAllChecks(), 60_000);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async executeSingleProbe(monitor: Monitor): Promise<ProbeResult> {
    const start = Date.now();
    const degradedThreshold = monitor.degradedLatencyMs || 2500;

    // 1. TCP Port Check
    if (monitor.type === "tcp") {
      let host = monitor.url;
      let port = monitor.port || 80;

      // Parse tcp://host:port or host:port if passed in url
      try {
        const cleanUrl = monitor.url.replace(/^tcp:\/\//, "");
        const parts = cleanUrl.split(":");
        host = parts[0];
        if (parts[1]) port = Number(parts[1]);
      } catch {
        // fallback
      }

      const tcpRes = await checkTcpPort(host, port, monitor.timeoutSec || 5);
      const latencyMs = tcpRes.latencyMs;

      if (!tcpRes.success) {
        return {
          status: "down",
          latencyMs,
          errorMsg: tcpRes.error || "TCP port unreachable",
        };
      }

      const status: MonitorStatus = latencyMs > degradedThreshold ? "degraded" : "operational";
      return { status, latencyMs };
    }

    // 2. HTTP / HTTPS Check
    let status: MonitorStatus = "operational";
    let statusCode: number | undefined = undefined;
    let errorMsg: string | undefined = undefined;
    let sslDays: number | undefined = undefined;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), (monitor.timeoutSec || 10) * 1000);

      const headers: Record<string, string> = {
        "User-Agent": "PulseHub-Uptime-Monitor/2.0",
        ...(monitor.customHeaders || {}),
      };

      const res = await fetch(monitor.url, {
        signal: controller.signal,
        headers,
      });
      clearTimeout(timeoutId);

      statusCode = res.status;
      const expected = monitor.expectedStatusCode || 200;

      if (statusCode === expected || (statusCode >= 200 && statusCode < 400)) {
        // Check expected keyword in body if configured
        if (monitor.expectedKeyword && monitor.expectedKeyword.trim() !== "") {
          const bodyText = await res.text();
          if (!bodyText.includes(monitor.expectedKeyword.trim())) {
            status = "down";
            errorMsg = `Kata kunci '${monitor.expectedKeyword}' tidak ditemukan di respon server.`;
          }
        }
      } else {
        status = "down";
        errorMsg = `HTTP status code returned: ${statusCode} (expected ${expected})`;
      }
    } catch (err: any) {
      status = "down";
      errorMsg = err.name === "AbortError" ? "Request timed out" : err.message;
    }

    const latencyMs = Date.now() - start;

    if (status === "operational" && latencyMs > degradedThreshold) {
      status = "degraded";
    }

    if (monitor.url.startsWith("https://")) {
      sslDays = await checkSslDays(monitor.url);
    }

    return {
      status,
      statusCode,
      latencyMs,
      errorMsg,
      sslDays,
    };
  }

  public async checkSingleMonitor(monitor: Monitor): Promise<CheckRecord> {
    const maxRetries = monitor.retryCount !== undefined ? monitor.retryCount : 2;
    let result = await this.executeSingleProbe(monitor);

    // Flapping / False Alarm Protection:
    // If first attempt fails, retry before declaring DOWN!
    if (result.status === "down" && maxRetries > 0) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        await new Promise((r) => setTimeout(r, 1500)); // wait 1.5s
        const retryResult = await this.executeSingleProbe(monitor);
        if (retryResult.status !== "down") {
          result = retryResult;
          break;
        }
      }
    }

    const { status, latencyMs, statusCode, errorMsg, sslDays } = result;

    const record: CheckRecord = {
      timestamp: Date.now(),
      status,
      latencyMs,
      statusCode,
      sslDaysRemaining: sslDays,
      error: errorMsg,
    };

    // Detect state changes and alert!
    const previousStatus = monitor.status;
    const settings = db.getSettings();

    if (status === "operational" || status === "degraded") {
      // Auto-resolve any active incidents for this monitor when it is back operational/degraded
      if (db.hasActiveIncidentForMonitor(monitor.id)) {
        db.resolveActiveIncidentsForMonitor(
          monitor.id,
          "Layanan telah pulih dan kembali operasional secara normal."
        );
      }
      if (previousStatus === "down" && settings.alertOnRecovery) {
        alerter.sendAlert(monitor, "RECOVERED");
      }
    } else if (status === "down") {
      if (previousStatus === "operational" || previousStatus === "degraded") {
        alerter.sendAlert(monitor, "DOWN", errorMsg);
      }
      // Only open a new incident if there is not already an active one for this monitor
      if (settings.autoIncidentOnDown && !db.hasActiveIncidentForMonitor(monitor.id)) {
        db.saveIncident({
          title: `Layanan ${monitor.name} Mengalami Gangguan`,
          severity: "major",
          status: "investigating",
          affectedMonitors: [monitor.id],
        });
      }
    }

    // SSL Expiry Warning Alert (triggers once every 24h if days <= 14)
    if (sslDays !== undefined && sslDays <= 14 && sslDays > 0) {
      const nowMs = Date.now();
      const lastAlertMs = monitor.lastSslAlertAt ? new Date(monitor.lastSslAlertAt).getTime() : 0;
      if (nowMs - lastAlertMs > 24 * 3600 * 1000) {
        alerter.sendAlert(
          monitor,
          "SSL_EXPIRING",
          `Sertifikat SSL untuk ${monitor.name} tersisa ${sslDays} hari lagi sebelum kedaluwarsa.`
        );
        monitor.lastSslAlertAt = new Date(nowMs).toISOString();
      }
    }

    // Record check in database
    db.recordCheck(monitor.id, record);

    return record;
  }

  public async runAllChecks() {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      const monitors = db.getMonitors().filter((m) => !m.paused);
      for (const m of monitors) {
        await this.checkSingleMonitor(m);
      }
    } catch (err) {
      console.error("[PulseHub] Check cycle error:", err);
    } finally {
      this.isChecking = false;
    }
  }
}

export const checker = new HealthCheckerEngine();
