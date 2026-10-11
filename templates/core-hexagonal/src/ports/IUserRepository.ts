import type { User } from "../domain/entities/User.js";
import type { Email } from "../domain/value-objects/Email.js";

export interface IUserRepository {
  findByEmail(email: Email): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}
