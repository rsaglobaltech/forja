import { describe, it, expect } from "vitest";
import { Email } from "../../src/domain/value-objects/Email.js";
import { InvalidEmailError } from "../../src/domain/shared/errors.js";

describe("Email", () => {
  it("normaliza a minúsculas y sin espacios", () => {
    const email = Email.create("  Test@Example.com  ");
    expect(email.toString()).toBe("test@example.com");
  });

  it("rechaza formatos inválidos", () => {
    expect(() => Email.create("no-es-un-email")).toThrow(InvalidEmailError);
  });

  it("dos emails equivalentes son iguales", () => {
    const a = Email.create("a@b.com");
    const b = Email.create("A@B.com");
    expect(a.equals(b)).toBe(true);
  });
});
