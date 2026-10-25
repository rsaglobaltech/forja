import { defineRecipe } from "./types.js";
import { isJava } from "../config/schema.js";
import { javaData } from "./java.js";

export default defineRecipe({
  id: "base",
  apply(ctx) {
    if (isJava(ctx.config)) return applyJava(ctx);
    ctx.copyFile("base/gitignore", ".gitignore");
    ctx.copyFile("base/.editorconfig", ".editorconfig");
    ctx.copyFile("base/tsconfig.base.json", "tsconfig.base.json");
    ctx.copyFile("base/README.md.ejs", "README.md");
    ctx.copyFile("base/docs/architecture.md.ejs", "docs/architecture.md");

    ctx.mergePackageJson(".", {
      name: ctx.config.name,
      private: true,
      version: "0.1.0",
      workspaces: ["apps/*", "packages/*"],
      scripts: {
        test: "npm run test --workspaces --if-present",
        typecheck: "npm run typecheck --workspaces --if-present",
      },
    });
    // pnpm ignores package.json "workspaces": without this file it installs
    // only the root. linkWorkspacePackages lets the "*" internal deps resolve
    // to the local packages, so npm and pnpm read the same package.json.
    if (ctx.config.pm === "pnpm") {
      ctx.write(
        "pnpm-workspace.yaml",
        'packages:\n  - "apps/*"\n  - "packages/*"\nlinkWorkspacePackages: true\n',
      );
    }

    ctx.write(
      "forja.config.json",
      JSON.stringify(
        { version: 1, ...ctx.config },
        null,
        2,
      ) + "\n",
    );
  },
});

function applyJava(ctx: Parameters<Parameters<typeof defineRecipe>[0]["apply"]>[0]): void {
  const web = ctx.config.platforms.includes("web");
  const data = {
    ...javaData(ctx),
    web,
    compose: ctx.config.db === "postgres-docker" || ctx.config.auth === "oauth2",
    backendName: ctx.config.backend === "spring" ? "Spring Boot" : "Quarkus",
  };
  ctx.write(".gitignore", (ctx.read(".gitignore") ?? "") + JAVA_GITIGNORE);
  ctx.copyFile("base/.editorconfig", ".editorconfig");
  ctx.copyFile("base/java/README.md.ejs", "README.md", data);
  ctx.copyFile("base/java/architecture.md.ejs", "docs/architecture.md", data);
  if (web) ctx.copyFile("base/tsconfig.base.json", "tsconfig.base.json");

  const api = "cd apps/api && ./mvnw";
  ctx.mergePackageJson(".", {
    name: ctx.config.name,
    private: true,
    version: "0.1.0",
    ...(web ? { workspaces: ["apps/web", "packages/*"] } : {}),
    scripts: {
      test: web ? "npm run test:api && npm run test:web" : "npm run test:api",
      "test:api": `${api} -q -B verify`,
      // ArchUnit on its own: what Specgate's gate runs as arch_cmd, before the tests.
      ...(ctx.config.archunit
        ? { arch: `${api} -q -B test -Dtest=ArchitectureTest -Dsurefire.failIfNoSpecifiedTests=false` }
        : {}),
      "dev:api": ctx.config.backend === "spring" ? `${api} spring-boot:run` : `${api} quarkus:dev`,
      ...(web ? { "test:web": "npm run typecheck --workspaces --if-present && npm run build --workspace apps/web",
        "dev:web": "npm run dev --workspace apps/web" } : {}),
    },
  });

  ctx.write("forja.config.json", JSON.stringify({ version: 1, ...ctx.config },
    null, 2) + "\n");
}

const JAVA_GITIGNORE = `node_modules/
.next/
target/
*.log
.DS_Store
.env
.env.local
.idea/
*.iml
.vscode/
.quarkus/
`;
