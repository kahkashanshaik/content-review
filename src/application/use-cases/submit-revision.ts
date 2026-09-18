import { createError, ERROR_CODES, type Result } from "../../domain/errors.ts";
import { createId, isId } from "../../domain/ids.ts";
import type { ContentChange, Revision } from "../../domain/types.ts";
import type { Repositories } from "../ports/repositories.ts";
import { listPageContentChanges, submittedChangeIds } from "./page-changes.ts";

export type SubmitRevisionInput = {
  pageId: string;
};

export type SubmittedRevision = {
  revision: Revision;
  changes: ContentChange[];
};

export async function submitRevision(
  input: SubmitRevisionInput,
  repos: Repositories,
  clock: () => string = defaultClock,
): Promise<Result<SubmittedRevision>> {
  if (!isId(input.pageId, "page")) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "A valid page id is required.", {
        field: "pageId",
      }),
    };
  }

  const page = await repos.pages.getById(input.pageId);
  if (page === undefined) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "The page was not found.", {
        field: "pageId",
      }),
    };
  }

  const { changes } = await listPageContentChanges(page.id, repos);
  const revisions = await repos.revisions.listByPage(page.id);
  const alreadySubmitted = submittedChangeIds(revisions);
  const pending = changes
    .filter((change) => change.status === "pending" && !alreadySubmitted.has(change.id))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  if (pending.length === 0) {
    return {
      ok: false,
      error: createError(
        ERROR_CODES.VALIDATION_ERROR,
        "There are no new pending changes to submit.",
        { field: "pageId" },
      ),
    };
  }

  const revision: Revision = {
    id: createId("revision"),
    pageId: page.id,
    createdAt: clock(),
    changeIds: pending.map((change) => change.id),
  };
  await repos.revisions.save(revision);

  return {
    ok: true,
    value: {
      revision,
      changes: pending,
    },
  };
}

function defaultClock(): string {
  return new Date().toISOString();
}
