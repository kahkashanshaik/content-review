import type { Session, User } from "../../domain/types.ts";

export interface UserRepository {
  getById(id: string): Promise<User | undefined>;
  getByEmail(email: string): Promise<User | undefined>;
  save(user: User): Promise<void>;
}

export interface SessionRepository {
  getByTokenHash(tokenHash: string): Promise<Session | undefined>;
  save(session: Session): Promise<void>;
  deleteById(id: string): Promise<void>;
}
