import { describe, it, expect } from "vitest";
import { User } from "../../src/domain/entities/User.js";
import { Email } from "../../src/domain/value-objects/Email.js";

describe("User", () => {
  it("creates a new user with an id and timestamps", () => {
    const user = User.create({ email: Email.create("a@b.com"), passwordHash: "hash" });
    expect(user.id).toBeTruthy();
    expect(user.email.toString()).toBe("a@b.com");
    expect(user.createdAt.getTime()).toBe(user.updatedAt.getTime());
  });

  it("withPasswordHash returns a new user without mutating the original", () => {
    const original = User.create({ email: Email.create("a@b.com"), passwordHash: "old" });
    const updated = original.withPasswordHash("new");

    expect(original.passwordHash).toBe("old");
    expect(updated.passwordHash).toBe("new");
    expect(updated.id).toBe(original.id);
  });
});
