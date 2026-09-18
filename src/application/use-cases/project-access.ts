import { createError, ERROR_CODES, type Result } from "../../domain/errors.ts";
import { isId } from "../../domain/ids.ts";
import type { Project, ProjectRole } from "../../domain/types.ts";
import type { Repositories } from "../ports/repositories.ts";

export type ProjectAccess = {
  project: Project;
  role: ProjectRole;
};

export async function resolveProjectAccess(
  userId: string,
  projectId: string,
  repos: Pick<Repositories, "projects" | "members">,
): Promise<Result<ProjectAccess>> {
  if (!isId(projectId, "project")) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "A valid project id is required.", {
        field: "projectId",
      }),
    };
  }

  const project = await repos.projects.getById(projectId);
  if (project === undefined) {
    return {
      ok: false,
      error: createError(ERROR_CODES.NOT_FOUND, "The project was not found.", {
        field: "projectId",
      }),
    };
  }

  if (project.userId === userId) {
    return { ok: true, value: { project, role: "owner" } };
  }

  const member = await repos.members.getByProjectAndUser(projectId, userId);
  if (member === undefined) {
    return {
      ok: false,
      error: createError(ERROR_CODES.FORBIDDEN, "You cannot access this project."),
    };
  }

  return { ok: true, value: { project, role: "member" } };
}

export async function listAccessibleProjects(
  userId: string,
  repos: Pick<Repositories, "projects" | "members">,
): Promise<Project[]> {
  const owned = await repos.projects.listByUser(userId);
  const memberships = await repos.members.listByUser(userId);
  const invited: Project[] = [];
  for (const membership of memberships) {
    const project = await repos.projects.getById(membership.projectId);
    if (project !== undefined && project.userId !== userId) {
      invited.push(project);
    }
  }

  return [...owned, ...invited].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}
