import { inviteMember } from "@/application/use-cases/invite-member";
import { createError, ERROR_CODES } from "@/domain/errors";
import { jsonError, jsonOk, readJson, requireProject, requireUser, stores } from "@/server/http/api";
import { hashPassword } from "@/server/auth/password";
import { createMailer } from "@/server/mail/create-mailer";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  const mailer = createMailer();
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
  const email = readString(body, "email");
  if (email === undefined) {
    return jsonError(
      createError(ERROR_CODES.VALIDATION_ERROR, "An email address is required.", { field: "email" }),
    );
  }

  const result = await inviteMember(
    {
      projectId,
      email,
      invitedByUserId: user.value.id,
      appOrigin: appOrigin(request),
    },
    stores.repositories,
    stores.users,
    mailer,
    () => new Date(),
    hashPassword,
  );
  if (!result.ok) {
    return jsonError(result.error);
  }

  return jsonOk(result.value, 201);
}

function appOrigin(request: Request): string {
  const configured = process.env.APP_ORIGIN?.trim();
  if (configured !== undefined && configured.length > 0) {
    return configured.replace(/\/$/, "");
  }

  return new URL(request.url).origin;
}

function readString(body: unknown, key: string): string | undefined {
  if (typeof body !== "object" || body === null || !(key in body)) {
    return undefined;
  }

  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}
