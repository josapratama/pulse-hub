import { db } from "./db.js";
import type { Monitor } from "./types.js";

export class AlertDispatcher {
  public async sendAlert(
    monitor: Monitor,
    event: "DOWN" | "RECOVERED" | "SSL_EXPIRING",
    details?: string
  ) {
    const settings = db.getSettings();
    const isDown = event === "DOWN";
    const emoji = isDown ? "🚨" : event === "SSL_EXPIRING" ? "⚠️" : "✅";
    const statusText = isDown ? "DOWN (Tidak Dapat Diakses)" : event === "SSL_EXPIRING" ? "SSL Segera Kedaluwarsa" : "RECOVERED (Kembali Normal)";

    const title = `${emoji} [PulseHub Alert] ${monitor.name} is ${statusText}`;
    const message = `*${emoji} PulseHub Incident Notification*\n\n` +
      `Layanan: *${monitor.name}*\n` +
      `URL: ${monitor.url}\n` +
      `Grup: ${monitor.group}\n` +
      `Status: *${statusText}*\n` +
      `Latensi Terakhir: ${monitor.latencyMs}ms\n` +
      (details ? `Detail: ${details}\n` : "") +
      `Waktu: ${new Date().toLocaleString("id-ID")}\n\n` +
      `_Dipantau otomatis oleh PulseHub Command Center_`;

    console.log(`📡 [PulseHub Alert] Dispatching alert for ${monitor.name} (${event})...`);

    // 1. Send via NotifyBridge if configured
    if (settings.notifyBridgeUrl) {
      try {
        await fetch(`${settings.notifyBridgeUrl}/api/v1/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(settings.notifyBridgeApiKey ? { "X-API-Key": settings.notifyBridgeApiKey } : {}),
          },
          body: JSON.stringify({
            channels: monitor.alertChannels || ["telegram", "discord", "whatsapp"],
            title,
            message,
            recipient: "admin_alert",
          }),
        });
      } catch (err: any) {
        console.warn("NotifyBridge alert dispatch failed:", err.message);
      }
    }

    // 2. Direct Telegram Fallback
    if (settings.telegramBotToken && settings.telegramChatId) {
      try {
        await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: settings.telegramChatId,
            text: message,
            parse_mode: "Markdown",
          }),
        });
      } catch (err: any) {
        console.warn("Direct Telegram alert failed:", err.message);
      }
    }

    // 3. Direct Discord Fallback
    if (settings.discordWebhookUrl) {
      try {
        await fetch(settings.discordWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "PulseHub Sentry",
            avatar_url: "https://auth.josapratama.com/favicon.ico",
            embeds: [
              {
                title,
                description: message,
                color: isDown ? 0xe11d48 : 0x10b981,
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        });
      } catch (err: any) {
        console.warn("Direct Discord alert failed:", err.message);
      }
    }

    // 4. Dispatch to Custom Webhook Subscribers
    const subscribers = db.getSubscribers().filter((s) => s.active && s.type === "webhook");
    for (const sub of subscribers) {
      try {
        const payload = sub.target.includes("discord.com/api/webhooks")
          ? {
              username: "PulseHub Sentry",
              embeds: [
                {
                  title,
                  description: message,
                  color: isDown ? 0xe11d48 : 0x10b981,
                  timestamp: new Date().toISOString(),
                },
              ],
            }
          : {
              event,
              monitor: {
                id: monitor.id,
                name: monitor.name,
                url: monitor.url,
                group: monitor.group,
                status: monitor.status,
                latencyMs: monitor.latencyMs,
              },
              title,
              message,
              timestamp: new Date().toISOString(),
            };

        fetch(sub.target, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch((err: any) => console.warn(`Subscriber webhook ${sub.id} failed:`, err.message));
      } catch (err: any) {
        console.warn("Subscriber dispatch error:", err.message);
      }
    }
  }
}

export const alerter = new AlertDispatcher();
