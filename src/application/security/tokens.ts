import { createHash, randomBytes } from "node:crypto";

export function createSecretToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashSecretToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
