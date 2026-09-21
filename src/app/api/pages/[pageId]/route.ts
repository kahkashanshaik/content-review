import { deletePage } from "@/application/use-cases/delete-page";
import { jsonError, jsonOk, requireUser, stores } from "@/server/http/api";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ pageId: string }> },
): Promise<Response> {
  const user = await requireUser();
  if (!user.ok) {
    return jsonError(user.error);
  }

  const { pageId } = await context.params;
  const result = await deletePage(user.value.id, pageId, stores.repositories);
  if (!result.ok) {
    return jsonError(result.error);
  }

  return jsonOk(result.value);
}
