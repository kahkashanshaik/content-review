import {
  EXTRACTABLE_ELEMENT_TYPES,
  type ExtractableElementType,
  type PageStateType,
  type TextDirection,
} from "../../domain/types.ts";
import { createError, ERROR_CODES, type Result } from "../../domain/errors.ts";
import { createId, isContentId, isId } from "../../domain/ids.ts";
import {
  assertSameProjectHost,
  normalizePageUrl,
  parseWebsiteUrl,
} from "../../domain/origin.ts";
import { createPage } from "./create-page.ts";
import type { Repositories } from "../ports/repositories.ts";
import type {
  ContentItem,
  Page,
  PageSnapshot,
  PageState,
  Project,
} from "../../domain/types.ts";

export type PersistableContentItem = {
  id: string;
  elementType: ExtractableElementType;
  text: string;
  selector: string;
  direction: TextDirection;
  language?: string;
  order: number;
  mapped?: boolean;
};

export type PersistablePageState = {
  type: PageStateType;
  key: string;
  label?: string;
  sanitizedHtml: string;
  items: readonly PersistableContentItem[];
};

export type PersistCrawledPageInput = {
  projectId: string;
  sourceUrl: string;
  sanitizedHtml: string;
  title?: string;
  items: readonly PersistableContentItem[];
  states?: readonly PersistablePageState[];
  unsupported?: readonly string[];
};

export type PersistedCrawledPage = {
  project: Project;
  page: Page;
  snapshot: PageSnapshot;
  state: PageState;
  states: PageState[];
  items: ContentItem[];
};

export async function persistCrawledPage(
  input: PersistCrawledPageInput,
  repos: Repositories,
  clock: () => string = defaultClock,
): Promise<Result<PersistedCrawledPage>> {
  if (!isId(input.projectId, "project")) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "A valid project id is required.", {
        field: "projectId",
      }),
    };
  }

  const project = await repos.projects.getById(input.projectId);
  if (project === undefined) {
    return {
      ok: false,
      error: createError(ERROR_CODES.NOT_FOUND, "The project was not found.", {
        field: "projectId",
      }),
    };
  }

  const parsed = parseWebsiteUrl(input.sourceUrl);
  if (!parsed.ok) {
    return parsed;
  }

  const host = assertSameProjectHost(parsed.value, project.allowedHost);
  if (!host.ok) {
    return host;
  }

  const sourceUrl = normalizePageUrl(host.value);
  const existing = await repos.pages.getByProjectAndUrl(project.id, sourceUrl);
  const now = clock();

  let savedPage: Page;
  if (existing !== undefined) {
    savedPage = {
      id: existing.id,
      projectId: existing.projectId,
      sourceUrl,
      snapshotId: createId("snapshot"),
      createdAt: existing.createdAt,
      updatedAt: now,
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.unsupported !== undefined && input.unsupported.length > 0
        ? { unsupportedDynamic: [...input.unsupported] }
        : {}),
    };
    await repos.contentItems.deleteByPage(existing.id);
    await repos.states.deleteBySnapshot(existing.snapshotId);
  } else {
    const created = createPage(
      {
        projectId: project.id,
        sourceUrl,
        ...(input.title === undefined ? {} : { title: input.title }),
      },
      clock,
    );
    if (!created.ok) {
      return created;
    }

    savedPage = {
      ...created.value,
      ...(input.unsupported !== undefined && input.unsupported.length > 0
        ? { unsupportedDynamic: [...input.unsupported] }
        : {}),
    };
  }

  const stateInputs =
    input.states !== undefined && input.states.length > 0
      ? input.states
      : [
          {
            type: "default" as const,
            key: "default",
            label: "Default",
            sanitizedHtml: input.sanitizedHtml,
            items: input.items,
          },
        ];

  const defaultInput = stateInputs.find((entry) => entry.key === "default") ?? stateInputs[0];
  if (defaultInput === undefined) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "A default page state is required.", {
        field: "states",
      }),
    };
  }

  const snapshot: PageSnapshot = {
    id: savedPage.snapshotId,
    pageId: savedPage.id,
    sanitizedHtml: defaultInput.sanitizedHtml,
    createdAt: now,
  };

  const states: PageState[] = [];
  const items: ContentItem[] = [];
  let defaultState: PageState | undefined;
  const defaultItems: ContentItem[] = [];

  for (const entry of stateInputs) {
    const mapped = mappedItemsForState(entry, savedPage.id);
    if (!mapped.ok) {
      return mapped;
    }

    const state: PageState = {
      id: createId("state"),
      pageSnapshotId: snapshot.id,
      type: entry.type,
      key: entry.key,
      sanitizedHtml: entry.sanitizedHtml,
      ...(entry.label === undefined ? {} : { label: entry.label }),
    };
    states.push(state);
    for (const item of mapped.value) {
      items.push({ ...item, stateId: state.id });
    }
    if (entry.key === defaultInput.key) {
      defaultState = state;
      defaultItems.push(...mapped.value.map((item) => ({ ...item, stateId: state.id })));
    }
  }

  if (defaultState === undefined) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "A default page state is required.", {
        field: "states",
      }),
    };
  }

  await repos.pages.save(savedPage);
  await repos.snapshots.save(snapshot);
  for (const state of states) {
    await repos.states.save(state);
  }
  for (const item of items) {
    await repos.contentItems.save(item);
  }

  return {
    ok: true,
    value: {
      project,
      page: savedPage,
      snapshot,
      state: defaultState,
      states,
      items: defaultItems,
    },
  };
}

function mappedItemsForState(
  entry: PersistablePageState,
  pageId: string,
): Result<Omit<ContentItem, "stateId">[]> {
  const items: Omit<ContentItem, "stateId">[] = [];

  for (const extracted of entry.items) {
    if (extracted.mapped === false) {
      continue;
    }

    if (!isContentId(extracted.id)) {
      return {
        ok: false,
        error: createError(ERROR_CODES.VALIDATION_ERROR, "A mapped content id is invalid.", {
          field: "items",
        }),
      };
    }

    if (!isExtractableType(extracted.elementType)) {
      return {
        ok: false,
        error: createError(ERROR_CODES.VALIDATION_ERROR, "A mapped element type is invalid.", {
          field: "items",
        }),
      };
    }

    items.push({
      id: extracted.id,
      pageId,
      elementType: extracted.elementType,
      originalText: extracted.text,
      currentText: extracted.text,
      selector: extracted.selector,
      direction: extracted.direction,
      ...(extracted.language === undefined ? {} : { language: extracted.language }),
      order: extracted.order,
    });
  }

  return { ok: true, value: items };
}

function isExtractableType(value: string): value is ExtractableElementType {
  return (EXTRACTABLE_ELEMENT_TYPES as readonly string[]).includes(value);
}

function defaultClock(): string {
  return new Date().toISOString();
}
