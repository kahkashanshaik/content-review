import { createError, ERROR_CODES, type AppError, type Result } from "../../domain/errors.ts";
import { assertSameProjectHost, parseWebsiteUrl } from "../../domain/origin.ts";
import { persistCrawledPage, type PersistCrawledPageInput, type PersistedCrawledPage } from "../../application/use-cases/persist-crawled-page.ts";
import { crawlAndDiscoverSnapshot } from "../../application/use-cases/crawl-and-discover.ts";
import { crawlAndSnapshot } from "../../application/use-cases/crawl-and-snapshot.ts";
import { createServerCrawler } from "../crawler/index.ts";
import { createPlaywrightDiscoverer } from "../discovery/index.ts";
import { createHtmlExtractor } from "../extraction/index.ts";
import { createHtmlSnapshotBuilder, createHttpStylesheetFetcher } from "../snapshot/index.ts";
import type { Repositories } from "../../application/ports/repositories.ts";
import type { Project } from "../../domain/types.ts";

export async function crawlAndPersistPage(
  project: Project,
  url: string,
  repos: Repositories,
): Promise<Result<PersistedCrawledPage>> {
  const parsed = parseWebsiteUrl(url);
  if (!parsed.ok) {
    return parsed;
  }

  const host = assertSameProjectHost(parsed.value, project.allowedHost);
  if (!host.ok) {
    return host;
  }

  const extractor = createHtmlExtractor();
  const snapshotBuilder = createHtmlSnapshotBuilder(createHttpStylesheetFetcher());
  const discovered = await crawlAndDiscoverSnapshot(
    { source: "url", url: host.value.href },
    createPlaywrightDiscoverer(),
    extractor,
    snapshotBuilder,
  );

  const snapshot = discovered.ok
    ? discovered
    : shouldFallbackToStaticCrawl(discovered.error)
      ? await crawlAndSnapshot({ url: host.value.href }, createServerCrawler(), extractor, snapshotBuilder)
      : discovered;

  if (!snapshot.ok) {
    return snapshot;
  }

  const finalUrl = parseWebsiteUrl(snapshot.value.finalUrl);
  if (!finalUrl.ok) {
    return finalUrl;
  }

  const finalHost = assertSameProjectHost(finalUrl.value, project.allowedHost);
  if (!finalHost.ok) {
    return {
      ok: false,
      error: createError(
        ERROR_CODES.DOMAIN_MISMATCH,
        "The crawled page redirected to a different website domain.",
        { hostname: finalUrl.value.hostname, allowedHost: project.allowedHost },
      ),
    };
  }

  const input: PersistCrawledPageInput = {
    projectId: project.id,
    sourceUrl: snapshot.value.finalUrl,
    sanitizedHtml: snapshot.value.sanitizedHtml,
    items: snapshot.value.items,
    ...("title" in snapshot.value && snapshot.value.title !== undefined
      ? { title: snapshot.value.title }
      : {}),
    ...("states" in snapshot.value && snapshot.value.states !== undefined
      ? {
          states: snapshot.value.states.map((state) => ({
            type: state.type,
            key: state.key,
            sanitizedHtml: state.sanitizedHtml,
            items: state.items,
            ...(state.label === undefined ? {} : { label: state.label }),
          })),
        }
      : {}),
    ...("unsupported" in snapshot.value && snapshot.value.unsupported !== undefined
      ? { unsupported: snapshot.value.unsupported.map((entry) => entry.message) }
      : {}),
  };

  return persistCrawledPage(input, repos);
}

function shouldFallbackToStaticCrawl(error: AppError): boolean {
  return (
    error.code === ERROR_CODES.FETCH_FAILED ||
    error.code === ERROR_CODES.REQUEST_TIMEOUT ||
    error.code === ERROR_CODES.NOT_HTML
  );
}
