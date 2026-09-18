import { jsonError, jsonOk, readJson, sessionCookie, stores } from "@/server/http/api";
import { registerUser } from "@/server/auth/session";
import { createError, ERROR_CODES } from "@/domain/errors";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  const email = readString(body, "email");
  const password = readString(body, "password");
  if (email === undefined || password === undefined) {
    return jsonError(
      createError(ERROR_CODES.VALIDATION_ERROR, "Email and password are required."),
    );
  }

  const result = await registerUser({ email, password }, stores.users, stores.sessions);
  if (!result.ok) {
    return jsonError(result.error);
  }

  const response = jsonOk({ user: result.value.user }, 201);
  response.headers.set("Set-Cookie", sessionCookie(result.value.token));
  return response;
}

function readString(body: unknown, key: string): string | undefined {
  if (typeof body !== "object" || body === null || !(key in body)) {
    return undefined;
  }

  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}
