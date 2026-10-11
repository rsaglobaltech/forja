export interface PasswordResetTokenRecord {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface IPasswordResetTokenRepository {
  save(record: PasswordResetTokenRecord): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRecord | null>;
  markUsed(tokenHash: string): Promise<void>;
  invalidateAllForUser(userId: string): Promise<void>;
}
