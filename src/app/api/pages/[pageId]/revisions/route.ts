import { submitRevision } from "@/application/use-cases/submit-revision";
import { jsonError, jsonOk, requirePageProject, requireUser, stores } from "@/server/http/api";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ pageId: string }> },
): Promise<Response> {
  const user = await requireUser();
  if (!user.ok) {
    return jsonError(user.error);
  }

  const { pageId } = await context.params;
  const access = await requirePageProject(user.value, pageId);
  if (!access.ok) {
    return jsonError(access.error);
  }

  const result = await submitRevision({ pageId }, stores.repositories);
  if (!result.ok) {
    return jsonError(result.error);
  }

  return jsonOk(result.value);
}
