import { jsonError, jsonOk, requireUser } from "@/server/http/api";
import { toPublicUser } from "@/server/auth/session";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const user = await requireUser();
  if (!user.ok) {
    return jsonError(user.error);
  }

  return jsonOk({ user: toPublicUser(user.value) });
}
