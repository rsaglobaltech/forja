import { eq } from "drizzle-orm";
import { getDb } from "../db.js";
import { passwordResetTokens } from "../schema.js";
import type {
  IPasswordResetTokenRepository,
  PasswordResetTokenRecord,
} from "../../../ports/IPasswordResetTokenRepository.js";

export class DrizzlePasswordResetTokenRepository implements IPasswordResetTokenRepository {
  async save(record: PasswordResetTokenRecord): Promise<void> {
    await getDb().insert(passwordResetTokens).values({
      tokenHash: record.tokenHash,
      userId: record.userId,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
    });
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    const rows = await getDb()
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);
    const row = rows[0];
    return row
      ? {
          tokenHash: row.tokenHash,
          userId: row.userId,
          expiresAt: row.expiresAt,
          usedAt: row.usedAt,
          createdAt: row.createdAt,
        }
      : null;
  }

  async markUsed(tokenHash: string): Promise<void> {
    await getDb()
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.tokenHash, tokenHash));
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await getDb()
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.userId, userId));
  }
}
