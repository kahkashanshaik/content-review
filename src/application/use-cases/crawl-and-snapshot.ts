import type { Crawler } from "../ports/crawler.ts";
import type { ContentExtractor } from "../ports/extractor.ts";
import type { BuiltSnapshot, SnapshotBuilder } from "../ports/snapshot.ts";
import type { Result } from "../../domain/errors.ts";
import { requestCrawl, type RequestCrawlInput } from "./request-crawl.ts";

export type CrawlSnapshot = {
  finalUrl: string;
  status: number;
  contentType: string;
  byteLength: number;
} & BuiltSnapshot;

export async function crawlAndSnapshot(
  input: RequestCrawlInput,
  crawler: Crawler,
  extractor: ContentExtractor,
  snapshotBuilder: SnapshotBuilder,
): Promise<Result<CrawlSnapshot>> {
  const crawled = await requestCrawl(input, crawler);
  if (!crawled.ok) {
    return crawled;
  }

  const extracted = extractor.extract(crawled.value.body);
  if (!extracted.ok) {
    return extracted;
  }

  const snapshot = await snapshotBuilder.build({
    html: crawled.value.body,
    baseUrl: crawled.value.finalUrl,
    items: extracted.value.items,
    documentDirection: extracted.value.documentDirection,
    ...(extracted.value.documentLanguage === undefined
      ? {}
      : { documentLanguage: extracted.value.documentLanguage }),
    ...(extracted.value.title === undefined ? {} : { title: extracted.value.title }),
  });

  if (!snapshot.ok) {
    return snapshot;
  }

  return {
    ok: true,
    value: {
      finalUrl: crawled.value.finalUrl,
      status: crawled.value.status,
      contentType: crawled.value.contentType,
      byteLength: crawled.value.byteLength,
      ...snapshot.value,
    },
  };
}
