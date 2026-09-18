import { ERROR_CODES, type Result } from "../../domain/errors.ts";
import { authorizeUrl } from "./authorize.ts";
import { isRedirectStatus } from "./content-type.ts";
import type { LookupFn } from "./dns.ts";
import { headerValue } from "./headers.ts";
import type { HttpGet } from "./http-get.ts";
import { crawlerError, DEFAULT_CRAWLER_LIMITS, type CrawlerLimits } from "./limits.ts";

export type AuthorizedResource = {
  finalUrl: string;
  status: number;
  contentType: string;
  body: Uint8Array;
};

export type FetchAuthorizedResourceRequest = {
  url: string;
  lookup: LookupFn;
  httpGet: HttpGet;
  accept: (contentType: string | undefined) => boolean;
  limits?: CrawlerLimits;
  now?: () => number;
};

export async function fetchAuthorizedResource(
  request: FetchAuthorizedResourceRequest,
): Promise<Result<AuthorizedResource>> {
  const limits = request.limits ?? DEFAULT_CRAWLER_LIMITS;
  const now = request.now ?? Date.now;
  const started = now();
  let currentUrl = request.url;

  for (let hop = 0; hop <= limits.maxRedirects; hop += 1) {
    if (now() - started > limits.totalTimeoutMs) {
      return crawlerError(ERROR_CODES.REQUEST_TIMEOUT, "The crawl request timed out.");
    }

    const authorized = await authorizeUrl(currentUrl, request.lookup, limits);
    if (!authorized.ok) {
      return authorized;
    }

    const remaining = limits.totalTimeoutMs - (now() - started);
    const response = await request.httpGet({
      url: authorized.value.url,
      pinnedAddress: authorized.value.pinnedAddress,
      family: authorized.value.family,
      connectTimeoutMs: limits.connectTimeoutMs,
      deadlineMs: now() + remaining,
      maxResponseBytes: limits.maxResponseBytes,
    });

    if (!response.ok) {
      return response;
    }

    if (isRedirectStatus(response.value.status)) {
      if (hop === limits.maxRedirects) {
        return crawlerError(
          ERROR_CODES.TOO_MANY_REDIRECTS,
          "The page issued too many redirects.",
        );
      }

      const location = headerValue(response.value.headers.location);
      if (location === undefined || location.trim() === "") {
        return crawlerError(
          ERROR_CODES.INVALID_URL,
          "A redirect was missing a Location header.",
        );
      }

      try {
        currentUrl = new URL(location, authorized.value.url).href;
      } catch {
        return crawlerError(
          ERROR_CODES.INVALID_URL,
          "A redirect Location header was not a valid URL.",
        );
      }

      continue;
    }

    if (response.value.status < 200 || response.value.status >= 300) {
      return crawlerError(
        ERROR_CODES.FETCH_FAILED,
        "The remote server returned an error status.",
        { status: String(response.value.status) },
      );
    }

    const contentType = headerValue(response.value.headers["content-type"]);
    if (!request.accept(contentType)) {
      return crawlerError(
        ERROR_CODES.VALIDATION_ERROR,
        "The response was not an accepted resource type.",
        contentType === undefined ? undefined : { contentType },
      );
    }

    return {
      ok: true,
      value: {
        finalUrl: authorized.value.url.href,
        status: response.value.status,
        contentType: contentType ?? "",
        body: response.value.body,
      },
    };
  }

  return crawlerError(ERROR_CODES.TOO_MANY_REDIRECTS, "The page issued too many redirects.");
}
