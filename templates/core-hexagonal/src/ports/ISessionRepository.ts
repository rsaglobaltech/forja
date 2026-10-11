export interface SessionRecord {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
}

export interface ISessionRepository {
  save(session: SessionRecord): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
  deleteAllForUser(userId: string): Promise<void>;
}
