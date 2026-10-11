import { randomBytes, createHash } from "node:crypto";

const TOKEN_BYTES = 32;

/**
 * El token en texto plano solo existe en la respuesta al cliente; lo único
 * que se persiste es su hash SHA-256. Así una fuga de la base no filtra
 * tokens de sesión usables directamente.
 */
export class SessionToken {
  static generate(): { token: string; tokenHash: string } {
    const token = randomBytes(TOKEN_BYTES).toString("hex");
    return { token, tokenHash: SessionToken.hash(token) };
  }

  static hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
