import { createError, ERROR_CODES, type Result } from "../../domain/errors.ts";
import type { StylesheetFetcher } from "../../application/ports/assets.ts";
import type {
  BuiltSnapshot,
  SnapshotBuilder,
  SnapshotBuildInput,
} from "../../application/ports/snapshot.ts";
import { parseCrawlUrl } from "../crawler/url.ts";
import {
  parseSnapshotDocument,
  serializeSnapshotDocument,
  type SnapshotDocument,
} from "./document.ts";
import { mapContentItems } from "./map-content.ts";
import { sanitizeSnapshotDocument } from "./sanitize-html.ts";
import { inlineStylesheets, sanitizeEmbeddedStyles } from "./stylesheets.ts";

export function createHtmlSnapshotBuilder(fetcher: StylesheetFetcher): SnapshotBuilder {
  return {
    build(input) {
      return buildSnapshot(input, fetcher);
    },
  };
}

export async function buildSnapshot(
  input: SnapshotBuildInput,
  fetcher: StylesheetFetcher,
): Promise<Result<BuiltSnapshot>> {
  const base = parseCrawlUrl(input.baseUrl);
  if (!base.ok) {
    return {
      ok: false,
      error: createError(ERROR_CODES.INVALID_URL, "A valid snapshot base URL is required.", {
        field: "baseUrl",
      }),
    };
  }

  const document = parseSnapshotDocument(input.html);
  applyDocumentMetadata(document, input);
  ensureViewport(document);
  sanitizeSnapshotDocument(document, base.value.href);
  await inlineStylesheets(document, base.value.href, fetcher);
  sanitizeEmbeddedStyles(document, base.value.href);

  const items = mapContentItems(document, input.items);

  return {
    ok: true,
    value: {
      sanitizedHtml: serializeSnapshotDocument(document),
      documentDirection: input.documentDirection,
      items,
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.documentLanguage === undefined ? {} : { documentLanguage: input.documentLanguage }),
    },
  };
}

function applyDocumentMetadata(document: SnapshotDocument, input: SnapshotBuildInput): void {
  const root = document.documentElement;
  if (root === null) {
    return;
  }

  if (root.getAttribute("dir") === null && input.documentDirection !== "auto") {
    root.setAttribute("dir", input.documentDirection);
  }

  if (root.getAttribute("lang") === null && input.documentLanguage !== undefined) {
    root.setAttribute("lang", input.documentLanguage);
  }
}

function ensureViewport(document: SnapshotDocument): void {
  if (document.querySelector('meta[name="viewport"]') !== null) {
    return;
  }

  const head = document.head ?? document.documentElement;
  if (head === null) {
    return;
  }

  const meta = document.createElement("meta");
  meta.setAttribute("name", "viewport");
  meta.setAttribute("content", "width=device-width, initial-scale=1");
  head.appendChild(meta);
}
