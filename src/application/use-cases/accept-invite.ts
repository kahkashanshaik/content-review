import { createError, ERROR_CODES, type Result } from "../../domain/errors.ts";
import type { Project, User } from "../../domain/types.ts";
import type { UserRepository } from "../ports/auth.ts";
import type { Repositories } from "../ports/repositories.ts";
import { hashSecretToken } from "../security/tokens.ts";

export type LookupInviteInput = {
  token: string;
};

export type InvitePreview = {
  email: string;
  projectName: string;
  projectId: string;
  requiresPassword: boolean;
};

export async function lookupInvite(
  input: LookupInviteInput,
  repos: Pick<Repositories, "projects" | "invites">,
  users: UserRepository,
  clock: () => Date = () => new Date(),
): Promise<Result<InvitePreview>> {
  const invite = await repos.invites.getByTokenHash(hashSecretToken(input.token.trim()));
  if (invite === undefined) {
    return {
      ok: false,
      error: createError(ERROR_CODES.NOT_FOUND, "This invite link is invalid or has expired."),
    };
  }

  if (new Date(invite.expiresAt).getTime() <= clock().getTime()) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "This invite link has expired."),
    };
  }

  const project = await repos.projects.getById(invite.projectId);
  const user = await users.getByEmail(invite.email);
  if (project === undefined || user === undefined) {
    return {
      ok: false,
      error: createError(ERROR_CODES.NOT_FOUND, "This invite link is invalid or has expired."),
    };
  }

  return {
    ok: true,
    value: {
      email: invite.email,
      projectName: project.name,
      projectId: project.id,
      requiresPassword: !user.passwordSet,
    },
  };
}

export type AcceptInviteInput = {
  token: string;
  password?: string;
};

export type AcceptedInvite = {
  user: User;
  project: Project;
};

export async function acceptInvite(
  input: AcceptInviteInput,
  repos: Pick<Repositories, "projects" | "invites">,
  users: UserRepository,
  setPassword: (user: User, password: string) => Promise<Result<User>>,
  clock: () => Date = () => new Date(),
): Promise<Result<AcceptedInvite>> {
  const preview = await lookupInvite({ token: input.token }, repos, users, clock);
  if (!preview.ok) {
    return preview;
  }

  const invite = await repos.invites.getByTokenHash(hashSecretToken(input.token.trim()));
  const user = await users.getByEmail(preview.value.email);
  const project = await repos.projects.getById(preview.value.projectId);
  if (invite === undefined || user === undefined || project === undefined) {
    return {
      ok: false,
      error: createError(ERROR_CODES.NOT_FOUND, "This invite link is invalid or has expired."),
    };
  }

  let nextUser = user;
  if (user.passwordSet) {
    return {
      ok: false,
      error: createError(
        ERROR_CODES.VALIDATION_ERROR,
        "Sign in with your existing account to open this project.",
      ),
    };
  }

  const password = input.password ?? "";
  const updated = await setPassword(user, password);
  if (!updated.ok) {
    return updated;
  }
  nextUser = updated.value;

  await repos.invites.save({
    ...invite,
    acceptedAt: clock().toISOString(),
  });

  return { ok: true, value: { user: nextUser, project } };
}
