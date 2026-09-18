import { inspectUrlTarget, parseCrawlUrl } from "../crawler/url.ts";
import { DEFAULT_CRAWLER_LIMITS } from "../crawler/limits.ts";

export type UrlUsage = "navigation" | "resource";

const SAFE_DATA_IMAGE = /^data:image\/(png|gif|jpe?g|webp|avif);/i;
const SAFE_NAVIGATION_SCHEMES = new Set(["http:", "https:", "mailto:", "tel:"]);

export function rewritePageUrl(
  raw: string,
  baseUrl: string,
  usage: UrlUsage,
): string | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return undefined;
  }

  if (usage === "navigation" && trimmed.startsWith("#")) {
    return trimmed;
  }

  if (usage === "resource" && isSafeRasterDataImage(trimmed)) {
    return trimmed;
  }

  let resolved: URL;
  try {
    resolved = new URL(trimmed, baseUrl);
  } catch {
    return undefined;
  }

  if (usage === "navigation" && (resolved.protocol === "mailto:" || resolved.protocol === "tel:")) {
    return resolved.href;
  }

  if (!SAFE_NAVIGATION_SCHEMES.has(resolved.protocol)) {
    return undefined;
  }

  if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
    return undefined;
  }

  const parsed = parseCrawlUrl(hrefWithoutHash(resolved), DEFAULT_CRAWLER_LIMITS);
  if (!parsed.ok) {
    return undefined;
  }

  const targeted = inspectUrlTarget(parsed.value);
  if (!targeted.ok) {
    return undefined;
  }

  if (usage === "navigation" && resolved.hash !== "") {
    return `${targeted.value.href}${resolved.hash}`;
  }

  return targeted.value.href;
}

export function rewriteSrcset(value: string, baseUrl: string): string | undefined {
  const rewritten: string[] = [];

  for (const candidate of value.split(",")) {
    const trimmed = candidate.trim();
    if (trimmed === "") {
      continue;
    }

    const separator = trimmed.search(/\s/);
    const urlPart = separator === -1 ? trimmed : trimmed.slice(0, separator);
    const descriptor = separator === -1 ? "" : trimmed.slice(separator);
    const next = rewritePageUrl(urlPart, baseUrl, "resource");
    if (next === undefined) {
      continue;
    }

    rewritten.push(`${next}${descriptor}`);
  }

  return rewritten.length === 0 ? undefined : rewritten.join(", ");
}

function isSafeRasterDataImage(value: string): boolean {
  return SAFE_DATA_IMAGE.test(value) && !/[\r\n<>]/.test(value);
}

function hrefWithoutHash(url: URL): string {
  const copy = new URL(url.href);
  copy.hash = "";
  return copy.href;
}
