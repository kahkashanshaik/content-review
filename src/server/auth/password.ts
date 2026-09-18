import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const separator = stored.indexOf(":");
  if (separator <= 0) {
    return false;
  }

  const salt = stored.slice(0, separator);
  const hash = stored.slice(separator + 1);
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  const actual = Buffer.from(hash, "hex");
  if (actual.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(actual, derived);
}

export function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
