import { createError, ERROR_CODES, type Result } from "../../domain/errors.ts";
import { isValidEmail, normalizeEmail } from "../../domain/email.ts";
import { createId, isId } from "../../domain/ids.ts";
import type { ProjectInvite, ProjectMember } from "../../domain/types.ts";
import type { UserRepository } from "../ports/auth.ts";
import type { Mailer } from "../ports/mailer.ts";
import type { Repositories } from "../ports/repositories.ts";
import { createSecretToken, hashSecretToken } from "../security/tokens.ts";
import { resolveProjectAccess } from "./project-access.ts";

const INVITE_DAYS = 7;

export type InviteMemberInput = {
  projectId: string;
  email: string;
  invitedByUserId: string;
  appOrigin: string;
};

export type InvitedMember = {
  email: string;
  inviteUrl: string;
  createdAccount: boolean;
  emailSent: boolean;
  emailError?: string;
};

export type InviteMemberStores = Pick<Repositories, "projects" | "members" | "invites">;

export async function inviteMember(
  input: InviteMemberInput,
  repos: InviteMemberStores,
  users: UserRepository,
  mailer: Mailer,
  clock: () => Date = () => new Date(),
  hashPassword: (password: string) => Promise<string>,
): Promise<Result<InvitedMember>> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "A valid email is required.", {
        field: "email",
      }),
    };
  }

  if (!isId(input.invitedByUserId, "user")) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "A valid user id is required.", {
        field: "invitedByUserId",
      }),
    };
  }

  const access = await resolveProjectAccess(input.invitedByUserId, input.projectId, repos);
  if (!access.ok) {
    return access;
  }

  const inviter = await users.getById(input.invitedByUserId);
  if (inviter === undefined) {
    return {
      ok: false,
      error: createError(ERROR_CODES.NOT_FOUND, "The inviting user was not found."),
    };
  }

  if (inviter.email === email) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "You already have access to this project.", {
        field: "email",
      }),
    };
  }

  const project = access.value.project;
  const owner = await users.getById(project.userId);
  if (owner?.email === email) {
    return {
      ok: false,
      error: createError(ERROR_CODES.CONFLICT, "That person already owns this project.", {
        field: "email",
      }),
    };
  }

  const now = clock();
  let createdAccount = false;
  let user = await users.getByEmail(email);
  if (user === undefined) {
    user = {
      id: createId("user"),
      email,
      passwordHash: await hashPassword(createSecretToken()),
      passwordSet: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await users.save(user);
    createdAccount = true;
  }

  const existingMember = await repos.members.getByProjectAndUser(project.id, user.id);
  if (existingMember === undefined) {
    const member: ProjectMember = {
      id: createId("member"),
      projectId: project.id,
      userId: user.id,
      createdAt: now.toISOString(),
    };
    await repos.members.save(member);
  }

  const token = createSecretToken();
  const previous = await repos.invites.getByProjectAndEmail(project.id, email);
  const invite: ProjectInvite = {
    id: previous?.id ?? createId("invite"),
    projectId: project.id,
    email,
    invitedByUserId: input.invitedByUserId,
    tokenHash: hashSecretToken(token),
    expiresAt: new Date(now.getTime() + INVITE_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: previous?.createdAt ?? now.toISOString(),
  };
  await repos.invites.save(invite);

  const inviteUrl = `${trimOrigin(input.appOrigin)}/invite/${token}`;
  try {
    await mailer.send({
      to: email,
      subject: `You're invited to ${project.name} on Content Review`,
      text: inviteEmailBody({
        projectName: project.name,
        inviterEmail: inviter.email,
        inviteUrl,
        createdAccount,
      }),
    });
  } catch (caught) {
    const emailError = caught instanceof Error ? caught.message : "The invite email could not be sent.";
    console.error(`[mail] invite to ${email} failed: ${emailError}`);
    return { ok: true, value: { email, inviteUrl, createdAccount, emailSent: false, emailError } };
  }

  return { ok: true, value: { email, inviteUrl, createdAccount, emailSent: true } };
}

function trimOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

function inviteEmailBody(input: {
  projectName: string;
  inviterEmail: string;
  inviteUrl: string;
  createdAccount: boolean;
}): string {
  const action = input.createdAccount
    ? "An account was created for you. Open this link to set your password and open the project:"
    : "Open this link to open the project. Sign in with your existing Content Review account if you are asked:";

  return [
    `${input.inviterEmail} invited you to collaborate on ${input.projectName}.`,
    "",
    action,
    input.inviteUrl,
    "",
    "You can add pages, edit copy, submit changes, and accept or reject reviews.",
    "You cannot delete this project.",
  ].join("\n");
}
