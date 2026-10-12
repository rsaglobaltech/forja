import { describe, it, expect } from "vitest";
import { Password } from "../../src/domain/value-objects/Password.js";
import { WeakPasswordError } from "../../src/domain/shared/errors.js";

describe("Password", () => {
  it("accepts uncommon passwords of at least 8 characters", () => {
    expect(() => Password.create("a-decent-passw0rd")).not.toThrow();
  });

  it("rejects short passwords", () => {
    expect(() => Password.create("abc123")).toThrow(WeakPasswordError);
  });

  it("rejects passwords on the common list", () => {
    expect(() => Password.create("password1")).toThrow(WeakPasswordError);
  });

  it("rejects absurdly long passwords", () => {
    expect(() => Password.create("a".repeat(129))).toThrow(WeakPasswordError);
  });
});
