import { ERROR_CODES, type Result } from "../../domain/errors.ts";
import type { Crawler, CrawlRequest, FetchedPage } from "../../application/ports/crawler.ts";
import { authorizeUrl } from "./authorize.ts";
import { isHtmlContentType, isRedirectStatus, decodeHtmlBody } from "./content-type.ts";
import type { LookupFn } from "./dns.ts";
import { nodeLookup } from "./dns.ts";
import { nodeHttpGet, type HttpGet } from "./http-get.ts";
import { headerValue } from "./headers.ts";
import { crawlerError, DEFAULT_CRAWLER_LIMITS, type CrawlerLimits } from "./limits.ts";

export type HttpCrawlerDependencies = {
  lookup: LookupFn;
  httpGet: HttpGet;
  limits?: CrawlerLimits;
  now?: () => number;
};

export function createHttpCrawler(dependencies: HttpCrawlerDependencies): Crawler {
  const limits = dependencies.limits ?? DEFAULT_CRAWLER_LIMITS;
  const now = dependencies.now ?? Date.now;

  return {
    async crawl(request: CrawlRequest): Promise<Result<FetchedPage>> {
      const started = now();
      let currentUrl = request.url;

      for (let hop = 0; hop <= limits.maxRedirects; hop += 1) {
        if (now() - started > limits.totalTimeoutMs) {
          return crawlerError(ERROR_CODES.REQUEST_TIMEOUT, "The crawl request timed out.");
        }

        const authorized = await authorizeUrl(currentUrl, dependencies.lookup, limits);
        if (!authorized.ok) {
          return authorized;
        }

        const remaining = limits.totalTimeoutMs - (now() - started);
        const response = await dependencies.httpGet({
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
        if (contentType === undefined || !isHtmlContentType(contentType)) {
          return crawlerError(
            ERROR_CODES.NOT_HTML,
            "The response was not HTML.",
            contentType === undefined ? undefined : { contentType },
          );
        }

        return {
          ok: true,
          value: {
            finalUrl: authorized.value.url.href,
            status: response.value.status,
            contentType,
            body: decodeHtmlBody(response.value.body),
            byteLength: response.value.body.byteLength,
          },
        };
      }

      return crawlerError(
        ERROR_CODES.TOO_MANY_REDIRECTS,
        "The page issued too many redirects.",
      );
    },
  };
}

export function createServerCrawler(
  limits: CrawlerLimits = DEFAULT_CRAWLER_LIMITS,
): Crawler {
  return createHttpCrawler({
    lookup: nodeLookup,
    httpGet: nodeHttpGet,
    limits,
  });
}
