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
      expect(steps.some((s) => s.includes("specgate adopt"))).toBe(false);
    }
  });

  it("when forja could not adopt Specgate, it says how", () => {
    const steps = nextSteps(defaultJavaConfig("acme", "quarkus"), false, {
      specgateAdopted: false,
    });
    expect(steps).toContain("npx specgate adopt --no-capabilities");
  });
});

describe("the agent that builds", () => {
  it("when forja could not set the agent, the next steps say how — or to choose it in the studio", () => {
    const steps = nextSteps(defaultJavaConfig("acme", "spring"), true, {
      specgateAdopted: true,
      agentConfigured: false,
    });
    expect(steps.some((s) => s.startsWith('npx specgate config set agent "claude -p < {prompt_file}"'))).toBe(true);
    expect(steps.some((s) => s.includes("specgate studio"))).toBe(true);
  });

  it("when forja set it, no step asks for it", () => {
    const steps = nextSteps(defaultJavaConfig("acme", "spring"), true, {
      specgateAdopted: true,
      agentConfigured: true,
    });
    expect(steps.some((s) => s.includes("config set agent"))).toBe(false);
  });

  it("finds Claude Code on the PATH the way the studio does", async () => {
    const { agentOnPath } = await import("../src/engine/postinstall.js");
    expect(await agentOnPath("claude", async () => ({ exitCode: 0 }))).toBe(true);
    expect(await agentOnPath("claude", async () => { throw new Error("not found"); })).toBe(false);
  });
});
