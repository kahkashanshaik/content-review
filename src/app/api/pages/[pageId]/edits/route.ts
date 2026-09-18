import { saveContentEdit } from "@/application/use-cases/save-content-edit";
import { createError, ERROR_CODES } from "@/domain/errors";
import { jsonError, jsonOk, readJson, requirePageProject, requireUser, stores } from "@/server/http/api";

export const runtime = "nodejs";

export async function POST(
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

  const body = await readJson(request);
  const contentItemId = readString(body, "contentItemId");
  const newText = readString(body, "newText");
  if (contentItemId === undefined || newText === undefined) {
    return jsonError(
      createError(ERROR_CODES.VALIDATION_ERROR, "contentItemId and newText are required."),
    );
  }

  const result = await saveContentEdit({ contentItemId, newText }, stores.repositories);
  if (!result.ok) {
    return jsonError(result.error);
  }

  return jsonOk(result.value);
}

function readString(body: unknown, key: string): string | undefined {
  if (typeof body !== "object" || body === null || !(key in body)) {
    return undefined;
  }

  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}
