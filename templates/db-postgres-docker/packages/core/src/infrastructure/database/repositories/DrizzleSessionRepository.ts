import { eq } from "drizzle-orm";
import { getDb } from "../db.js";
import { sessions } from "../schema.js";
import type { ISessionRepository, SessionRecord } from "../../../ports/ISessionRepository.js";

export class DrizzleSessionRepository implements ISessionRepository {
  async save(session: SessionRecord): Promise<void> {
    await getDb()
      .insert(sessions)
      .values({
        tokenHash: session.tokenHash,
        userId: session.userId,
        expiresAt: session.expiresAt,
      })
      .onConflictDoUpdate({
        target: sessions.tokenHash,
        set: { expiresAt: session.expiresAt },
      });
  }

  async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    const rows = await getDb().select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).limit(1);
    const row = rows[0];
    return row ? { tokenHash: row.tokenHash, userId: row.userId, expiresAt: row.expiresAt } : null;
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await getDb().delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await getDb().delete(sessions).where(eq(sessions.userId, userId));
  }
}
