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
      password: "un-passw0rd-decente",
    });
  });

  it("loguea con credenciales correctas", async () => {
    const result = await loginUseCase.execute({ email: "a@b.com", password: "un-passw0rd-decente" });
    expect(result.ok).toBe(true);
  });

  it("rechaza password incorrecta", async () => {
    const result = await loginUseCase.execute({ email: "a@b.com", password: "cualquier-otra-cosa" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error).toBeInstanceOf(InvalidCredentialsError);
  });

  it("email inexistente da el mismo error que password incorrecta (anti-enumeración)", async () => {
    const result = await loginUseCase.execute({ email: "no-existe@b.com", password: "lo-que-sea-123" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error).toBeInstanceOf(InvalidCredentialsError);
  });
});
