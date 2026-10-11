import { SessionToken } from "../../domain/services/SessionToken.js";
import type { ISessionRepository } from "../../ports/ISessionRepository.js";
import type { IClock } from "../../ports/IClock.js";

/** Nunca lanza: token inválido o vencido simplemente resuelve `null`. */
export class ValidateSessionUseCase {
  constructor(
    private readonly sessionRepository: ISessionRepository,
    private readonly clock: IClock,
  ) {}

  async execute(token: string): Promise<string | null> {
    const tokenHash = SessionToken.hash(token);
    const session = await this.sessionRepository.findByTokenHash(tokenHash);
    if (!session) return null;

    if (session.expiresAt.getTime() <= this.clock.now().getTime()) {
      await this.sessionRepository.deleteByTokenHash(tokenHash);
      return null;
    }

    return session.userId;
  }
}
