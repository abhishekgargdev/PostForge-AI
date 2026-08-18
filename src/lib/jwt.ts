import jwt, { type SignOptions } from "jsonwebtoken";

import { getEnv } from "@/lib/env";

export interface TokenPayload {
  userId: string;
}

function base64UrlToUint8Array(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

const EXPIRES_IN_MULTIPLIERS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

export function parseExpiresIn(value: string): number {
  const trimmed = value.trim();

  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  const match = trimmed.match(/^(\d+)([smhd])$/i);
  if (!match) {
    throw new Error(`Invalid JWT_EXPIRES_IN value: ${value}`);
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  return amount * EXPIRES_IN_MULTIPLIERS[unit];
}

export function signToken(userId: string): string {
  const { JWT_SECRET, JWT_EXPIRES_IN } = getEnv();

  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const { JWT_SECRET } = getEnv();
    const payload = jwt.verify(token, JWT_SECRET);

    if (typeof payload !== "object" || payload === null) {
      return null;
    }

    const userId = (payload as jwt.JwtPayload).userId;
    if (typeof userId !== "string") {
      return null;
    }

    return { userId };
  } catch {
    return null;
  }
}

export async function verifyTokenEdge(
  token: string,
  secret: string,
): Promise<TokenPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signature = Uint8Array.from(base64UrlToUint8Array(signatureB64));
    const valid = await crypto.subtle.verify("HMAC", key, signature, signedData);

    if (!valid) {
      return null;
    }

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToUint8Array(payloadB64)),
    ) as { userId?: unknown; exp?: unknown };

    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
      return null;
    }

    if (typeof payload.userId !== "string") {
      return null;
    }

    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export function getAuthCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}
