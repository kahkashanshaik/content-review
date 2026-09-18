import http from "node:http";
import https from "node:https";

import { ERROR_CODES, type Result } from "../../domain/errors.ts";
import { crawlerError } from "./limits.ts";
import { effectivePort } from "./url.ts";

export type PinnedHttpRequest = {
  url: URL;
  pinnedAddress: string;
  family: 4 | 6;
  connectTimeoutMs: number;
  deadlineMs: number;
  maxResponseBytes: number;
};

export type PinnedHttpResponse = {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Uint8Array;
};

export type HttpGet = (request: PinnedHttpRequest) => Promise<Result<PinnedHttpResponse>>;

export const CRAWLER_USER_AGENT = "ContentReviewBot/0.1";

export function buildCrawlerHeaders(url: URL): Record<string, string> {
  return {
    Host: url.host,
    Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    "User-Agent": CRAWLER_USER_AGENT,
    Connection: "close",
  };
}

export function nodeHttpGet(request: PinnedHttpRequest): Promise<Result<PinnedHttpResponse>> {
  const remaining = request.deadlineMs - Date.now();
  if (remaining <= 0) {
    return Promise.resolve(
      crawlerError(ERROR_CODES.REQUEST_TIMEOUT, "The crawl request timed out."),
    );
  }

  const headers = buildCrawlerHeaders(request.url);
  const isHttps = request.url.protocol === "https:";
  const port = effectivePort(request.url);
  const path = `${request.url.pathname}${request.url.search}` || "/";
  const connectTimeout = Math.min(request.connectTimeoutMs, remaining);

  return new Promise((resolve) => {
    let settled = false;

    const finish = (result: Result<PinnedHttpResponse>) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };

    const timeout = setTimeout(() => {
      req.destroy();
      finish(crawlerError(ERROR_CODES.REQUEST_TIMEOUT, "The crawl request timed out."));
    }, remaining);

    const req = (isHttps ? https : http).request(
      {
        protocol: request.url.protocol,
        hostname: request.pinnedAddress,
        family: request.family,
        port,
        path,
        method: "GET",
        headers,
        timeout: connectTimeout,
        rejectUnauthorized: true,
        ...(isHttps ? { servername: request.url.hostname } : {}),
      },
      (response) => {
        const contentLength = parseContentLength(response.headers["content-length"]);
        if (contentLength !== undefined && contentLength > request.maxResponseBytes) {
          response.destroy();
          clearTimeout(timeout);
          finish(
            crawlerError(
              ERROR_CODES.RESPONSE_TOO_LARGE,
              "The response exceeded the maximum allowed size.",
            ),
          );
          return;
        }

        const chunks: Buffer[] = [];
        let size = 0;

        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > request.maxResponseBytes) {
            response.destroy();
            req.destroy();
            clearTimeout(timeout);
            finish(
              crawlerError(
                ERROR_CODES.RESPONSE_TOO_LARGE,
                "The response exceeded the maximum allowed size.",
              ),
            );
            return;
          }
          chunks.push(chunk);
        });

        response.on("end", () => {
          clearTimeout(timeout);
          finish({
            ok: true,
            value: {
              status: response.statusCode ?? 0,
              headers: response.headers,
              body: Buffer.concat(chunks),
            },
          });
        });

        response.on("error", () => {
          clearTimeout(timeout);
          finish(
            crawlerError(ERROR_CODES.FETCH_FAILED, "The remote server closed the connection."),
          );
        });
      },
    );

    req.on("timeout", () => {
      req.destroy();
      clearTimeout(timeout);
      finish(crawlerError(ERROR_CODES.REQUEST_TIMEOUT, "The crawl request timed out."));
    });

    req.on("error", () => {
      clearTimeout(timeout);
      finish(crawlerError(ERROR_CODES.FETCH_FAILED, "The remote server could not be reached."));
    });

    req.end();
  });
}

function parseContentLength(value: string | string[] | undefined): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}
