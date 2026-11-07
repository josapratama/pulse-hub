import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import {
  PORT,
  AUTHHUB_URL,
  AUTHHUB_CLIENT_ID,
  AUTHHUB_REDIRECT_URI,
} from "./config.js";
import { db } from "./db.js";
import { checker } from "./checker.js";
import {
  authenticateToken,
  requireAdmin,
  exchangeOAuthCode,
} from "./auth.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(authenticateToken);

// Dynamically resolve built Vue frontend path
function getFrontendDistPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "../frontend/dist"),
    path.resolve(process.cwd(), "frontend/dist"),
    path.resolve(process.cwd(), "dist"),
    path.resolve(__dirname, "../../frontend/dist"),
    path.resolve(__dirname, "../frontend/dist"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

const FRONTEND_DIST = getFrontendDistPath();
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
}

// ─── Public Status API (BetterStack / Instatus Equivalent) ───
app.get("/api/status", (_req: Request, res: Response) => {
  const monitors = db.getMonitors();
  const activeIncidents = db.getActiveIncidents();
  const pastIncidents = db.getIncidents().filter((i) => i.status === "resolved").slice(0, 10);
  const activeMaintenances = db.getActiveMaintenances();
  const settings = db.getSettings();

  // Compute overall ecosystem status
  let systemStatus: "operational" | "degraded" | "major_outage" = "operational";
  const downCount = monitors.filter((m) => m.status === "down").length;
  const degradedCount = monitors.filter((m) => m.status === "degraded").length;

  if (downCount > 0) {
    systemStatus = downCount >= 2 ? "major_outage" : "degraded";
  } else if (degradedCount > 0) {
    systemStatus = "degraded";
  }

  // Attach 90-day history bars to each monitor
  const monitorsWithHistory = monitors.map((m) => ({
    ...m,
    history90d: db.get90DayHistory(m.id),
  }));

  res.json({
    systemStatus,
    systemName: settings.systemName,
    publicTitle: settings.publicStatusPageTitle,
    monitors: monitorsWithHistory,
    activeIncidents,
    pastIncidents,
    activeMaintenances,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/sla-report", (_req: Request, res: Response) => {
  res.json(db.calculateSlaReport());
});

app.get("/api/monitors/:id/history", (req: Request, res: Response) => {
  const id = String(req.params.id);
  const history = db.get90DayHistory(id);
  res.json({ history });
});

app.get("/api/monitors/:id/checks", (req: Request, res: Response) => {
  const id = String(req.params.id);
  const checks = db.getRecentChecks(id, 60);
  res.json({ checks });
});

app.get("/api/monitors/:id/export.csv", (req: Request, res: Response) => {
  const id = String(req.params.id);
  const mon = db.getMonitorById(id);
  if (!mon) return res.status(404).send("Monitor not found");

  const history = db.get90DayHistory(id);
  let csv = "date,status,uptime_percentage,checks_count,avg_latency_ms\n";
  for (const h of history) {
    csv += `${h.date},${h.status},${h.uptimePercentage},${h.checksCount},${h.avgLatencyMs}\n`;
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${mon.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_uptime.csv"`
  );
  res.send(csv);
});

// Manual check trigger
app.post("/api/monitors/:id/check", requireAdmin, async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const mon = db.getMonitorById(id);
  if (!mon) return res.status(404).json({ error: "Monitor not found" });

  const result = await checker.checkSingleMonitor(mon);
  res.json({ success: true, result });
});

app.post("/api/monitors/:id/toggle-pause", requireAdmin, (req: Request, res: Response) => {
  const id = String(req.params.id);
  const updated = db.togglePauseMonitor(id);
  if (!updated) return res.status(404).json({ error: "Monitor not found" });
  res.json({ success: true, monitor: updated });
});

// ─── Monitors Management (Admin) ─────────────────────────────
app.get("/api/monitors", (req: Request, res: Response) => {
  res.json({ monitors: db.getMonitors() });
});

app.post("/api/monitors", requireAdmin, (req: Request, res: Response) => {
  const { name, url } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: "Name and URL are required" });
  }

  const saved = db.saveMonitor(req.body);
  // Trigger initial check immediately in background
  checker.checkSingleMonitor(saved);
  res.status(201).json({ success: true, monitor: saved });
});

