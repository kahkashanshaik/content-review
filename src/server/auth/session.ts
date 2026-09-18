import { createError, ERROR_CODES, type Result } from "../../domain/errors.ts";
import { isValidEmail, normalizeEmail } from "../../domain/email.ts";
import { createId } from "../../domain/ids.ts";
import type { Session, User } from "../../domain/types.ts";
import type { SessionRepository, UserRepository } from "../../application/ports/auth.ts";
import { createSessionToken, hashPassword, hashSessionToken, verifyPassword } from "./password.ts";

export const SESSION_COOKIE = "cr_session";
const SESSION_DAYS = 30;

export type PublicUser = {
  id: string;
  email: string;
};

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email };
}

export async function registerUser(
  input: { email: string; password: string },
  users: UserRepository,
  sessions: SessionRepository,
  clock: () => Date = () => new Date(),
): Promise<Result<{ user: PublicUser; token: string }>> {
  const email = normalizeEmail(input.email);
  const password = input.password;
  if (!isValidEmail(email)) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "A valid email is required.", {
        field: "email",
      }),
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "Password must be at least 8 characters.", {
        field: "password",
      }),
    };
  }

  const existing = await users.getByEmail(email);
  if (existing !== undefined) {
    return {
      ok: false,
      error: createError(ERROR_CODES.CONFLICT, "An account with this email already exists.", {
        field: "email",
      }),
    };
  }

  const now = clock();
  const user: User = {
    id: createId("user"),
    email,
    passwordHash: await hashPassword(password),
    passwordSet: true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  await users.save(user);
  const opened = await createSession(user, sessions, clock);
  return { ok: true, value: { user: toPublicUser(user), token: opened.token } };
}

export async function loginUser(
  input: { email: string; password: string },
  users: UserRepository,
  sessions: SessionRepository,
  clock: () => Date = () => new Date(),
): Promise<Result<{ user: PublicUser; token: string }>> {
  const email = normalizeEmail(input.email);
  const user = await users.getByEmail(email);
  if (
    user === undefined ||
    !user.passwordSet ||
    !(await verifyPassword(input.password, user.passwordHash))
  ) {
    return {
      ok: false,
      error: createError(ERROR_CODES.UNAUTHORIZED, "Email or password is incorrect."),
    };
  }

  const opened = await createSession(user, sessions, clock);
  return { ok: true, value: { user: toPublicUser(user), token: opened.token } };
}

export async function userFromSessionToken(
  token: string | undefined,
  users: UserRepository,
  sessions: SessionRepository,
  clock: () => Date = () => new Date(),
): Promise<User | undefined> {
  if (token === undefined || token.trim() === "") {
    return undefined;
  }

  const session = await sessions.getByTokenHash(hashSessionToken(token));
  if (session === undefined) {
    return undefined;
  }

  if (new Date(session.expiresAt).getTime() <= clock().getTime()) {
    await sessions.deleteById(session.id);
    return undefined;
  }

  return users.getById(session.userId);
}

export async function logoutSession(
  token: string | undefined,
  sessions: SessionRepository,
): Promise<void> {
  if (token === undefined || token.trim() === "") {
    return;
  }

  const session = await sessions.getByTokenHash(hashSessionToken(token));
  if (session !== undefined) {
    await sessions.deleteById(session.id);
  }
}

export async function createSession(
  user: User,
  sessions: SessionRepository,
  clock: () => Date = () => new Date(),
): Promise<{ session: Session; token: string }> {
  const now = clock();
  const token = createSessionToken();
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const session: Session = {
    id: createId("session"),
    userId: user.id,
    tokenHash: hashSessionToken(token),
    expiresAt: expires.toISOString(),
    createdAt: now.toISOString(),
  };
  await sessions.save(session);
  return { session, token };
}

export async function setUserPassword(
  user: User,
  password: string,
  users: UserRepository,
  clock: () => Date = () => new Date(),
): Promise<Result<User>> {
  if (password.length < 8) {
    return {
      ok: false,
      error: createError(ERROR_CODES.VALIDATION_ERROR, "Password must be at least 8 characters.", {
        field: "password",
      }),
    };
  }

  const now = clock();
  const next: User = {
    ...user,
    passwordHash: await hashPassword(password),
    passwordSet: true,
    updatedAt: now.toISOString(),
  };
  await users.save(next);
  return { ok: true, value: next };
}
