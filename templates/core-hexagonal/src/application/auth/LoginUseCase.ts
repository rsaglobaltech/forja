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
 * Deliberately never "registers on the fly" when the email does not exist —
 * keeping register and login separate is the most important fix in this
 * module (see docs/architecture.md, lesson from lingua-ai).
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
      // Compare against a dummy hash anyway: same cost as the happy path,
      // so timing does not leak whether the email exists.
      await this.passwordHasher.compareDummy(input.password);
      return err(new InvalidCredentialsError());
    }

    const valid = await this.passwordHasher.compare(input.password, user.passwordHash);
    if (!valid) return err(new InvalidCredentialsError());

    return ok({ userId: user.id });
  }
}
