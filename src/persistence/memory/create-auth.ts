import type { Session, User } from "../../domain/types.ts";
import type { SessionRepository, UserRepository } from "../../application/ports/auth.ts";

export function createMemoryUsers(): UserRepository {
  const users = new Map<string, User>();
  const byEmail = new Map<string, string>();

  return {
    async getById(id) {
      return users.get(id);
    },
    async getByEmail(email) {
      const id = byEmail.get(email);
      return id === undefined ? undefined : users.get(id);
    },
    async save(user) {
      users.set(user.id, user);
      byEmail.set(user.email, user.id);
    },
  };
}

export function createMemorySessions(): SessionRepository {
  const sessions = new Map<string, Session>();
  const byHash = new Map<string, string>();

  return {
    async getByTokenHash(tokenHash) {
      const id = byHash.get(tokenHash);
      return id === undefined ? undefined : sessions.get(id);
    },
    async save(session) {
      sessions.set(session.id, session);
      byHash.set(session.tokenHash, session.id);
    },
    async deleteById(id) {
      const session = sessions.get(id);
      sessions.delete(id);
      if (session !== undefined) {
        byHash.delete(session.tokenHash);
      }
    },
  };
}
