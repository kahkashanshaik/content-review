import { crawlAndDiscoverSnapshot } from "@/application/use-cases/crawl-and-discover";
import { crawlAndSnapshot } from "@/application/use-cases/crawl-and-snapshot";
import { createError, ERROR_CODES } from "@/domain/errors";
import { jsonError, jsonOk, requireUser } from "@/server/http/api";
import { createPlaywrightDiscoverer, DYNAMIC_FIXTURE_BASE_URL, DYNAMIC_FIXTURE_HTML } from "@/server/discovery";
import { createHtmlExtractor } from "@/server/extraction";
import { createHtmlSnapshotBuilder, createNoopStylesheetFetcher } from "@/server/snapshot";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const user = await requireUser();
  if (!user.ok) {
    return jsonError(user.error);
  }

  const extractor = createHtmlExtractor();
  const snapshotBuilder = createHtmlSnapshotBuilder(createNoopStylesheetFetcher());
  const discovered = await crawlAndDiscoverSnapshot(
    {
      source: "html",
      html: DYNAMIC_FIXTURE_HTML,
      baseUrl: DYNAMIC_FIXTURE_BASE_URL,
    },
    createPlaywrightDiscoverer(),
    extractor,
    snapshotBuilder,
  );

  if (discovered.ok) {
    return jsonOk(discovered.value);
  }

  const fallback = await crawlAndSnapshot(
    { url: DYNAMIC_FIXTURE_BASE_URL },
    {
      async crawl() {
        return {
          ok: true,
          value: {
            finalUrl: DYNAMIC_FIXTURE_BASE_URL,
            status: 200,
            contentType: "text/html",
            body: DYNAMIC_FIXTURE_HTML,
            byteLength: Buffer.byteLength(DYNAMIC_FIXTURE_HTML),
          },
        };
      },
    },
    extractor,
    snapshotBuilder,
  );

  if (!fallback.ok) {
    return jsonError(discovered.error);
  }

  return jsonOk(fallback.value);
}

export function POST(): Response {
  return jsonError(
    createError(ERROR_CODES.VALIDATION_ERROR, "Use GET to load the dynamic fixture."),
  );
}
