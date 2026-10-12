import { randomBytes, createHash } from "node:crypto";

const TOKEN_BYTES = 32;

/**
 * The plain-text token only exists in the response to the client; the only
 * thing persisted is its SHA-256 hash. That way a database leak does not
 * expose directly usable session tokens.
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
