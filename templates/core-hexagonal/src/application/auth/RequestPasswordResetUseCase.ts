import { randomBytes, createHash } from "node:crypto";
import { Email } from "../../domain/value-objects/Email.js";
import type { IUserRepository } from "../../ports/IUserRepository.js";
import type { IPasswordResetTokenRepository } from "../../ports/IPasswordResetTokenRepository.js";
import type { IMailer } from "../../ports/IMailer.js";
import type { IClock } from "../../ports/IClock.js";

const RESET_TTL_MS = 60 * 60 * 1000; // 1h

export class RequestPasswordResetUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly resetTokenRepository: IPasswordResetTokenRepository,
    private readonly mailer: IMailer,
    private readonly clock: IClock,
    private readonly appUrl: string,
  ) {}

  /**
   * Siempre resuelve sin error, exista o no el email — es la defensa
   * anti-enumeración de cuentas. El caller (route handler) responde 200
   * incondicionalmente.
   */
  async execute(rawEmail: string): Promise<void> {
    const email = Email.create(rawEmail);
    const user = await this.userRepository.findByEmail(email);
    if (!user) return;

    await this.resetTokenRepository.invalidateAllForUser(user.id);

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const now = this.clock.now();

    await this.resetTokenRepository.save({
      tokenHash,
      userId: user.id,
      expiresAt: new Date(now.getTime() + RESET_TTL_MS),
      usedAt: null,
      createdAt: now,
    });

    await this.mailer.send({
      to: user.email.toString(),
      subject: "Recuperá tu contraseña",
      text: `Entrá a este link para elegir una contraseña nueva: ${this.appUrl}/reset-password/${token}\n\nSi no pediste esto, ignorá el mail.`,
    });
  }
}
