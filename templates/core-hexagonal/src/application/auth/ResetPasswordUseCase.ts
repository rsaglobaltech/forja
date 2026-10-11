import { createHash } from "node:crypto";
import { Password } from "../../domain/value-objects/Password.js";
import { InvalidResetTokenError } from "../../domain/shared/errors.js";
import { ok, err, type Result } from "../../domain/shared/Result.js";
import type { IUserRepository } from "../../ports/IUserRepository.js";
import type { IPasswordResetTokenRepository } from "../../ports/IPasswordResetTokenRepository.js";
import type { ISessionRepository } from "../../ports/ISessionRepository.js";
import type { IPasswordHasher } from "../../ports/IPasswordHasher.js";
import type { IClock } from "../../ports/IClock.js";

export class ResetPasswordUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly resetTokenRepository: IPasswordResetTokenRepository,
    private readonly sessionRepository: ISessionRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly clock: IClock,
  ) {}

  async execute(token: string, newPassword: string): Promise<Result<void, InvalidResetTokenError>> {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const record = await this.resetTokenRepository.findByTokenHash(tokenHash);

    if (!record || record.usedAt || record.expiresAt.getTime() <= this.clock.now().getTime()) {
      return err(new InvalidResetTokenError());
    }

    const user = await this.userRepository.findById(record.userId);
    if (!user) return err(new InvalidResetTokenError());

    const password = Password.create(newPassword);
    const passwordHash = await this.passwordHasher.hash(password.plain);

    await this.userRepository.save(user.withPasswordHash(passwordHash));
    await this.resetTokenRepository.markUsed(tokenHash);
    // Un reset de password es una señal de "algo raro puede haber pasado":
    // se revocan todas las sesiones existentes, no solo la que originó el pedido.
    await this.sessionRepository.deleteAllForUser(user.id);

    return ok(undefined);
  }
}