app.put("/api/monitors/:id", requireAdmin, (req: Request, res: Response) => {
  const id = String(req.params.id);
  const mon = db.getMonitorById(id);
  if (!mon) return res.status(404).json({ error: "Monitor not found" });

  const updated = db.saveMonitor({ ...req.body, id });
  res.json({ success: true, monitor: updated });
});

app.delete("/api/monitors/:id", requireAdmin, (req: Request, res: Response) => {
  const deleted = db.deleteMonitor(String(req.params.id));
  if (!deleted) return res.status(404).json({ error: "Monitor not found" });
  res.json({ success: true });
});

// ─── Dynamic SVG Shields Badges ──────────────────────────────
function renderShieldBadge(leftText: string, rightText: string, rightColor: string): string {
  const leftWidth = Math.max(40, leftText.length * 7 + 14);
  const rightWidth = Math.max(40, rightText.length * 7 + 14);
  const totalWidth = leftWidth + rightWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${leftText}: ${rightText}">
  <title>${leftText}: ${rightText}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="4" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftWidth}" height="20" fill="#24292e"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="20" fill="${rightColor}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="${(leftWidth * 10) / 2}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(leftWidth - 14) * 10}">${leftText}</text>
    <text x="${(leftWidth * 10) / 2}" y="140" transform="scale(.1)" fill="#fff" textLength="${(leftWidth - 14) * 10}">${leftText}</text>
    <text aria-hidden="true" x="${(leftWidth * 10) + (rightWidth * 10) / 2}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(rightWidth - 14) * 10}">${rightText}</text>
    <text x="${(leftWidth * 10) + (rightWidth * 10) / 2}" y="140" transform="scale(.1)" fill="#fff" textLength="${(rightWidth - 14) * 10}">${rightText}</text>
  </g>
