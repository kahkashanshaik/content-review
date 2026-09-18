import { createError, ERROR_CODES, type Result } from "../../domain/errors.ts";
import { isId } from "../../domain/ids.ts";
import type {
  ContentChange,
  ContentItem,
  Page,
  PageSnapshot,
  PageState,
  Project,
  Revision,
} from "../../domain/types.ts";
import type { Repositories } from "../ports/repositories.ts";
import { listPageContentChanges, submittedChangeIds } from "./page-changes.ts";

export type ReviewChangeEntry = {
  change: ContentChange;
  item: ContentItem;
  stateKey: string;
  stateLabel?: string;
  submitted: boolean;
};

export type ReviewPageData = {
  project: Project;
  page: Page;
  snapshot: PageSnapshot;
  state: PageState;
  states: PageState[];
  items: ContentItem[];
  pendingChanges: ContentChange[];
  reviewChanges: ReviewChangeEntry[];
  revisions: Revision[];
  sanitizedHtml: string;
};

export type LoadReviewOptions = {
  stateKey?: string;
};

export async function loadReview(
  pageId: string,
  repos: Repositories,
  options: LoadReviewOptions = {},
): Promise<Result<ReviewPageData>> {
  if (!isId(pageId, "page")) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "A valid page id is required.", {
        field: "pageId",
      }),
    };
  }

  const page = await repos.pages.getById(pageId);
  if (page === undefined) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "The page was not found.", {
        field: "pageId",
      }),
    };
  }

  const project = await repos.projects.getById(page.projectId);
  const snapshot = await repos.snapshots.getById(page.snapshotId);
  if (project === undefined || snapshot === undefined) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "The page snapshot was not found.", {
        field: "pageId",
      }),
    };
  }

  const listed = await repos.states.listBySnapshot(snapshot.id);
  const states = sortStates(listed);
  const requestedKey = options.stateKey;
  const state =
    (requestedKey === undefined
      ? undefined
      : states.find((entry) => entry.key === requestedKey)) ??
    states.find((entry) => entry.key === "default") ??
    states[0];
  if (state === undefined) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "The page has no editable state.", {
        field: "pageId",
      }),
    };
  }

  const items = await repos.contentItems.listByState(state.id);
  const { items: pageItems, changes } = await listPageContentChanges(page.id, repos);
  const revisions = await repos.revisions.listByPage(page.id);
  const submitted = submittedChangeIds(revisions);
  const itemsById = new Map(pageItems.map((entry) => [entry.id, entry]));
  const statesById = new Map(states.map((entry) => [entry.id, entry]));

  const reviewChanges: ReviewChangeEntry[] = [];
  for (const change of changes) {
    const item = itemsById.get(change.contentItemId);
    if (item === undefined) {
      continue;
    }

    const itemState = statesById.get(item.stateId);
    const entry: ReviewChangeEntry = {
      change,
      item,
      stateKey: itemState?.key ?? "default",
      submitted: submitted.has(change.id),
    };
    if (itemState?.label !== undefined) {
      entry.stateLabel = itemState.label;
    }
    reviewChanges.push(entry);
  }

  reviewChanges.sort((left, right) => {
    const leftPending = left.change.status === "pending" ? 0 : 1;
    const rightPending = right.change.status === "pending" ? 0 : 1;
    if (leftPending !== rightPending) {
      return leftPending - rightPending;
    }
    return left.change.createdAt.localeCompare(right.change.createdAt);
  });

  return {
    ok: true,
    value: {
      project,
      page,
      snapshot,
      state,
      states,
      items,
      pendingChanges: reviewChanges
        .filter((entry) => entry.change.status === "pending")
        .map((entry) => entry.change),
      reviewChanges,
      revisions,
      sanitizedHtml: state.sanitizedHtml ?? snapshot.sanitizedHtml,
    },
  };
}

function sortStates(states: PageState[]): PageState[] {
  return [...states].sort((left, right) => {
    if (left.key === "default") {
      return -1;
    }
    if (right.key === "default") {
      return 1;
    }
    return left.key.localeCompare(right.key);
  });
}
