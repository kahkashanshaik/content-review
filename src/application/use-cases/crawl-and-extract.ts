import type { Crawler } from "../ports/crawler.ts";
import type { ContentExtractor, ExtractedPageContent } from "../ports/extractor.ts";
import type { Result } from "../../domain/errors.ts";
import { requestCrawl, type RequestCrawlInput } from "./request-crawl.ts";

export type CrawlExtraction = {
  finalUrl: string;
  status: number;
  contentType: string;
  byteLength: number;
} & ExtractedPageContent;

export async function crawlAndExtract(
  input: RequestCrawlInput,
  crawler: Crawler,
  extractor: ContentExtractor,
): Promise<Result<CrawlExtraction>> {
  const crawled = await requestCrawl(input, crawler);
  if (!crawled.ok) {
    return crawled;
  }

  const extracted = extractor.extract(crawled.value.body);
  if (!extracted.ok) {
    return extracted;
  }

  return {
    ok: true,
    value: {
      finalUrl: crawled.value.finalUrl,
      status: crawled.value.status,
      contentType: crawled.value.contentType,
      byteLength: crawled.value.byteLength,
      ...extracted.value,
    },
  };
}
