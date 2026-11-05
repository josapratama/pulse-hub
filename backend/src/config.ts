import dotenv from "dotenv";

dotenv.config();

export const PORT = Number(process.env.PORT) || 3000;

// AuthHub SSO Integration
export const AUTHHUB_URL = (process.env.AUTHHUB_URL || "https://auth.josapratama.com").replace(/\/$/, "");
export const AUTHHUB_CLIENT_ID = process.env.AUTHHUB_CLIENT_ID || "ah_client_pulsehub_8a9b0c";
export const AUTHHUB_CLIENT_SECRET = process.env.AUTHHUB_CLIENT_SECRET || "ah_secret_pulsehub_1c2d3e4f5a6b7c8d9e0f";
export const AUTHHUB_REDIRECT_URI = process.env.AUTHHUB_REDIRECT_URI || "http://localhost:3000/auth/callback";

// Alert Channels (NotifyBridge, WABridge, Telegram, Discord)
export const NOTIFY_BRIDGE_URL = (process.env.NOTIFY_BRIDGE_URL || "http://localhost:4200").replace(/\/$/, "");
export const NOTIFY_BRIDGE_API_KEY = process.env.NOTIFY_BRIDGE_API_KEY || "";

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
export const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

export const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";

// Default Polling Frequency in Seconds
export const DEFAULT_CHECK_INTERVAL = Number(process.env.CHECK_INTERVAL) || 60;
