import { describe, it, expect, beforeEach } from "vitest";
import { RegisterUseCase } from "../../src/application/auth/RegisterUseCase.js";
import { CreateSessionUseCase } from "../../src/application/auth/CreateSessionUseCase.js";
import { ValidateSessionUseCase } from "../../src/application/auth/ValidateSessionUseCase.js";
import { RequestPasswordResetUseCase } from "../../src/application/auth/RequestPasswordResetUseCase.js";
import { ResetPasswordUseCase } from "../../src/application/auth/ResetPasswordUseCase.js";
import { LoginUseCase } from "../../src/application/auth/LoginUseCase.js";
import { InMemoryUserRepository } from "../../src/infrastructure/database/repositories/InMemoryUserRepository.js";
import { InMemorySessionRepository } from "../../src/infrastructure/database/repositories/InMemorySessionRepository.js";
import { InMemoryPasswordResetTokenRepository } from "../../src/infrastructure/database/repositories/InMemoryPasswordResetTokenRepository.js";
import { InMemoryMailer } from "../../src/infrastructure/mail/InMemoryMailer.js";
import { FakePasswordHasher } from "../../src/infrastructure/security/FakePasswordHasher.js";
import { FixedClock } from "../../src/infrastructure/clock/FixedClock.js";
import { InvalidResetTokenError } from "../../src/domain/shared/errors.js";

describe("Flujo completo de recuperación de contraseña", () => {
  let userRepository: InMemoryUserRepository;
  let sessionRepository: InMemorySessionRepository;
  let resetTokenRepository: InMemoryPasswordResetTokenRepository;
  let mailer: InMemoryMailer;
  let hasher: FakePasswordHasher;
  let clock: FixedClock;

  let requestReset: RequestPasswordResetUseCase;
  let resetPassword: ResetPasswordUseCase;
  let login: LoginUseCase;
  let validateSession: ValidateSessionUseCase;
  let userId: string;
  let existingSessionToken: string;

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    sessionRepository = new InMemorySessionRepository();
    resetTokenRepository = new InMemoryPasswordResetTokenRepository();
    mailer = new InMemoryMailer();
    hasher = new FakePasswordHasher();
    clock = new FixedClock();

    requestReset = new RequestPasswordResetUseCase(
      userRepository,
      resetTokenRepository,
      mailer,
      clock,
      "http://localhost:3000",
    );
    resetPassword = new ResetPasswordUseCase(userRepository, resetTokenRepository, sessionRepository, hasher, clock);
    login = new LoginUseCase(userRepository, hasher);
    validateSession = new ValidateSessionUseCase(sessionRepository, clock);

    const registered = await new RegisterUseCase(userRepository, hasher).execute({
      email: "a@b.com",
      password: "contraseña-vieja-123",
    });
    if (!registered.ok) throw new Error("setup falló");
    userId = registered.value.userId;

    const session = await new CreateSessionUseCase(sessionRepository, clock).execute(userId);
    existingSessionToken = session.token;
  });

  function extractToken(): string {
    const mail = mailer.last();
    if (!mail) throw new Error("no se mandó ningún mail");
    const match = mail.text.match(/reset-password\/([a-f0-9]+)/);
    if (!match) throw new Error("no se encontró el token en el mail");
    return match[1];
  }

  it("pide reset → cambia password → la vieja ya no sirve, la nueva sí", async () => {
    await requestReset.execute("a@b.com");
    const token = extractToken();

    const resetResult = await resetPassword.execute(token, "contraseña-nueva-456");
    expect(resetResult.ok).toBe(true);

    const oldLogin = await login.execute({ email: "a@b.com", password: "contraseña-vieja-123" });
    expect(oldLogin.ok).toBe(false);

    const newLogin = await login.execute({ email: "a@b.com", password: "contraseña-nueva-456" });
    expect(newLogin.ok).toBe(true);
  });

  it("un token usado no sirve una segunda vez", async () => {
    await requestReset.execute("a@b.com");
    const token = extractToken();

    await resetPassword.execute(token, "contraseña-nueva-456");
    const secondAttempt = await resetPassword.execute(token, "otra-contraseña-789");

    expect(secondAttempt.ok).toBe(false);
    if (secondAttempt.ok) throw new Error("unreachable");
    expect(secondAttempt.error).toBeInstanceOf(InvalidResetTokenError);
  });

  it("resetear la contraseña revoca todas las sesiones existentes", async () => {
    expect(await validateSession.execute(existingSessionToken)).toBe(userId);

    await requestReset.execute("a@b.com");
    const token = extractToken();
    await resetPassword.execute(token, "contraseña-nueva-456");

    expect(await validateSession.execute(existingSessionToken)).toBeNull();
  });

  it("pedir reset de un email inexistente no falla (anti-enumeración)", async () => {
    await expect(requestReset.execute("no-existe@b.com")).resolves.toBeUndefined();
  });
});
