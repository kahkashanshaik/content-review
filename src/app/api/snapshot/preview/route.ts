import { crawlAndSnapshot } from "@/application/use-cases/crawl-and-snapshot";
import { createError, ERROR_CODES } from "@/domain/errors";
import { jsonError, jsonOk, requireUser } from "@/server/http/api";
import { createHtmlExtractor } from "@/server/extraction";
import {
  createHtmlSnapshotBuilder,
  createNoopStylesheetFetcher,
  PREVIEW_FIXTURE_BASE_URL,
  PREVIEW_FIXTURE_HTML,
} from "@/server/snapshot";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const user = await requireUser();
  if (!user.ok) {
    return jsonError(user.error);
  }

  const result = await crawlAndSnapshot(
    { url: PREVIEW_FIXTURE_BASE_URL },
    {
      async crawl() {
        return {
          ok: true,
          value: {
            finalUrl: PREVIEW_FIXTURE_BASE_URL,
            status: 200,
            contentType: "text/html",
            body: PREVIEW_FIXTURE_HTML,
            byteLength: PREVIEW_FIXTURE_HTML.length,
          },
        };
      },
    },
    createHtmlExtractor(),
    createHtmlSnapshotBuilder(createNoopStylesheetFetcher()),
  );

  if (!result.ok) {
    return jsonError(result.error);
  }

  return jsonOk(result.value);
}

export function POST(): Response {
  return jsonError(
    createError(ERROR_CODES.VALIDATION_ERROR, "Use GET to load the snapshot fixture."),
  );
}
