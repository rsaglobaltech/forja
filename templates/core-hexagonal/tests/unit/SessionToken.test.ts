import { describe, it, expect } from "vitest";
import { SessionToken } from "../../src/domain/services/SessionToken.js";

describe("SessionToken", () => {
  it("generates a different token on every call (entropy)", () => {
    const a = SessionToken.generate();
    const b = SessionToken.generate();
    expect(a.token).not.toBe(b.token);
    expect(a.token).toHaveLength(64); // 32 bytes in hex
  });

  it("the hash is deterministic for the same token", () => {
    const { token, tokenHash } = SessionToken.generate();
    expect(SessionToken.hash(token)).toBe(tokenHash);
  });

  it("never stores the plain-text token as part of the hash", () => {
    const { token, tokenHash } = SessionToken.generate();
    expect(tokenHash).not.toContain(token);
  });
});
