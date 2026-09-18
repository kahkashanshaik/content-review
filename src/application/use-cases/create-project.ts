import { createError, ERROR_CODES, type Result } from "../../domain/errors.ts";
import { createId, isId } from "../../domain/ids.ts";
import { parseWebsiteUrl, projectOriginFromUrl } from "../../domain/origin.ts";
import type { Project } from "../../domain/types.ts";

export type CreateProjectInput = {
  name: string;
  userId: string;
  originUrl: string;
};

export function createProject(
  input: CreateProjectInput,
  clock: () => string = defaultClock,
): Result<Project> {
  const name = input.name.trim();

  if (name.length === 0) {
    return {
      ok: false,
      error: createError(
        ERROR_CODES.VALIDATION_ERROR,
        "A project name is required.",
        { field: "name" },
      ),
    };
  }

  if (!isId(input.userId, "user")) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "A valid user id is required.", {
        field: "userId",
      }),
    };
  }

  const parsed = parseWebsiteUrl(input.originUrl);
  if (!parsed.ok) {
    return parsed;
  }

  const origin = projectOriginFromUrl(parsed.value);
  const now = clock();

  return {
    ok: true,
    value: {
      id: createId("project"),
      userId: input.userId,
      name,
      originUrl: origin.originUrl,
      allowedHost: origin.allowedHost,
      createdAt: now,
      updatedAt: now,
    },
  };
}

function defaultClock(): string {
  return new Date().toISOString();
}
