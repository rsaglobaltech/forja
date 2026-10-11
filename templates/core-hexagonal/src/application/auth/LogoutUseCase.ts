import { SessionToken } from "../../domain/services/SessionToken.js";
import type { ISessionRepository } from "../../ports/ISessionRepository.js";

/** Idempotente: revocar un token que ya no existe no es un error. */
export class LogoutUseCase {
  constructor(private readonly sessionRepository: ISessionRepository) {}

  async execute(token: string): Promise<void> {
    const tokenHash = SessionToken.hash(token);
    await this.sessionRepository.deleteByTokenHash(tokenHash);
  }
}
