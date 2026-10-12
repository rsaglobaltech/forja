import bcrypt from "bcryptjs";
import type { IPasswordHasher } from "../../ports/IPasswordHasher.js";

const COST = 12;

/** Precomputed dummy hash, for a constant-time comparison when the user does not exist. */
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing-safety", COST);

export class BcryptPasswordHasher implements IPasswordHasher {
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, COST);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /** Use when the user does not exist, so timing does not leak it (see LoginUseCase). */
  async compareDummy(plain: string): Promise<boolean> {
    return bcrypt.compare(plain, DUMMY_HASH);
  }
}
