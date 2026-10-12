import { WeakPasswordError } from "../shared/errors.js";

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

/**
 * Short starter list. In a real project, replace this with the embedded
 * file of the 10k most common passwords (section 10 of the forja spec) —
 * only a sample lives here to keep the scaffold small.
 */
const COMMON_PASSWORDS = new Set([
  "password",
  "12345678",
  "123456789",
  "qwerty123",
  "letmein1",
  "password1",
  "iloveyou",
  "admin1234",
]);

export class Password {
  private constructor(readonly plain: string) {}

  /** Validates the policy. Does not hash here — that is `IPasswordHasher`'s job. */
  static create(raw: string): Password {
    if (raw.length < MIN_LENGTH) {
      throw new WeakPasswordError(`Password must be at least ${MIN_LENGTH} characters`);
    }
    if (raw.length > MAX_LENGTH) {
      throw new WeakPasswordError(`Password must not exceed ${MAX_LENGTH} characters`);
    }
    if (COMMON_PASSWORDS.has(raw.toLowerCase())) {
      throw new WeakPasswordError("That password is too common, choose another one");
    }
    return new Password(raw);
  }
}
