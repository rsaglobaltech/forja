import { describe, expect, it } from "vitest";
import { defaultConfig, defaultJavaConfig } from "../src/config/schema.js";
import { alignComments, nextSteps } from "../src/engine/postinstall.js";

describe("next steps", () => {
  it("puts every comment in one column, whatever recipe wrote the line", () => {
    const out = alignComments([
      "npm test   # unit",
      "npx specgate draft      # the brief",
      "cd app",
    ]);
    expect(out[0].indexOf("#")).toBe(out[1].indexOf("#"));
    expect(out[2]).toBe("cd app");
  });

  it("with Specgate, the next step is the brief: specgate draft", () => {
    for (const config of [
      { ...defaultConfig("acme"), extras: ["specgate" as const] },
      defaultJavaConfig("acme", "spring"),
    ]) {
      const steps = nextSteps(config, true, { specgateAdopted: true });
      expect(steps.some((s) => s.startsWith("npx specgate draft"))).toBe(true);
      expect(steps.some((s) => s.includes("specgate init"))).toBe(false);
    }
  });

  it("when forja could not adopt Specgate, it says how", () => {
    const steps = nextSteps(defaultJavaConfig("acme", "quarkus"), false, {
      specgateAdopted: false,
    });
    expect(steps).toContain("npx specgate init --no-capabilities");
  });
});
