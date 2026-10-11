import { eq } from "drizzle-orm";
import { getDb } from "../db.js";
import { users } from "../schema.js";
import { User } from "../../../domain/entities/User.js";
import { Email } from "../../../domain/value-objects/Email.js";
import type { IUserRepository } from "../../../ports/IUserRepository.js";

export class DrizzleUserRepository implements IUserRepository {
  async findByEmail(email: Email): Promise<User | null> {
    const rows = await getDb().select().from(users).where(eq(users.email, email.toString())).limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findById(id: string): Promise<User | null> {
    const rows = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async save(user: User): Promise<void> {
    const props = user.toPersistence();
    await getDb()
      .insert(users)
      .values({
        id: props.id,
        email: props.email.toString(),
        passwordHash: props.passwordHash,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: { passwordHash: props.passwordHash, updatedAt: props.updatedAt },
      });
  }
}

function toDomain(row: typeof users.$inferSelect): User {
  return User.fromPersistence({
    id: row.id,
    email: Email.create(row.email),
    passwordHash: row.passwordHash,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
