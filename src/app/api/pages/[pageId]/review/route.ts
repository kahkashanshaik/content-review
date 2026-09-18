import { loadReview } from "@/application/use-cases/load-review";
import { jsonError, jsonOk, requirePageProject, requireUser, stores } from "@/server/http/api";

export const runtime = "nodejs";

export async function GET(
  request: Request,
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

  const stateKey = new URL(request.url).searchParams.get("stateKey") ?? undefined;
  const result = await loadReview(
    pageId,
    stores.repositories,
    stateKey === undefined ? {} : { stateKey },
  );
  if (!result.ok) {
    return jsonError(result.error);
  }

  return jsonOk(result.value);
}
