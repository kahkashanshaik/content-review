import type { AppError, Result } from "../../domain/errors.ts";
import { createError, ERROR_CODES } from "../../domain/errors.ts";

export type CrawlerLimits = {
  maxRedirects: number;
  connectTimeoutMs: number;
  totalTimeoutMs: number;
  maxResponseBytes: number;
  maxUrlLength: number;
  allowedPorts: readonly number[];
};

export const DEFAULT_CRAWLER_LIMITS: CrawlerLimits = {
  maxRedirects: 5,
  connectTimeoutMs: 10_000,
  totalTimeoutMs: 20_000,
  maxResponseBytes: 2 * 1024 * 1024,
  maxUrlLength: 2048,
  allowedPorts: [80, 443],
};

export function crawlerError(
  code: AppError["code"],
  message: string,
  details?: Readonly<Record<string, string>>,
): Result<never> {
  return {
    ok: false,
    error: createError(code, message, details),
  };
}

export function invalidUrl(
  message: string,
  details?: Readonly<Record<string, string>>,
): Result<never> {
  return crawlerError(ERROR_CODES.INVALID_URL, message, details);
}

export function ssrfBlocked(
  message: string,
  details?: Readonly<Record<string, string>>,
): Result<never> {
  return crawlerError(ERROR_CODES.SSRF_BLOCKED, message, details);
}
