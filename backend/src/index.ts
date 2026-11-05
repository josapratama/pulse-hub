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
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/monitors/:id/history", (req: Request, res: Response) => {
  const id = String(req.params.id);
  const history = db.get90DayHistory(id);
  res.json({ history });
});

// Manual check trigger
app.post("/api/monitors/:id/check", requireAdmin, async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const mon = db.getMonitorById(id);
  if (!mon) return res.status(404).json({ error: "Monitor not found" });

  const result = await checker.checkSingleMonitor(mon);
  res.json({ success: true, result });
});

// ─── Monitors Management (Admin) ─────────────────────────────
app.get("/api/monitors", (req: Request, res: Response) => {
  res.json({ monitors: db.getMonitors() });
});

app.post("/api/monitors", requireAdmin, (req: Request, res: Response) => {
  const { name, url, group, intervalSec, timeoutSec, alertChannels, paused } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: "Name and URL are required" });
  }

  const saved = db.saveMonitor(req.body);
  // Trigger initial check immediately in background
  checker.checkSingleMonitor(saved);
  res.status(201).json({ success: true, monitor: saved });
});

app.delete("/api/monitors/:id", requireAdmin, (req: Request, res: Response) => {
  const deleted = db.deleteMonitor(String(req.params.id));
  if (!deleted) return res.status(404).json({ error: "Monitor not found" });
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
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.get("host") || `localhost:${PORT}`;
  const dynamicRedirect = `${protocol}://${host}/auth/callback`;

  res.json({
    authHubUrl: AUTHHUB_URL,
    clientId: AUTHHUB_CLIENT_ID,
    clientSlug: "pulse-hub",
    redirectUri: AUTHHUB_REDIRECT_URI || dynamicRedirect,
    ssoLoginUrl: `${AUTHHUB_URL}/oauth/authorize?client_id=${AUTHHUB_CLIENT_ID}&client_slug=pulse-hub&redirect_uri=${encodeURIComponent(
      AUTHHUB_REDIRECT_URI || dynamicRedirect
    )}&response_type=code&state=sso_pulsehub`,
  });
});

app.post("/api/auth/callback", async (req: Request, res: Response) => {
  const { code, redirectUri } = req.body;
  if (!code) {
    return res.status(400).json({ error: "Parameter 'code' otorisasi wajib disertakan." });
  }

  try {
    const result = await exchangeOAuthCode(code, redirectUri);
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
