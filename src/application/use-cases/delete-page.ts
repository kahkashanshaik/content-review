import { createError, ERROR_CODES, type Result } from "../../domain/errors.ts";
import { isId } from "../../domain/ids.ts";
import type { Repositories } from "../ports/repositories.ts";
import { resolveProjectAccess } from "./project-access.ts";

export async function deletePage(
  userId: string,
  pageId: string,
  repos: Repositories,
): Promise<Result<{ id: string }>> {
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
      error: createError(ERROR_CODES.NOT_FOUND, "The page was not found.", {
        field: "pageId",
      }),
    };
  }

  const access = await resolveProjectAccess(userId, page.projectId, repos);
  if (!access.ok) {
    return access;
  }

  await repos.pages.delete(page.id);
  return { ok: true, value: { id: page.id } };
}
