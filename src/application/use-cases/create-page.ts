import { createError, ERROR_CODES, type Result } from "../../domain/errors.ts";
import { createId, isId } from "../../domain/ids.ts";
import type { Page } from "../../domain/types.ts";

export type CreatePageInput = {
  projectId: string;
  sourceUrl: string;
  title?: string;
};

export function createPage(
  input: CreatePageInput,
  clock: () => string = defaultClock,
): Result<Page> {
  if (!isId(input.projectId, "project")) {
    return {
      ok: false,
      error: createError(
        ERROR_CODES.VALIDATION_ERROR,
        "A valid project id is required.",
        { field: "projectId" },
      ),
    };
  }

  const sourceUrl = input.sourceUrl.trim();
  if (sourceUrl.length === 0) {
    return {
      ok: false,
      error: createError(ERROR_CODES.INVALID_URL, "A page URL is required.", {
        field: "sourceUrl",
      }),
    };
  }

  const now = clock();
  const title = input.title?.trim();

  return {
    ok: true,
    value: {
      id: createId("page"),
      projectId: input.projectId,
      sourceUrl,
      ...(title ? { title } : {}),
      snapshotId: createId("snapshot"),
      createdAt: now,
      updatedAt: now,
    },
  };
}

function defaultClock(): string {
  return new Date().toISOString();
}
