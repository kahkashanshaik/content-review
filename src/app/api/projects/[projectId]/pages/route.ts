import { createError, ERROR_CODES } from "@/domain/errors";
import { jsonError, jsonOk, readJson, requireProject, requireUser, stores } from "@/server/http/api";
import { crawlAndPersistPage } from "@/server/projects/crawl-and-persist";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  const user = await requireUser();
  if (!user.ok) {
    return jsonError(user.error);
  }

  const { projectId } = await context.params;
  const project = await requireProject(user.value, projectId);
  if (!project.ok) {
    return jsonError(project.error);
  }

  const body = await readJson(request);
  const url = readString(body, "url");
  if (url === undefined) {
    return jsonError(createError(ERROR_CODES.VALIDATION_ERROR, "A page URL is required.", { field: "url" }));
  }

  const persisted = await crawlAndPersistPage(project.value, url, stores.repositories);
  if (!persisted.ok) {
    return jsonError(persisted.error);
  }

  return jsonOk({ page: persisted.value.page, project: project.value }, 201);
}

function readString(body: unknown, key: string): string | undefined {
  if (typeof body !== "object" || body === null || !(key in body)) {
    return undefined;
  }

  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}
