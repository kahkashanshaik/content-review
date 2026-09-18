import { cookies } from "next/headers";

import { clearSessionCookie, jsonOk, stores } from "@/server/http/api";
import { logoutSession, SESSION_COOKIE } from "@/server/auth/session";

export const runtime = "nodejs";

export async function POST(): Promise<Response> {
  const jar = await cookies();
  await logoutSession(jar.get(SESSION_COOKIE)?.value, stores.sessions);
  const response = jsonOk({ ok: true });
  response.headers.set("Set-Cookie", clearSessionCookie());
  return response;
}
