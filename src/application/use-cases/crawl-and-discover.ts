import type { ContentExtractor } from "../ports/extractor.ts";
import type { SnapshotBuilder, MappedContentItem } from "../ports/snapshot.ts";
import type {
  DynamicDiscoverer,
  DynamicDiscoveryRequest,
  UnsupportedDynamicSignal,
} from "../ports/discovery.ts";
import { createError, ERROR_CODES, type Result } from "../../domain/errors.ts";
import type { PageStateType, TextDirection } from "../../domain/types.ts";
import { stateContentFingerprint } from "./state-fingerprint.ts";

export type DiscoveredSnapshotState = {
  type: PageStateType;
  key: string;
  label?: string;
  sanitizedHtml: string;
  items: MappedContentItem[];
};

export type CrawlDiscoverySnapshot = {
  finalUrl: string;
  sanitizedHtml: string;
  documentDirection: TextDirection;
  documentLanguage?: string;
  title?: string;
  items: MappedContentItem[];
  states: DiscoveredSnapshotState[];
  unsupported: UnsupportedDynamicSignal[];
};

export async function crawlAndDiscoverSnapshot(
  request: DynamicDiscoveryRequest,
  discoverer: DynamicDiscoverer,
  extractor: ContentExtractor,
  snapshotBuilder: SnapshotBuilder,
): Promise<Result<CrawlDiscoverySnapshot>> {
  const discovered = await discoverer.discover(request);
  if (!discovered.ok) {
    return discovered;
  }

  const baseUrl = discovered.value.finalUrl;
  const states: DiscoveredSnapshotState[] = [];
  const seen = new Set<string>();
  let documentDirection: TextDirection = "ltr";
  let documentLanguage: string | undefined;
  let title: string | undefined;

  for (const capture of discovered.value.captures) {
    const extracted = extractor.extract(capture.html, { idNamespace: capture.key });
    if (!extracted.ok) {
      return extracted;
    }

    const fingerprint = stateContentFingerprint(extracted.value.items);
    if (seen.has(fingerprint)) {
      continue;
    }
    seen.add(fingerprint);

    const snapshot = await snapshotBuilder.build({
      html: capture.html,
      baseUrl,
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

    if (capture.key === "default" || states.length === 0) {
      documentDirection = snapshot.value.documentDirection;
      documentLanguage = snapshot.value.documentLanguage;
      title = snapshot.value.title;
    }

    states.push({
      type: capture.type,
      key: capture.key,
      ...(capture.label === undefined ? {} : { label: capture.label }),
      sanitizedHtml: snapshot.value.sanitizedHtml,
      items: snapshot.value.items,
    });
  }

  const defaultState = states.find((state) => state.key === "default") ?? states[0];
  if (defaultState === undefined) {
    return {
      ok: false,
      error: createError(
        ERROR_CODES.UNSUPPORTED_DYNAMIC_CONTENT,
        "No reviewable page state could be captured.",
      ),
    };
  }

  if (
    defaultState.items.length === 0 &&
    discovered.value.unsupported.some((signal) => signal.kind === "authentication")
  ) {
    return {
      ok: false,
      error: createError(
        ERROR_CODES.UNSUPPORTED_DYNAMIC_CONTENT,
        "This page requires sign-in or other application behavior that cannot be reviewed.",
      ),
    };
  }

  return {
    ok: true,
    value: {
      finalUrl: baseUrl,
      sanitizedHtml: defaultState.sanitizedHtml,
      items: defaultState.items,
      documentDirection,
      states,
      unsupported: discovered.value.unsupported,
      ...(title === undefined ? {} : { title }),
      ...(documentLanguage === undefined ? {} : { documentLanguage }),
    },
  };
}
