import type { Request, Response, NextFunction } from "express";
import {
  AUTHHUB_URL,
  AUTHHUB_CLIENT_ID,
  AUTHHUB_CLIENT_SECRET,
  AUTHHUB_REDIRECT_URI,
} from "./config.js";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  name: string;
  appRole: "superadmin" | "admin" | "editor" | "viewer";
  permissions: string[];
  globalRole: string;
  sessionId?: string;
}

const tokenCache = new Map<string, { user: AuthUser; expiresAt: number }>();

export async function exchangeOAuthCode(code: string, redirectUri?: string): Promise<{ token: string; user: AuthUser }> {
  const endpoint = `${AUTHHUB_URL}/api/v1/auth/token`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      clientId: AUTHHUB_CLIENT_ID,
      clientSecret: AUTHHUB_CLIENT_SECRET,
      grantType: "authorization_code",
      redirectUri: redirectUri || AUTHHUB_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    const errorBody: any = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Gagal menukar kode otorisasi AuthHub (HTTP ${res.status})`);
  }

  const data: any = await res.json();
  const user: AuthUser = {
    id: data.user.id,
    email: data.user.email,
    username: data.user.username || data.user.email.split("@")[0],
    name: data.user.name,
    appRole: (data.user.appRole as any) || (data.user.globalRole === "superadmin" ? "superadmin" : "viewer"),
    permissions: data.user.permissions || [],
    globalRole: data.user.globalRole || "member",
    sessionId: data.sessionId,
  };

  tokenCache.set(data.accessToken, {
    user,
    expiresAt: Date.now() + 60_000,
  });

  return { token: data.accessToken, user };
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  if (!token) return null;

  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  try {
    const res = await fetch(`${AUTHHUB_URL}/api/v1/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        clientSlug: "pulse-hub",
      }),
    });

    if (!res.ok) {
      tokenCache.delete(token);
      return null;
    }

    const data: any = await res.json();
    if (!data.valid || !data.user) {
      tokenCache.delete(token);
      return null;
    }

    const user: AuthUser = {
      id: data.user.id || data.user.sub,
      email: data.user.email,
      username: data.user.username || data.user.email?.split("@")[0] || "user",
      name: data.user.name || "Member",
      appRole: (data.user.appRole as any) || (data.user.globalRole === "superadmin" ? "superadmin" : "viewer"),
      permissions: data.user.permissions || [],
      globalRole: data.user.globalRole || "member",
      sessionId: data.user.sid,
    };

    tokenCache.set(token, {
      user,
      expiresAt: Date.now() + 60_000,
    });

    return user;
  } catch (err) {
    console.warn("AuthHub verification error:", err);
    return null;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser | null;
    }
  }
}

export async function authenticateToken(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  if (token) {
    req.user = await verifyToken(token);
  } else {
    req.user = null;
  }

  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: "Autentikasi Diperlukan: Silakan login via AuthHub SSO dengan akun Admin.",
    });
  }

  const isSuper = req.user.globalRole === "superadmin" || req.user.appRole === "superadmin";
  const isAdmin = isSuper || req.user.appRole === "admin" || req.user.appRole === "editor";

  if (!isAdmin) {
    return res.status(403).json({
      error: "Akses Ditolak: Diperlukan hak akses Administrator pada PulseHub.",
    });
  }

  next();
}
