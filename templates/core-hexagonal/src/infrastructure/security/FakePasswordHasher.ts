import type { IPasswordHasher } from "../../ports/IPasswordHasher.js";

/** No CPU cost: keeps the unit/integration tests fast. */
export class FakePasswordHasher implements IPasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }

  async compareDummy(_plain: string): Promise<boolean> {
    return false;
  }
}
