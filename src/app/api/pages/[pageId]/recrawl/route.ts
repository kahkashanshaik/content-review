import { jsonError, jsonOk, requirePageProject, requireUser, stores } from "@/server/http/api";
import { crawlAndPersistPage } from "@/server/projects/crawl-and-persist";

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

  const persisted = await crawlAndPersistPage(
    access.value.project,
    access.value.page.sourceUrl,
    stores.repositories,
  );
  if (!persisted.ok) {
    return jsonError(persisted.error);
  }

  return jsonOk({ page: persisted.value.page, project: access.value.project });
}
