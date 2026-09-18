import { reviewChange } from "@/application/use-cases/review-change";
import { createError, ERROR_CODES } from "@/domain/errors";
import { jsonError, jsonOk, readJson, requirePageProject, requireUser, stores } from "@/server/http/api";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ changeId: string }> },
): Promise<Response> {
  const user = await requireUser();
  if (!user.ok) {
    return jsonError(user.error);
  }

  const { changeId } = await context.params;
  const change = await stores.repositories.changes.getById(changeId);
  if (change === undefined) {
    return jsonError(createError(ERROR_CODES.NOT_FOUND, "The change was not found."));
  }

  const item = await stores.repositories.contentItems.getById(change.contentItemId);
  if (item === undefined) {
    return jsonError(createError(ERROR_CODES.NOT_FOUND, "The change was not found."));
  }

  const access = await requirePageProject(user.value, item.pageId);
  if (!access.ok) {
    return jsonError(access.error);
  }

  const body = await readJson(request);
  const decision = readString(body, "decision");
  if (decision !== "accepted" && decision !== "rejected") {
    return jsonError(
      createError(ERROR_CODES.VALIDATION_ERROR, "decision must be accepted or rejected."),
    );
  }

  const result = await reviewChange({ changeId, decision }, stores.repositories);
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
