import { lookupInvite } from "@/application/use-cases/accept-invite";
import { jsonError, jsonOk, stores } from "@/server/http/api";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await context.params;
  const result = await lookupInvite({ token }, stores.repositories, stores.users);
  if (!result.ok) {
    return jsonError(result.error);
  }

  return jsonOk(result.value);
}
