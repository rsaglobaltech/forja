import { describe, it, expect, beforeEach } from "vitest";
import { CreateSessionUseCase } from "../../src/application/auth/CreateSessionUseCase.js";
import { ValidateSessionUseCase } from "../../src/application/auth/ValidateSessionUseCase.js";
import { LogoutUseCase } from "../../src/application/auth/LogoutUseCase.js";
import { InMemorySessionRepository } from "../../src/infrastructure/database/repositories/InMemorySessionRepository.js";
import { FixedClock } from "../../src/infrastructure/clock/FixedClock.js";

describe("Sesiones (crear/validar/expirar/revocar)", () => {
  let sessionRepository: InMemorySessionRepository;
  let clock: FixedClock;
  let createSession: CreateSessionUseCase;
  let validateSession: ValidateSessionUseCase;
  let logout: LogoutUseCase;

  beforeEach(() => {
    sessionRepository = new InMemorySessionRepository();
    clock = new FixedClock();
    createSession = new CreateSessionUseCase(sessionRepository, clock, 30);
    validateSession = new ValidateSessionUseCase(sessionRepository, clock);
    logout = new LogoutUseCase(sessionRepository);
  });

  it("crea una sesión y la valida devolviendo el userId", async () => {
    const { token } = await createSession.execute("user-1");
    const userId = await validateSession.execute(token);
    expect(userId).toBe("user-1");
  });

  it("una sesión vencida no valida más", async () => {
    const { token } = await createSession.execute("user-1");
    clock.advance(31 * 24 * 60 * 60 * 1000);
    const userId = await validateSession.execute(token);
    expect(userId).toBeNull();
  });

  it("revocar es idempotente", async () => {
    const { token } = await createSession.execute("user-1");
    await logout.execute(token);
    await expect(logout.execute(token)).resolves.toBeUndefined();
    expect(await validateSession.execute(token)).toBeNull();
  });
});
