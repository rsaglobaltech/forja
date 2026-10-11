import type {
  IPasswordResetTokenRepository,
  PasswordResetTokenRecord,
} from "../../../ports/IPasswordResetTokenRepository.js";

export class InMemoryPasswordResetTokenRepository implements IPasswordResetTokenRepository {
  private byTokenHash = new Map<string, PasswordResetTokenRecord>();

  async save(record: PasswordResetTokenRecord): Promise<void> {
    this.byTokenHash.set(record.tokenHash, record);
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    return this.byTokenHash.get(tokenHash) ?? null;
  }

  async markUsed(tokenHash: string): Promise<void> {
    const record = this.byTokenHash.get(tokenHash);
    if (record) record.usedAt = new Date();
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    for (const record of this.byTokenHash.values()) {
      if (record.userId === userId && !record.usedAt) record.usedAt = new Date();
    }
  }

  reset(): void {
    this.byTokenHash.clear();
  }
}
