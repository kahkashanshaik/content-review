import type { StylesheetFetcher } from "../../application/ports/assets.ts";
import { createError, ERROR_CODES } from "../../domain/errors.ts";
import { decodeHtmlBody, isCssContentType } from "../crawler/content-type.ts";
import type { LookupFn } from "../crawler/dns.ts";
import { nodeLookup } from "../crawler/dns.ts";
import { fetchAuthorizedResource } from "../crawler/fetch-resource.ts";
import type { HttpGet } from "../crawler/http-get.ts";
import { nodeHttpGet } from "../crawler/http-get.ts";
import { DEFAULT_CRAWLER_LIMITS, type CrawlerLimits } from "../crawler/limits.ts";
import { sanitizeCss } from "./css.ts";
import { detach, type SnapshotDocument, type SnapshotElement } from "./document.ts";
import { isStylesheetLink } from "./sanitize-html.ts";
import { rewritePageUrl } from "./urls.ts";

export const MAX_INLINE_STYLESHEETS = 40;
export const MAX_INLINED_CSS_BYTES = 1_500_000;

export function createNoopStylesheetFetcher(): StylesheetFetcher {
  return {
    async fetchStylesheet() {
      return {
        ok: false,
        error: createError(ERROR_CODES.FETCH_FAILED, "Stylesheet fetching is disabled."),
      };
    },
  };
}

export function createHttpStylesheetFetcher(options?: {
  lookup?: LookupFn;
  httpGet?: HttpGet;
  limits?: CrawlerLimits;
}): StylesheetFetcher {
  const lookup = options?.lookup ?? nodeLookup;
  const httpGet = options?.httpGet ?? nodeHttpGet;
  const limits = options?.limits ?? {
    ...DEFAULT_CRAWLER_LIMITS,
    maxResponseBytes: 512 * 1024,
    totalTimeoutMs: 10_000,
  };

  return {
    async fetchStylesheet(url) {
      const fetched = await fetchAuthorizedResource({
        url,
        lookup,
        httpGet,
        limits,
        accept: isCssContentType,
      });

      if (!fetched.ok) {
        return fetched;
      }

      return {
        ok: true,
        value: {
          finalUrl: fetched.value.finalUrl,
          css: decodeHtmlBody(fetched.value.body),
        },
      };
    },
  };
}

export async function inlineStylesheets(
  document: SnapshotDocument,
  baseUrl: string,
  fetcher: StylesheetFetcher,
): Promise<void> {
  const root = document.documentElement;
  if (root === null) {
    return;
  }

  const links = collectStylesheetLinks(root);
  const fetchedSheets: FetchedStylesheet[] = [];

  for (const link of links) {
    const href = rewritePageUrl(link.getAttribute("href") ?? "", baseUrl, "resource");
    if (href === undefined) {
      detach(link);
      continue;
    }

    const fetched = await fetcher.fetchStylesheet(href);
    if (!fetched.ok) {
      detach(link);
      continue;
    }

    fetchedSheets.push({
      link,
      css: sanitizeCss(fetched.value.css, fetched.value.finalUrl),
      media: link.getAttribute("media")?.trim() ?? "",
      optional: isOptionalStylesheet(href),
    });
  }

  const kept = selectStylesheetsToInline(fetchedSheets);

  for (const sheet of fetchedSheets) {
    if (!kept.has(sheet)) {
      detach(sheet.link);
      continue;
    }

    const style = document.createElement("style");
    style.setAttribute("data-snapshot-asset", "stylesheet");
    if (sheet.media !== "" && sheet.media.toLowerCase() !== "all") {
      style.setAttribute("media", sheet.media);
    }
    style.textContent = sheet.css;
    sheet.link.parentNode?.removeChild(sheet.link);
    (document.head ?? root).appendChild(style);
  }
}

type FetchedStylesheet = {
  link: SnapshotElement;
  css: string;
  media: string;
  optional: boolean;
};

function selectStylesheetsToInline(sheets: FetchedStylesheet[]): Set<FetchedStylesheet> {
  const kept = new Set<FetchedStylesheet>();
  let cssBytes = 0;

  const tryKeep = (sheet: FetchedStylesheet): boolean => {
    if (kept.size >= MAX_INLINE_STYLESHEETS || cssBytes + sheet.css.length > MAX_INLINED_CSS_BYTES) {
      return false;
    }

    kept.add(sheet);
    cssBytes += sheet.css.length;
    return true;
  };

  for (const sheet of sheets) {
    if (!sheet.optional) {
      tryKeep(sheet);
    }
  }

  for (const sheet of sheets) {
    if (sheet.optional) {
      tryKeep(sheet);
    }
  }

  return kept;
}

function isOptionalStylesheet(href: string): boolean {
  return /\/animations\/|\/swiper|e-swiper|slidein/i.test(href);
}

export function sanitizeEmbeddedStyles(document: SnapshotDocument, baseUrl: string): void {
  const root = document.documentElement;
  if (root === null) {
    return;
  }

  const styles: SnapshotElement[] = [];
  collectByTag(root, "style", styles);

  for (const style of styles) {
    style.textContent = sanitizeCss(style.textContent ?? "", baseUrl);
  }
}

function collectStylesheetLinks(root: SnapshotElement): SnapshotElement[] {
  const links: SnapshotElement[] = [];
  collectByPredicate(root, isStylesheetLink, links);
  return links;
}

function collectByTag(root: SnapshotElement, tag: string, into: SnapshotElement[]): void {
  collectByPredicate(root, (element) => element.tagName.toLowerCase() === tag, into);
}

function collectByPredicate(
  root: SnapshotElement,
  predicate: (element: SnapshotElement) => boolean,
  into: SnapshotElement[],
): void {
  if (predicate(root)) {
    into.push(root);
  }

  for (let i = 0; i < root.children.length; i += 1) {
    const child = root.children[i];
    if (child !== undefined) {
      collectByPredicate(child as SnapshotElement, predicate, into);
    }
  }
}
