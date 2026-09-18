import { DEFAULT_CRAWLER_LIMITS, invalidUrl, ssrfBlocked, type CrawlerLimits } from "./limits.ts";
import { hostnameAsIp, inspectIp, isBlockedHostname } from "./ssrf.ts";
import type { Result } from "../../domain/errors.ts";

export function parseCrawlUrl(
  input: string,
  limits: CrawlerLimits = DEFAULT_CRAWLER_LIMITS,
): Result<URL> {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return invalidUrl("A non-empty URL is required.", { field: "url" });
  }

  if (trimmed.length > limits.maxUrlLength) {
    return invalidUrl("The URL exceeds the maximum allowed length.", {
      field: "url",
    });
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return invalidUrl("The URL could not be parsed.", { field: "url" });
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return invalidUrl("Only HTTP and HTTPS URLs are supported.", {
      scheme: url.protocol.replace(":", ""),
    });
  }

  if (url.username !== "" || url.password !== "") {
    return invalidUrl("URLs must not include credentials.", { field: "url" });
  }

  if (url.hostname === "") {
    return invalidUrl("The URL is missing a hostname.", { field: "url" });
  }

  const port = effectivePort(url);
  if (!limits.allowedPorts.includes(port)) {
    return ssrfBlocked("The URL uses a disallowed port.", {
      reason: "port",
      port: String(port),
    });
  }

  url.hash = "";
  return { ok: true, value: url };
}

export function inspectUrlTarget(url: URL): Result<URL> {
  if (isBlockedHostname(url.hostname)) {
    return ssrfBlocked("The hostname is not allowed.", {
      reason: "hostname",
      hostname: url.hostname,
    });
  }

  if (looksLikeEncodedIp(url.hostname) && hostnameAsIp(url.hostname) === undefined) {
    return ssrfBlocked("The URL uses a blocked IP encoding.", {
      reason: "reserved",
      hostname: url.hostname,
    });
  }

  const literalIp = hostnameAsIp(url.hostname);
  if (literalIp === undefined) {
    return { ok: true, value: url };
  }

  const inspection = inspectIp(literalIp);
  if (inspection.blocked) {
    return ssrfBlocked("The URL targets a blocked address.", {
      reason: inspection.reason,
      hostname: url.hostname,
    });
  }

  return { ok: true, value: url };
}

export function effectivePort(url: URL): number {
  if (url.port !== "") {
    return Number(url.port);
  }

  return url.protocol === "https:" ? 443 : 80;
}

function looksLikeEncodedIp(hostname: string): boolean {
  return /^\d+$/.test(hostname) || /^[\d.]+$/.test(hostname) || /^0x[0-9a-f]+$/i.test(hostname);
}
