import { SessionToken } from "../../domain/services/SessionToken.js";
import type { ISessionRepository } from "../../ports/ISessionRepository.js";
import type { IClock } from "../../ports/IClock.js";

const SESSION_TTL_DAYS = 30;

export interface CreateSessionOutput {
  token: string;
  expiresAt: Date;
}

export class CreateSessionUseCase {
  constructor(
    private readonly sessionRepository: ISessionRepository,
    private readonly clock: IClock,
    private readonly ttlDays: number = SESSION_TTL_DAYS,
  ) {}

  async execute(userId: string): Promise<CreateSessionOutput> {
    const { token, tokenHash } = SessionToken.generate();
    const expiresAt = new Date(this.clock.now().getTime() + this.ttlDays * 24 * 60 * 60 * 1000);

    await this.sessionRepository.save({ tokenHash, userId, expiresAt });

    return { token, expiresAt };
  }
}
