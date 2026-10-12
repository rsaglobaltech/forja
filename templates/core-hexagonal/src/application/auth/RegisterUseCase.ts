import { Email } from "../../domain/value-objects/Email.js";
import { Password } from "../../domain/value-objects/Password.js";
import { User } from "../../domain/entities/User.js";
import { EmailAlreadyInUseError } from "../../domain/shared/errors.js";
import { ok, err, type Result } from "../../domain/shared/Result.js";
import type { IUserRepository } from "../../ports/IUserRepository.js";
import type { IPasswordHasher } from "../../ports/IPasswordHasher.js";

export interface RegisterInput {
  email: string;
  password: string;
}
export interface RegisterOutput {
  userId: string;
}

/**
 * Registers a new user. Deliberately does NOT sign in implicitly: the
 * caller decides whether to chain `CreateSessionUseCase` (which is what the
 * auth-sessions route handler / server action does).
 */
export class RegisterUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async execute(input: RegisterInput): Promise<Result<RegisterOutput, EmailAlreadyInUseError>> {
    const email = Email.create(input.email);
    const password = Password.create(input.password);

    const existing = await this.userRepository.findByEmail(email);
    if (existing) return err(new EmailAlreadyInUseError());

    const passwordHash = await this.passwordHasher.hash(password.plain);
    const user = User.create({ email, passwordHash });
    await this.userRepository.save(user);

    return ok({ userId: user.id });
  }
}
