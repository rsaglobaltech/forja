import { describe, it, expect } from "vitest";
import { SessionToken } from "../../src/domain/services/SessionToken.js";

describe("SessionToken", () => {
  it("genera tokens distintos en cada llamada (entropía)", () => {
    const a = SessionToken.generate();
    const b = SessionToken.generate();
    expect(a.token).not.toBe(b.token);
    expect(a.token).toHaveLength(64); // 32 bytes en hex
  });

  it("el hash es determinista para el mismo token", () => {
    const { token, tokenHash } = SessionToken.generate();
    expect(SessionToken.hash(token)).toBe(tokenHash);
  });

  it("nunca guarda el token en texto plano como parte del hash", () => {
    const { token, tokenHash } = SessionToken.generate();
    expect(tokenHash).not.toContain(token);
  });
});
