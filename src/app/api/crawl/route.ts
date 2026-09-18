import { crawlAndDiscoverSnapshot } from "@/application/use-cases/crawl-and-discover";
import { crawlAndSnapshot } from "@/application/use-cases/crawl-and-snapshot";
import { createError, ERROR_CODES } from "@/domain/errors";
import { jsonError, jsonOk, requireUser } from "@/server/http/api";
import { createServerCrawler } from "@/server/crawler";
import { createPlaywrightDiscoverer } from "@/server/discovery";
import { createHtmlExtractor } from "@/server/extraction";
import { createHtmlSnapshotBuilder, createHttpStylesheetFetcher } from "@/server/snapshot";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const user = await requireUser();
  if (!user.ok) {
    return jsonError(user.error);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(
      createError(ERROR_CODES.VALIDATION_ERROR, "Request body must be JSON."),
    );
  }

  const url = readUrl(body);
  if (typeof url !== "string" || url.trim() === "") {
    return jsonError(
      createError(ERROR_CODES.VALIDATION_ERROR, "A page URL is required.", { field: "url" }),
    );
  }

  const extractor = createHtmlExtractor();
  const snapshotBuilder = createHtmlSnapshotBuilder(createHttpStylesheetFetcher());
  const discovered = await crawlAndDiscoverSnapshot(
    { source: "url", url },
    createPlaywrightDiscoverer(),
    extractor,
    snapshotBuilder,
  );

  if (discovered.ok) {
    return jsonOk(discovered.value);
  }

  if (!shouldFallbackToStaticCrawl(discovered.error.code)) {
    return jsonError(discovered.error);
  }

  const result = await crawlAndSnapshot(
    { url },
    createServerCrawler(),
    extractor,
    snapshotBuilder,
  );

  if (!result.ok) {
    return jsonError(result.error);
  }

  return jsonOk(result.value);
}

function shouldFallbackToStaticCrawl(code: string): boolean {
  return (
    code === ERROR_CODES.FETCH_FAILED ||
    code === ERROR_CODES.REQUEST_TIMEOUT ||
    code === ERROR_CODES.NOT_HTML
  );
}

function readUrl(body: unknown): unknown {
  if (typeof body !== "object" || body === null || !("url" in body)) {
    return undefined;
  }

  return body.url;
}

