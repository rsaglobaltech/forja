import { WeakPasswordError } from "../shared/errors.js";

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

/**
 * Lista corta de arranque. En un proyecto real conviene reemplazar esto por
 * el archivo embebido de las 10k contraseñas más comunes (sección 10 del
 * spec de forja) — acá va solo una muestra para no inflar el scaffold.
 */
const COMMON_PASSWORDS = new Set([
  "password",
  "12345678",
  "123456789",
  "qwerty123",
  "letmein1",
  "password1",
  "iloveyou",
  "admin1234",
]);

export class Password {
  private constructor(readonly plain: string) {}

  /** Valida la política. No hashea acá — eso es responsabilidad de `IPasswordHasher`. */
  static create(raw: string): Password {
    if (raw.length < MIN_LENGTH) {
      throw new WeakPasswordError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres`);
    }
    if (raw.length > MAX_LENGTH) {
      throw new WeakPasswordError(`La contraseña no puede superar ${MAX_LENGTH} caracteres`);
    }
    if (COMMON_PASSWORDS.has(raw.toLowerCase())) {
      throw new WeakPasswordError("Esa contraseña es demasiado común, elegí otra");
    }
    return new Password(raw);
  }
}
