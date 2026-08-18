import { createHash, randomBytes } from "crypto";

export function generateOAuthState(): string {
  return randomBytes(24).toString("hex");
}

export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export function generateCodeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}
