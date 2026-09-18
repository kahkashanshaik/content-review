import type { LookupFn } from "../crawler/dns.ts";
import { authorizeUrl } from "../crawler/authorize.ts";
import { crawlerError, ssrfBlocked } from "../crawler/limits.ts";
import { ERROR_CODES, type Result } from "../../domain/errors.ts";

const IMAGE_DATA = /^data:image\//i;

export async function authorizeDiscoveryRequest(
  url: string,
  lookup: LookupFn,
): Promise<Result<void>> {
  if (url === "about:blank" || url.startsWith("about:blank#") || IMAGE_DATA.test(url)) {
    return { ok: true, value: undefined };
  }

  if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("file:")) {
    return ssrfBlocked("Discovery blocked a non-http resource URL.", { url: url.slice(0, 80) });
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return ssrfBlocked("Discovery blocked an unsupported URL scheme.", { url: url.slice(0, 80) });
  }

  const authorized = await authorizeUrl(url, lookup);
  if (!authorized.ok) {
    return authorized;
  }

  return { ok: true, value: undefined };
}

export function browserUnavailable(message: string): Result<never> {
  return crawlerError(ERROR_CODES.FETCH_FAILED, message, { reason: "browser-unavailable" });
}
