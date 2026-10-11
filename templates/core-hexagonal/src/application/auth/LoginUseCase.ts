import { Email } from "../../domain/value-objects/Email.js";
import { InvalidCredentialsError } from "../../domain/shared/errors.js";
import { ok, err, type Result } from "../../domain/shared/Result.js";
import type { IUserRepository } from "../../ports/IUserRepository.js";
import type { IPasswordHasher } from "../../ports/IPasswordHasher.js";

export interface LoginInput {
  email: string;
  password: string;
}
export interface LoginOutput {
  userId: string;
}

/**
 * A propósito nunca "registra al pasar" si el email no existe — separar
 * register/login es la corrección más importante de este módulo (ver
 * docs/architecture.md, lección de lingua-ai).
 */
export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async execute(input: LoginInput): Promise<Result<LoginOutput, InvalidCredentialsError>> {
    const email = Email.create(input.email);
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      // Comparamos igual contra un hash dummy: mismo costo que el camino
      // feliz, para no filtrar por timing si el email existe o no.
      await this.passwordHasher.compareDummy(input.password);
      return err(new InvalidCredentialsError());
    }

    const valid = await this.passwordHasher.compare(input.password, user.passwordHash);
    if (!valid) return err(new InvalidCredentialsError());

    return ok({ userId: user.id });
  }
}
