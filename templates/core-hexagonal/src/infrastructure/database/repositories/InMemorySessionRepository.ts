import type { ISessionRepository, SessionRecord } from "../../../ports/ISessionRepository.js";

export class InMemorySessionRepository implements ISessionRepository {
  private byTokenHash = new Map<string, SessionRecord>();

  async save(session: SessionRecord): Promise<void> {
    this.byTokenHash.set(session.tokenHash, session);
  }

  async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    return this.byTokenHash.get(tokenHash) ?? null;
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    this.byTokenHash.delete(tokenHash);
  }

  async deleteAllForUser(userId: string): Promise<void> {
    for (const [key, session] of this.byTokenHash) {
      if (session.userId === userId) this.byTokenHash.delete(key);
    }
  }

  reset(): void {
    this.byTokenHash.clear();
  }
}
