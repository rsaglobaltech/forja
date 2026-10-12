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

describe("Full password reset flow", () => {
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
      password: "old-password-123",
    });
    if (!registered.ok) throw new Error("setup failed");
    userId = registered.value.userId;

    const session = await new CreateSessionUseCase(sessionRepository, clock).execute(userId);
    existingSessionToken = session.token;
  });

  function extractToken(): string {
    const mail = mailer.last();
    if (!mail) throw new Error("no email was sent");
    const match = mail.text.match(/reset-password\/([a-f0-9]+)/);
    if (!match) throw new Error("token not found in the email");
    return match[1];
  }

  it("request reset → change password → the old one no longer works, the new one does", async () => {
    await requestReset.execute("a@b.com");
    const token = extractToken();

    const resetResult = await resetPassword.execute(token, "new-password-456");
    expect(resetResult.ok).toBe(true);

    const oldLogin = await login.execute({ email: "a@b.com", password: "old-password-123" });
    expect(oldLogin.ok).toBe(false);

    const newLogin = await login.execute({ email: "a@b.com", password: "new-password-456" });
    expect(newLogin.ok).toBe(true);
  });

  it("a used token does not work a second time", async () => {
    await requestReset.execute("a@b.com");
    const token = extractToken();

    await resetPassword.execute(token, "new-password-456");
    const secondAttempt = await resetPassword.execute(token, "another-password-789");

    expect(secondAttempt.ok).toBe(false);
    if (secondAttempt.ok) throw new Error("unreachable");
    expect(secondAttempt.error).toBeInstanceOf(InvalidResetTokenError);
  });

  it("resetting the password revokes all existing sessions", async () => {
    expect(await validateSession.execute(existingSessionToken)).toBe(userId);

    await requestReset.execute("a@b.com");
    const token = extractToken();
    await resetPassword.execute(token, "new-password-456");

    expect(await validateSession.execute(existingSessionToken)).toBeNull();
  });

  it("requesting a reset for an unknown email does not fail (anti-enumeration)", async () => {
    await expect(requestReset.execute("does-not-exist@b.com")).resolves.toBeUndefined();
  });
});
