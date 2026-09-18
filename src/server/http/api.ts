import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { httpStatusForError } from "@/application/http/status";
import { resolveProjectAccess } from "@/application/use-cases/project-access";
import { createError, ERROR_CODES, toErrorResponseBody, type AppError } from "@/domain/errors";
import type { User } from "@/domain/types";
import { SESSION_COOKIE, userFromSessionToken } from "@/server/auth/session";
import { createPostgresStores } from "@/server/persistence/create-postgres-repositories";

export const stores = createPostgresStores();

export function jsonError(error: AppError): NextResponse {
  return NextResponse.json(toErrorResponseBody(error), {
    status: httpStatusForError(error),
  });
}

export function jsonOk(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export function sessionCookie(token: string): string {
  const maxAge = 30 * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function requireUser(): Promise<ResultUser> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const user = await userFromSessionToken(token, stores.users, stores.sessions);
  if (user === undefined) {
    return {
      ok: false,
      error: createError(ERROR_CODES.UNAUTHORIZED, "Sign in to continue."),
    };
  }

  return { ok: true, value: user };
}

export async function requireProject(user: User, projectId: string) {
  const access = await resolveProjectAccess(user.id, projectId, stores.repositories);
  if (!access.ok) {
    return access;
  }

  return { ok: true as const, value: access.value.project, role: access.value.role };
}

export async function requirePageProject(user: User, pageId: string) {
  const page = await stores.repositories.pages.getById(pageId);
  if (page === undefined) {
    return {
      ok: false as const,
      error: createError(ERROR_CODES.NOT_FOUND, "The page was not found."),
    };
  }

  const access = await requireProject(user, page.projectId);
  if (!access.ok) {
    return access;
  }

  return { ok: true as const, value: { page, project: access.value, role: access.role } };
}

type ResultUser =
  | { ok: true; value: User }
  | { ok: false; error: AppError };