</svg>`;
}

app.get("/api/badges/:id/status.svg", (req: Request, res: Response) => {
  const id = String(req.params.id);
  const mon = db.getMonitorById(id);
  if (!mon) {
    res.setHeader("Content-Type", "image/svg+xml");
    return res.send(renderShieldBadge("PulseHub", "not found", "#6b7280"));
  }

  const status = mon.paused ? "paused" : mon.status;
  const color =
    status === "operational"
      ? "#10b981"
      : status === "degraded"
      ? "#f59e0b"
      : status === "paused"
      ? "#6b7280"
      : "#ef4444";

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.send(renderShieldBadge(mon.name, status, color));
});

app.get("/api/badges/:id/uptime.svg", (req: Request, res: Response) => {
  const id = String(req.params.id);
  const mon = db.getMonitorById(id);
  if (!mon) {
    res.setHeader("Content-Type", "image/svg+xml");
    return res.send(renderShieldBadge("uptime 90d", "not found", "#6b7280"));
  }

  const uptime = `${mon.uptime90d || 100}%`;
  const color =
    mon.uptime90d >= 99
      ? "#10b981"
      : mon.uptime90d >= 95
      ? "#f59e0b"
      : "#ef4444";

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.send(renderShieldBadge(`${mon.name} uptime`, uptime, color));
});

// ─── RSS 2.0 Feed for Status & Incidents ─────────────────────
app.get("/api/incidents/rss.xsl", (_req: Request, res: Response) => {
  const xsl = `<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="id">
      <head>
        <title><xsl:value-of select="/rss/channel/title"/> - Web View</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=JetBrains+Mono:wght@500;700&amp;display=swap" rel="stylesheet"/>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background-color: #030712;
            color: #f3f4f6;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.6;
            padding: 24px 16px;
            min-height: 100vh;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            background: linear-gradient(135deg, rgba(30, 27, 75, 0.7), rgba(49, 46, 129, 0.5));
            border: 1px solid rgba(99, 102, 241, 0.35);
            border-radius: 24px;
            padding: 28px;
            margin-bottom: 24px;
            box-shadow: 0 20px 40px -15px rgba(0,0,0,0.6);
          }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(99, 102, 241, 0.2);
            color: #a5b4fc;
            border: 1px solid rgba(99, 102, 241, 0.3);
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 12px;
          }
          .badge-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: #38bdf8;
            box-shadow: 0 0 8px #38bdf8;
          }
          h1 {
            font-size: 22px;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 8px;
            letter-spacing: -0.02em;
          }
          p.desc {
            font-size: 13px;
            color: #9ca3af;
            margin-bottom: 18px;
          }
          .btn-group {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
          }
          .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #4f46e5;
            color: #ffffff;
            text-decoration: none;
            padding: 9px 18px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            border: none;
            transition: all 0.2s ease;
          }
          .btn:hover {
            background: #4338ca;
            transform: translateY(-1px);
          }
          .btn-secondary {
            background: #1f2937;
            color: #e5e7eb;
            border: 1px solid #374151;
          }
          .btn-secondary:hover {
            background: #374151;
          }
          .info-banner {
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid #1e293b;
            border-radius: 16px;
            padding: 16px 20px;
            font-size: 12px;
            color: #94a3b8;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .info-icon {
            font-size: 22px;
            flex-shrink: 0;
          }
          .items-header {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #64748b;
            margin-bottom: 16px;
            padding-left: 4px;
          }
          .card {
            background: rgba(17, 24, 39, 0.85);
            border: 1px solid #1f2937;
            border-radius: 20px;
            padding: 22px;
            margin-bottom: 16px;
            transition: all 0.2s ease;
          }
          .card:hover {
            border-color: #374151;
            transform: translateY(-2px);
            box-shadow: 0 12px 24px -10px rgba(0,0,0,0.5);
          }
          .card-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 10px;
            flex-wrap: wrap;
          }
          .card-title {
            font-size: 15px;
            font-weight: 700;
            color: #ffffff;
            line-height: 1.4;
          }
          .card-title a {
            color: #ffffff;
            text-decoration: none;
          }
          .card-title a:hover {
            color: #818cf8;
          }
          .card-date {
            font-size: 11px;
            color: #6b7280;
            font-family: 'JetBrains Mono', monospace;
            white-space: nowrap;
          }
          .card-desc {
            font-size: 13px;
            color: #cbd5e1;
            line-height: 1.6;
            white-space: pre-line;
            border-left: 2px solid rgba(99, 102, 241, 0.5);
            padding-left: 14px;
            margin-top: 10px;
          }
          footer {
            text-align: center;
            font-size: 11px;
            color: #475569;
            margin-top: 48px;
            padding-top: 24px;
            border-top: 1px solid #111827;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="badge">
              <span class="badge-dot"></span>
              PulseHub RSS 2.0 Feed
            </div>
            <h1><xsl:value-of select="/rss/channel/title"/></h1>
            <p class="desc"><xsl:value-of select="/rss/channel/description"/></p>
            <div class="btn-group">
              <a href="{/rss/channel/link}" class="btn">
                <span>🛡️ Buka Status Page</span>
              </a>
              <button onclick="navigator.clipboard.writeText(window.location.href); alert('URL RSS Feed berhasil disalin!');" class="btn btn-secondary">
                <span>📋 Salin URL Feed</span>
              </button>
            </div>
          </div>

          <div class="info-banner">
            <span class="info-icon">📡</span>
            <div>
              <strong>Informasi Feed XML:</strong> Halaman ini adalah versi web visual dari RSS Feed PulseHub. Anda dapat menyalin URL browser ini langsung ke aplikasi RSS Reader (Feedly, Inoreader, Thunderbird) atau webhook bot Discord/Slack untuk berlangganan notifikasi insiden otomatis.
            </div>
          </div>

          <div class="items-header">Riwayat Insiden &amp; Pembaruan Terkini</div>

          <xsl:for-each select="/rss/channel/item">
            <div class="card">
              <div class="card-header">
                <h2 class="card-title">
                  <a href="{link}"><xsl:value-of select="title"/></a>
                </h2>
                <div class="card-date"><xsl:value-of select="pubDate"/></div>
              </div>
              <div class="card-desc">
                <xsl:value-of select="description"/>
              </div>
            </div>
          </xsl:for-each>

          <footer>
            &copy; 2026 Josa Pratama Cloud Network &bull; Powered by PulseHub Sentry
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.send(xsl);
});

