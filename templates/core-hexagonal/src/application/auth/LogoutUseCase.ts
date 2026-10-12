import { SessionToken } from "../../domain/services/SessionToken.js";
import type { ISessionRepository } from "../../ports/ISessionRepository.js";

/** Idempotent: revoking a token that no longer exists is not an error. */
export class LogoutUseCase {
  constructor(private readonly sessionRepository: ISessionRepository) {}

  async execute(token: string): Promise<void> {
    const tokenHash = SessionToken.hash(token);
    await this.sessionRepository.deleteByTokenHash(tokenHash);
  }
}
