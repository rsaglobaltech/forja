import { describe, expect, it } from "vitest";
import { defaultJavaConfig, parseForjaConfig, type ForjaConfig } from "../src/config/schema.js";
import { planRecipes } from "../src/engine/planner.js";
import { renderProject } from "../src/engine/renderer.js";

async function render(over: Partial<ForjaConfig>, backend: "spring" | "quarkus" = "spring") {
  const config = parseForjaConfig({ ...defaultJavaConfig("acme-app", backend), javaPackage: "com.acme.app", ...over });
  const { vol, tree, executables } = await renderProject(config, planRecipes(config));
  const files = vol.toJSON() as Record<string, string>;
  const read = (p: string) => files[`/${p}`];
  return { tree, read, files, executables };
}

const combos: [string, "spring" | "quarkus", Partial<ForjaConfig>][] = [];
for (const backend of ["spring", "quarkus"] as const) {
  for (const db of ["postgres-docker", "none"] as const) {
    for (const auth of ["oauth2", "none"] as const) {
      for (const archunit of [true, false]) {
        for (const platforms of [["web"], []] as ForjaConfig["platforms"][]) {
          combos.push([`${backend} ${db} ${auth} archunit=${archunit} web=${platforms.length > 0}`, backend,
            { db, auth, archunit, platforms }]);
        }
      }
    }
  }
}

describe("Java rendering", () => {
  it.each(combos)("%s: no template leftovers and the package in place", async (_, backend, over) => {
    const { tree, files, executables } = await render(over, backend);
    for (const [path, content] of Object.entries(files)) {
      expect(path, path).not.toContain("__pkg__");
      if (content === null) continue;
      expect(content, path).not.toMatch(/<%[=_-]?|%>/);
    }
    expect(tree).toContain("apps/api/src/main/java/com/acme/app/tasks/domain/Task.java");
    expect(tree).toContain("apps/api/src/test/java/com/acme/app/StartupTest.java");
    expect(executables).toContain("apps/api/mvnw");
    expect(tree.includes("apps/api/src/test/java/com/acme/app/ArchitectureTest.java")).toBe(over.archunit);
    expect(tree.includes("apps/web/package.json")).toBe((over.platforms ?? []).length > 0);
    expect(tree.includes("infra/keycloak/acme-app-realm.json")).toBe(over.auth === "oauth2");
  });

  it("domain and application import nothing from the framework", async () => {
    for (const backend of ["spring", "quarkus"] as const) {
      const { files } = await render({}, backend);
      for (const [path, content] of Object.entries(files)) {
        if (!/\/(domain|application)\/.*\.java$/.test(path) || path.includes("/test/")) continue;
        expect(content, path).not.toMatch(/import (org\.springframework|io\.quarkus|jakarta)\./);
      }
    }
  });

  it("Spring pom: dependencies follow the options", async () => {
    const full = (await render({})).read("apps/api/pom.xml");
    expect(full).toContain("spring-boot-starter-security-oauth2-resource-server");
    expect(full).toContain("testcontainers-postgresql");
    expect(full).toContain("archunit-junit5");
    const min = (await render({ db: "none", auth: "none", archunit: false, platforms: [] })).read("apps/api/pom.xml");
    expect(min).not.toMatch(/oauth2|testcontainers|archunit|flyway/);
  });

  it("Quarkus pom: dependencies follow the options", async () => {
    const full = (await render({}, "quarkus")).read("apps/api/pom.xml");
    expect(full).toContain("<packaging>quarkus</packaging>");
    expect(full).toMatch(/quarkus-oidc[\s\S]*quarkus-flyway|quarkus-flyway[\s\S]*quarkus-oidc/);
    expect(full).toContain("quarkus-test-security");
    const min = (await render({ db: "none", auth: "none", archunit: false }, "quarkus")).read("apps/api/pom.xml");
    expect(min).not.toMatch(/oidc|flyway|archunit/);
  });

  it("the Keycloak realm is valid JSON and the web client points at the web app", async () => {
    const realm = JSON.parse((await render({})).read("infra/keycloak/acme-app-realm.json"));
    expect(realm.realm).toBe("acme-app");
    const web = realm.clients.find((c: { clientId: string }) => c.clientId === "web");
    expect(web.redirectUris).toContain("http://localhost:3000/*");
  });

  it("the OAuth2 web app uses Auth.js and never puts the access token in the session", async () => {
    const { read } = await render({});
    expect(read("apps/web/package.json")).toContain("next-auth");
    const auth = read("apps/web/auth.ts");
    expect(auth).toMatch(/session\(\{ session, token \}\)/);
    expect(auth.split("session({ session, token })")[1].split("authorized")[0]).not.toContain("accessToken");
    expect(read("apps/web/.env.local")).toMatch(/AUTH_SECRET=.{40,}/);
    expect(read("apps/web/.env.example")).toMatch(/AUTH_SECRET=\n/);
  });

  it("Specgate: brief, guide, scripts and CI job", async () => {
    const { read } = await render({ extras: ["lint", "ci", "docker", "specgate"] });
    expect(read("docs/brief.md")).toContain("surfaces: [api, web]");
    expect(JSON.parse(read("package.json")).devDependencies["@rsaglobaltech/specgate"]).toMatch(/^\^0\./);
    expect(read(".github/workflows/ci.yml")).toContain("specgate");
  });

  it("forja.config.json reflects the configuration", async () => {
    const cfg = JSON.parse((await render({}, "quarkus")).read("forja.config.json"));
    expect(cfg).toMatchObject({ backend: "quarkus", javaPackage: "com.acme.app", archunit: true, auth: "oauth2" });
  });
});
