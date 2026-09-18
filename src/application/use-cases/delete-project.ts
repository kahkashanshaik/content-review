import { createError, ERROR_CODES, type Result } from "../../domain/errors.ts";
import type { Repositories } from "../ports/repositories.ts";
import { resolveProjectAccess } from "./project-access.ts";

export async function deleteProject(
  userId: string,
  projectId: string,
  repos: Repositories,
): Promise<Result<{ id: string }>> {
  const access = await resolveProjectAccess(userId, projectId, repos);
  if (!access.ok) {
    return access;
  }

  if (access.value.role !== "owner") {
    return {
      ok: false,
      error: createError(ERROR_CODES.FORBIDDEN, "Only the project owner can delete this project."),
    };
  }

  await repos.projects.delete(projectId);
  return { ok: true, value: { id: projectId } };
}
