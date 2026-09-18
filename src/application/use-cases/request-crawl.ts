import type { Crawler, CrawlSuccess } from "../ports/crawler.ts";
import { createError, ERROR_CODES, type Result } from "../../domain/errors.ts";

export type RequestCrawlInput = {
  url: unknown;
};

export async function requestCrawl(
  input: RequestCrawlInput,
  crawler: Crawler,
): Promise<Result<CrawlSuccess>> {
  if (typeof input.url !== "string" || input.url.trim().length === 0) {
    return {
      ok: false,
      error: createError(ERROR_CODES.INVALID_URL, "A non-empty URL is required.", {
        field: "url",
      }),
    };
  }

  return crawler.crawl({ url: input.url.trim() });
}