app.get(["/rss.xml", "/api/incidents/rss"], (_req: Request, res: Response) => {
  const incidents = db.getIncidents().slice(0, 20);
  const settings = db.getSettings();
  const siteUrl = "https://pulse-hub.josapratama.com";

  let itemsXml = "";
  for (const inc of incidents) {
    const latestUpdate = inc.updates[0]?.message || inc.title;
    const pubDate = new Date(inc.createdAt).toUTCString();
    itemsXml += `
    <item>
      <title><![CDATA[${inc.title} [${inc.status.toUpperCase()}]]]></title>
      <link>${siteUrl}#incident-${inc.id}</link>
      <guid isPermaLink="false">${inc.id}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[Status: ${inc.status} | Severity: ${inc.severity}\n\n${latestUpdate}]]></description>
    </item>`;
  }

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<?xml-stylesheet type="text/xsl" href="/api/incidents/rss.xsl"?>
<rss version="2.0">
  <channel>
    <title><![CDATA[${settings.systemName} - Status & Incidents Feed]]></title>
    <link>${siteUrl}</link>
    <description><![CDATA[${settings.publicStatusPageTitle}]]></description>
    <language>id</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${itemsXml}
  </channel>
</rss>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.send(rss);
});

// ─── Subscribers API ─────────────────────────────────────────
app.get("/api/subscribers", requireAdmin, (_req: Request, res: Response) => {
  res.json({ subscribers: db.getSubscribers() });
});

app.post("/api/subscribers", (req: Request, res: Response) => {
  const { type, target, name } = req.body;
  if (!target || !target.trim()) {
    return res.status(400).json({ error: "Target URL webhook atau email wajib diisi." });
  }

  const sub = db.addSubscriber({
    type: type === "email" ? "email" : "webhook",
    target: target.trim(),
    name: name?.trim(),
  });
  res.status(201).json({ success: true, subscriber: sub });
});

app.delete("/api/subscribers/:id", requireAdmin, (req: Request, res: Response) => {
  const id = String(req.params.id);
  const deleted = db.deleteSubscriber(id);
  if (!deleted) return res.status(404).json({ error: "Subscriber not found" });
  res.json({ success: true });
});

// ─── Maintenance Windows API ─────────────────────────────────
app.get("/api/maintenances", (_req: Request, res: Response) => {
  res.json({
    active: db.getActiveMaintenances(),
    all: db.getMaintenances(),
  });
});

app.post("/api/maintenances", requireAdmin, (req: Request, res: Response) => {
  const { title, description, affectedMonitors, startAt, endAt, status } = req.body;
  if (!title || !startAt || !endAt) {
    return res.status(400).json({ error: "Title, startAt, dan endAt wajib diisi." });
  }

  const saved = db.saveMaintenance({
    title,
    description,
    affectedMonitors: affectedMonitors || [],
    startAt,
    endAt,
    status: status || "scheduled",
  });
  res.status(201).json({ success: true, maintenance: saved });
});

app.delete("/api/maintenances/:id", requireAdmin, (req: Request, res: Response) => {
  const id = String(req.params.id);
  const deleted = db.deleteMaintenance(id);
  if (!deleted) return res.status(404).json({ error: "Maintenance window not found" });
  res.json({ success: true });
});

// ─── Incident Command (Admin) ────────────────────────────────
app.get("/api/incidents", (_req: Request, res: Response) => {
  res.json({ incidents: db.getIncidents() });
});

