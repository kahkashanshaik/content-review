import { createError, ERROR_CODES, type Result } from "../../domain/errors.ts";
import { isId } from "../../domain/ids.ts";
import type { ContentChange, ContentItem } from "../../domain/types.ts";
import type { Repositories } from "../ports/repositories.ts";
import { submittedChangeIds } from "./page-changes.ts";

export const REVIEW_DECISIONS = ["accepted", "rejected"] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export type ReviewChangeInput = {
  changeId: string;
  decision: ReviewDecision;
};

export type ReviewedChange = {
  change: ContentChange;
  item: ContentItem;
};

export async function reviewChange(
  input: ReviewChangeInput,
  repos: Repositories,
  clock: () => string = defaultClock,
): Promise<Result<ReviewedChange>> {
  if (!isId(input.changeId, "change")) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "A valid change id is required.", {
        field: "changeId",
      }),
    };
  }

  if (!isReviewDecision(input.decision)) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "Accept or reject the change.", {
        field: "decision",
      }),
    };
  }

  const change = await repos.changes.getById(input.changeId);
  if (change === undefined) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "The change was not found.", {
        field: "changeId",
      }),
    };
  }

  if (change.status !== "pending") {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "Only pending changes can be reviewed.", {
        field: "changeId",
      }),
    };
  }

  const item = await repos.contentItems.getById(change.contentItemId);
  if (item === undefined) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "The content item was not found.", {
        field: "contentItemId",
      }),
    };
  }

  const revisions = await repos.revisions.listByPage(item.pageId);
  if (!submittedChangeIds(revisions).has(change.id)) {
    return {
      ok: false,
      error: createError(
        ERROR_CODES.VALIDATION_ERROR,
        "Submit this change for review before accepting or rejecting it.",
        { field: "changeId" },
      ),
    };
  }

  const now = clock();
  const nextChange: ContentChange = {
    ...change,
    status: input.decision,
    updatedAt: now,
  };
  await repos.changes.save(nextChange);

  const nextItem: ContentItem =
    input.decision === "rejected"
      ? { ...item, currentText: change.originalValue }
      : { ...item, currentText: change.newValue };

  await repos.contentItems.save(nextItem);

  return {
    ok: true,
    value: {
      change: nextChange,
      item: nextItem,
    },
  };
}

function isReviewDecision(value: string): value is ReviewDecision {
  return value === "accepted" || value === "rejected";
}

function defaultClock(): string {
  return new Date().toISOString();
}
