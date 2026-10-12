import { describe, it, expect, beforeEach } from "vitest";
import { RegisterUseCase } from "../../src/application/auth/RegisterUseCase.js";
import { InMemoryUserRepository } from "../../src/infrastructure/database/repositories/InMemoryUserRepository.js";
import { FakePasswordHasher } from "../../src/infrastructure/security/FakePasswordHasher.js";
import { EmailAlreadyInUseError } from "../../src/domain/shared/errors.js";

describe("RegisterUseCase", () => {
  let userRepository: InMemoryUserRepository;
  let useCase: RegisterUseCase;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    useCase = new RegisterUseCase(userRepository, new FakePasswordHasher());
  });

  it("creates a user and hashes the password", async () => {
    const result = await useCase.execute({ email: "a@b.com", password: "a-decent-passw0rd" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");

    const saved = await userRepository.findById(result.value.userId);
    expect(saved?.passwordHash).toBe("hashed:a-decent-passw0rd");
  });

  it("rejects a duplicate email", async () => {
    await useCase.execute({ email: "a@b.com", password: "a-decent-passw0rd" });
    const result = await useCase.execute({ email: "a@b.com", password: "another-password-ok" });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error).toBeInstanceOf(EmailAlreadyInUseError);
  });
});
