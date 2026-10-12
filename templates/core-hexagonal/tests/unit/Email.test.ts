import { describe, it, expect } from "vitest";
import { Email } from "../../src/domain/value-objects/Email.js";
import { InvalidEmailError } from "../../src/domain/shared/errors.js";

describe("Email", () => {
  it("normalizes to lowercase without surrounding spaces", () => {
    const email = Email.create("  Test@Example.com  ");
    expect(email.toString()).toBe("test@example.com");
  });

  it("rejects invalid formats", () => {
    expect(() => Email.create("not-an-email")).toThrow(InvalidEmailError);
  });

  it("two equivalent emails are equal", () => {
    const a = Email.create("a@b.com");
    const b = Email.create("A@B.com");
    expect(a.equals(b)).toBe(true);
  });
});