app.post("/api/incidents", requireAdmin, (req: Request, res: Response) => {
  const { title, severity, status, affectedMonitors } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });

  const inc = db.saveIncident({ title, severity, status, affectedMonitors });
  res.status(201).json({ success: true, incident: inc });
});

app.post("/api/incidents/resolve-all", requireAdmin, (req: Request, res: Response) => {
  const { message } = req.body || {};
  const count = db.resolveAllActiveIncidents(message || "Semua insiden telah diselesaikan oleh administrator.");
  res.json({ success: true, resolvedCount: count });
});

app.post("/api/incidents/cleanup", requireAdmin, (_req: Request, res: Response) => {
  const result = db.cleanupDuplicateIncidents();
  res.json({ success: true, ...result });
});

app.delete("/api/incidents/:id", requireAdmin, (req: Request, res: Response) => {
  const id = String(req.params.id);
  const deleted = db.deleteIncident(id);
  if (!deleted) return res.status(404).json({ error: "Incident not found" });
  res.json({ success: true });
});

app.post("/api/incidents/:id/update", requireAdmin, (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { status, message } = req.body;
  if (!status || !message) {
    return res.status(400).json({ error: "status and message are required" });
  }

  const updated = db.addIncidentUpdate(id, status, message);
  if (!updated) return res.status(404).json({ error: "Incident not found" });
  res.json({ success: true, incident: updated });
});

// ─── Settings API (Admin) ────────────────────────────────────
app.get("/api/settings", (_req: Request, res: Response) => {
  res.json({ settings: db.getSettings() });
});

app.post("/api/settings", requireAdmin, (req: Request, res: Response) => {
  const updated = db.updateSettings(req.body);
  res.json({ success: true, settings: updated });
});

// ─── AuthHub SSO ─────────────────────────────────────────────
app.get("/api/auth/config", (req: Request, res: Response) => {
  const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host") || `localhost:${PORT}`;
  const dynamicRedirect = `${protocol}://${host}/auth/callback`;
  const resolvedRedirect = AUTHHUB_REDIRECT_URI || dynamicRedirect;

  res.json({
    authHubUrl: AUTHHUB_URL,
    clientId: AUTHHUB_CLIENT_ID,
    clientSlug: "pulse-hub",
    redirectUri: resolvedRedirect,
    ssoLoginUrl: `${AUTHHUB_URL}/oauth/authorize?client_id=${AUTHHUB_CLIENT_ID}&client_slug=pulse-hub&redirect_uri=${encodeURIComponent(
      resolvedRedirect
    )}&response_type=code&state=sso_pulsehub`,
  });
});

app.post("/api/auth/callback", async (req: Request, res: Response) => {
  const { code, redirectUri } = req.body;
  if (!code) {
    return res.status(400).json({ error: "Parameter 'code' otorisasi wajib disertakan." });
  }

  const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host") || `localhost:${PORT}`;
  const fallbackRedirect = `${protocol}://${host}/auth/callback`;

  try {
    const result = await exchangeOAuthCode(code, redirectUri || AUTHHUB_REDIRECT_URI || fallbackRedirect);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message || "Gagal otorisasi dengan AuthHub." });
  }
});

app.get("/api/auth/me", (req: Request, res: Response) => {
  if (!req.user) {
    return res.json({ authenticated: false, user: null });
  }
  const isSuper = req.user.globalRole === "superadmin" || req.user.appRole === "superadmin";
  res.json({
    authenticated: true,
    user: req.user,
    isAdmin: isSuper || req.user.appRole === "admin" || req.user.appRole === "editor",
  });
});

// SPA catch-all
if (fs.existsSync(FRONTEND_DIST)) {
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 [PulseHub] Command Center running on http://localhost:${PORT}`);
  console.log(`🔐 [AuthHub] Protected with SSO (AuthHub URL: ${AUTHHUB_URL})`);
  // Start background health checker loop
  checker.start();
});
