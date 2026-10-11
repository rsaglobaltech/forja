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

  it("crea un usuario y hashea la contraseña", async () => {
    const result = await useCase.execute({ email: "a@b.com", password: "un-passw0rd-decente" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");

    const saved = await userRepository.findById(result.value.userId);
    expect(saved?.passwordHash).toBe("hashed:un-passw0rd-decente");
  });

  it("rechaza un email duplicado", async () => {
    await useCase.execute({ email: "a@b.com", password: "un-passw0rd-decente" });
    const result = await useCase.execute({ email: "a@b.com", password: "otra-contraseña-ok" });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error).toBeInstanceOf(EmailAlreadyInUseError);
  });
});
