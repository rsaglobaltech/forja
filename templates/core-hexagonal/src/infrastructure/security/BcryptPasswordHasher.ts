import bcrypt from "bcryptjs";
import type { IPasswordHasher } from "../../ports/IPasswordHasher.js";

const COST = 12;

/** Hash dummy precomputado para comparar en tiempo constante cuando el usuario no existe. */
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing-safety", COST);

export class BcryptPasswordHasher implements IPasswordHasher {
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, COST);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /** Usar cuando el usuario no existe, para no filtrar por timing (ver LoginUseCase). */
  async compareDummy(plain: string): Promise<boolean> {
    return bcrypt.compare(plain, DUMMY_HASH);
  }
}
