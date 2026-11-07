export type MonitorStatus = "operational" | "degraded" | "down" | "maintenance";
export type MonitorType = "http" | "tcp" | "ssl";
export type IncidentSeverity = "minor" | "major" | "critical" | "maintenance";
export type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved";

export interface CheckRecord {
  timestamp: number;
  status: MonitorStatus;
  latencyMs: number;
  statusCode?: number;
  sslDaysRemaining?: number;
  error?: string;
}

export interface DayUptime {
  date: string; // YYYY-MM-DD
  uptimePercentage: number;
  status: MonitorStatus;
  checksCount: number;
  avgLatencyMs: number;
}

export interface Monitor {
  id: string;
  name: string;
  group: string;
  url: string;
  type: MonitorType;
  intervalSec: number;
  timeoutSec: number;
  expectedStatusCode: number;
  expectedKeyword?: string;
  degradedLatencyMs?: number;
  retryCount?: number;
  port?: number;
  customHeaders?: Record<string, string>;
  status: MonitorStatus;
  lastCheckedAt?: string;
  lastSslAlertAt?: string;
  latencyMs: number;
  uptime24h: number;
  uptime90d: number;
  sslDaysRemaining?: number;
  sslIssuer?: string;
  sslValid?: boolean;
  paused: boolean;
  alertChannels: ("whatsapp" | "telegram" | "discord" | "email")[];
  createdAt: string;
  updatedAt: string;
}

export interface IncidentUpdate {
  id: string;
  status: IncidentStatus;
  message: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  title: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  affectedMonitors: string[]; // monitor IDs
  updates: IncidentUpdate[];
  createdAt: string;
  resolvedAt?: string;
}

export interface PulseHubSettings {
  systemName: string;
  publicStatusPageTitle: string;
  autoIncidentOnDown: boolean;
  alertOnRecovery: boolean;
  checkIntervalSec: number;
  notifyBridgeUrl: string;
  notifyBridgeApiKey: string;
  telegramBotToken: string;
  telegramChatId: string;
  discordWebhookUrl: string;
}

export interface Subscriber {
  id: string;
  type: "webhook" | "email";
  target: string;
  name?: string;
  active: boolean;
  createdAt: string;
}

export interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  affectedMonitors: string[];
  startAt: string; // ISO
  endAt: string;   // ISO
  status: "scheduled" | "in_progress" | "completed";
  createdAt: string;
}

export interface PulseHubStore {
  monitors: Monitor[];
  checks: Record<string, CheckRecord[]>; // monitorId -> CheckRecord[]
  incidents: Incident[];
  settings: PulseHubSettings;
  subscribers?: Subscriber[];
  maintenances?: MaintenanceWindow[];
}
