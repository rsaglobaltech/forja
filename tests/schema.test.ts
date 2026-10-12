import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  defaultConfig,
  defaultJavaConfig,
  formatConfigError,
  javaPackageOf,
  parseForjaConfig,
} from "../src/config/schema.js";

describe("configuration", () => {
  it("the defaults are valid (node, spring, quarkus)", () => {
    expect(() => parseForjaConfig(defaultConfig("acme"))).not.toThrow();
    expect(() => parseForjaConfig(defaultJavaConfig("acme", "spring"))).not.toThrow();
    expect(() => parseForjaConfig(defaultJavaConfig("acme", "quarkus"))).not.toThrow();
  });

  it("an older forja.config.json (no backend) is still node", () => {
    const { backend: _b, javaPackage: _j, archunit: _a, ...older } = defaultConfig("acme");
    expect(parseForjaConfig(older).backend).toBe("node");
  });

  it("Java: no mobile, auth oauth2 or none, db postgres-docker or none", () => {
    const base = defaultJavaConfig("acme", "spring");
    expect(() => parseForjaConfig({ ...base, platforms: ["web", "mobile"] })).toThrow(/mobile/);
    expect(() => parseForjaConfig({ ...base, auth: "sessions" })).toThrow(/oauth2 or none/);
    expect(() => parseForjaConfig({ ...base, platforms: [] })).not.toThrow();
  });

  it("ArchUnit, OAuth2 and javaPackage need a Java backend", () => {
    const node = defaultConfig("acme");
    expect(() => parseForjaConfig({ ...node, archunit: true })).toThrow(/archunit/);
    expect(() => parseForjaConfig({ ...node, auth: "oauth2" })).toThrow(/oauth2/);
    expect(() => parseForjaConfig({ ...node, javaPackage: "com.acme" })).toThrow(/java-package/);
  });

  it("the Java package is validated, and defaults to one made from the name", () => {
    const base = defaultJavaConfig("my-shop", "quarkus");
    expect(javaPackageOf(base)).toBe("com.myshop");
    expect(() => parseForjaConfig({ ...base, javaPackage: "Com.Acme" })).toThrow(/Java package/);
    expect(() => parseForjaConfig({ ...base, javaPackage: "acme" })).toThrow(/Java package/);
  });

  // The spec's other options used to pass here and fail half-way through the
  // generation. Until a recipe implements one, it is not a valid value at all.
  it("rejects every option no recipe implements yet", () => {
    const node = defaultConfig("acme");
    for (const [field, value] of [
      ["db", "supabase"],
      ["auth", "supabase-auth"],
      ["mailer", "resend"],
      ["ui", "shadcn"],
      ["arch", "clean"],
      ["eas", true],
      ["edgeFunctions", true],
    ] as const) {
      expect(() => parseForjaConfig({ ...node, [field]: value }), `${field}: ${value}`).toThrow();
    }
    expect(() => parseForjaConfig({ ...node, tests: ["e2e-mobile"] })).toThrow();
    expect(() => parseForjaConfig({ ...node, extras: ["husky"] })).toThrow();
  });

  it("a Java backend uses npm: its root scripts call it", () => {
    expect(() => parseForjaConfig({ ...defaultJavaConfig("shop", "spring"), pm: "pnpm" })).toThrow(/npm/);
  });

  it("e2e-web needs the web app", () => {
    const node = defaultConfig("acme");
    expect(parseForjaConfig({ ...node, tests: ["unit", "e2e-web"] }).tests).toContain("e2e-web");
    expect(() => parseForjaConfig({ ...node, platforms: ["mobile"], auth: "none", tests: ["e2e-web"] })).toThrow(
      /add web/,
    );
    const api = { ...defaultJavaConfig("shop", "spring"), platforms: [] };
    expect(() => parseForjaConfig({ ...api, tests: ["e2e-web"] })).toThrow(/add web/);
  });

  it("docker is a Java extra: a Node project gets compose with --db postgres-docker", () => {
    const node = defaultConfig("acme");
    expect(() => parseForjaConfig({ ...node, extras: ["docker"] })).toThrow(/docker/);
  });

  it("a configuration error reads as one line per problem", () => {
    try {
      parseForjaConfig({ ...defaultConfig("acme"), platforms: [], db: "supabase" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      const text = formatConfigError(error as ZodError);
      expect(text).toMatch(/^ {2}db: /m);
    }
  });
});
