import { describe, it, expect } from "vitest";
import { Password } from "../../src/domain/value-objects/Password.js";
import { WeakPasswordError } from "../../src/domain/shared/errors.js";

describe("Password", () => {
  it("acepta contraseñas de al menos 8 caracteres no comunes", () => {
    expect(() => Password.create("un-passw0rd-decente")).not.toThrow();
  });

  it("rechaza contraseñas cortas", () => {
    expect(() => Password.create("abc123")).toThrow(WeakPasswordError);
  });

  it("rechaza contraseñas de la lista de comunes", () => {
    expect(() => Password.create("password1")).toThrow(WeakPasswordError);
  });

  it("rechaza contraseñas absurdamente largas", () => {
    expect(() => Password.create("a".repeat(129))).toThrow(WeakPasswordError);
  });
});
