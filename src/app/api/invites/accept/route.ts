import { acceptInvite } from "@/application/use-cases/accept-invite";
import { createError, ERROR_CODES } from "@/domain/errors";
import { jsonError, jsonOk, readJson, sessionCookie, stores } from "@/server/http/api";
import { createSession, setUserPassword } from "@/server/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  const token = readString(body, "token");
  const password = readString(body, "password");
  if (token === undefined) {
    return jsonError(
      createError(ERROR_CODES.VALIDATION_ERROR, "An invite token is required.", { field: "token" }),
    );
  }

  const result = await acceptInvite(
    { token, ...(password === undefined ? {} : { password }) },
    stores.repositories,
    stores.users,
    (user, nextPassword) => setUserPassword(user, nextPassword, stores.users),
  );
  if (!result.ok) {
    return jsonError(result.error);
  }

  const opened = await createSession(result.value.user, stores.sessions);
  const response = jsonOk({
    projectId: result.value.project.id,
    user: { id: result.value.user.id, email: result.value.user.email },
  });
  response.headers.set("Set-Cookie", sessionCookie(opened.token));
  return response;
}

function readString(body: unknown, key: string): string | undefined {
  if (typeof body !== "object" || body === null || !(key in body)) {
    return undefined;
  }

  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}
