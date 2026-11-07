import tls from "tls";
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

  public async checkSingleMonitor(monitor: Monitor): Promise<CheckRecord> {
    const start = Date.now();
    let status: MonitorStatus = "operational";
    let statusCode: number | undefined = undefined;
    let errorMsg: string | undefined = undefined;
    let sslDays: number | undefined = undefined;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), (monitor.timeoutSec || 10) * 1000);

      const res = await fetch(monitor.url, {
        signal: controller.signal,
        headers: { "User-Agent": "PulseHub-Uptime-Monitor/1.0" },
      });
      clearTimeout(timeoutId);

      statusCode = res.status;
      const expected = monitor.expectedStatusCode || 200;

      if (statusCode === expected || (statusCode >= 200 && statusCode < 400)) {
        status = "operational";
      } else {
        status = "down";
        errorMsg = `HTTP status code returned: ${statusCode} (expected ${expected})`;
      }
    } catch (err: any) {
      status = "down";
      errorMsg = err.name === "AbortError" ? "Request timed out" : err.message;
    }

    const latencyMs = Date.now() - start;

    // Check SSL certificate if https
    if (monitor.url.startsWith("https://")) {
      sslDays = await checkSslDays(monitor.url);
    }

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

    if (status === "operational") {
      // Auto-resolve any active incidents for this monitor when it is back operational
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
      if (previousStatus === "operational") {
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
