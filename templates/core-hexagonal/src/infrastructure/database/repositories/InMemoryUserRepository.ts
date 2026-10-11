import type { IUserRepository } from "../../../ports/IUserRepository.js";
import type { User } from "../../../domain/entities/User.js";
import type { Email } from "../../../domain/value-objects/Email.js";

export class InMemoryUserRepository implements IUserRepository {
  private byId = new Map<string, User>();

  async findByEmail(email: Email): Promise<User | null> {
    for (const user of this.byId.values()) {
      if (user.email.equals(email)) return user;
    }
    return null;
  }

  async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }

  async save(user: User): Promise<void> {
    this.byId.set(user.id, user);
  }

  reset(): void {
    this.byId.clear();
  }
}
