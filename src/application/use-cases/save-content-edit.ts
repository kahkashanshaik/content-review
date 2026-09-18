import { createError, ERROR_CODES, type Result } from "../../domain/errors.ts";
import { createId, isContentId } from "../../domain/ids.ts";
import type { ContentChange, ContentItem } from "../../domain/types.ts";
import type { Repositories } from "../ports/repositories.ts";

export const MAX_EDITED_TEXT_LENGTH = 10_000;

export type SaveContentEditInput = {
  contentItemId: string;
  newText: string;
};

export type SavedContentEdit = {
  item: ContentItem;
  change: ContentChange | undefined;
};

export async function saveContentEdit(
  input: SaveContentEditInput,
  repos: Repositories,
  clock: () => string = defaultClock,
): Promise<Result<SavedContentEdit>> {
  if (!isContentId(input.contentItemId)) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "A valid content id is required.", {
        field: "contentItemId",
      }),
    };
  }

  const normalized = normalizeEditedText(input.newText);
  if (normalized.length > MAX_EDITED_TEXT_LENGTH) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "The edited text is too long.", {
        field: "newText",
      }),
    };
  }

  const item = await repos.contentItems.getById(input.contentItemId);
  if (item === undefined) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "The content item was not found.", {
        field: "contentItemId",
      }),
    };
  }

  const now = clock();
  const nextItem: ContentItem = {
    ...item,
    currentText: normalized,
  };
  await repos.contentItems.save(nextItem);

  const pending = await findPendingChange(repos, item.id);

  if (normalized === item.originalText) {
    if (pending !== undefined) {
      await repos.changes.delete(pending.id);
    }

    return { ok: true, value: { item: nextItem, change: undefined } };
  }

  const change: ContentChange =
    pending === undefined
      ? {
          id: createId("change"),
          contentItemId: item.id,
          originalValue: item.currentText,
          newValue: normalized,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        }
      : {
          ...pending,
          newValue: normalized,
          updatedAt: now,
        };

  await repos.changes.save(change);
  return { ok: true, value: { item: nextItem, change } };
}

export function normalizeEditedText(value: string): string {
  return value.replaceAll("\u0000", "").replace(/\s+/g, " ").trim();
}

async function findPendingChange(
  repos: Repositories,
  contentItemId: string,
): Promise<ContentChange | undefined> {
  const changes = await repos.changes.listByContentItem(contentItemId);
  return changes.find((change) => change.status === "pending");
}

function defaultClock(): string {
  return new Date().toISOString();
}
