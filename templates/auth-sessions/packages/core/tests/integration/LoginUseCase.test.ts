import { describe, it, expect, beforeEach } from "vitest";
import { RegisterUseCase } from "../../src/application/auth/RegisterUseCase.js";
import { LoginUseCase } from "../../src/application/auth/LoginUseCase.js";
import { InMemoryUserRepository } from "../../src/infrastructure/database/repositories/InMemoryUserRepository.js";
import { FakePasswordHasher } from "../../src/infrastructure/security/FakePasswordHasher.js";
import { InvalidCredentialsError } from "../../src/domain/shared/errors.js";

describe("LoginUseCase", () => {
  let userRepository: InMemoryUserRepository;
  let loginUseCase: LoginUseCase;

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    const hasher = new FakePasswordHasher();
    loginUseCase = new LoginUseCase(userRepository, hasher);
    await new RegisterUseCase(userRepository, hasher).execute({
      email: "a@b.com",
      password: "a-decent-passw0rd",
    });
  });

  it("signs in with correct credentials", async () => {
    const result = await loginUseCase.execute({ email: "a@b.com", password: "a-decent-passw0rd" });
    expect(result.ok).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const result = await loginUseCase.execute({ email: "a@b.com", password: "something-else-entirely" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error).toBeInstanceOf(InvalidCredentialsError);
  });

  it("an unknown email gives the same error as a wrong password (anti-enumeration)", async () => {
    const result = await loginUseCase.execute({ email: "does-not-exist@b.com", password: "whatever-123" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error).toBeInstanceOf(InvalidCredentialsError);
  });
});
