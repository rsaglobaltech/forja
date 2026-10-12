import { isJava } from "../config/schema.js";
import { defineRecipe } from "./types.js";

/**
 * `--tests e2e-web`: Playwright in apps/web. A smoke test of the home page
 * and, depending on the project, the sign-in flow — Node sessions (register,
 * sign out, sign in) or, with a Java API, a task through the API and Keycloak.
 */
export default defineRecipe({
  id: "e2e-web",
  apply(ctx) {
    const java = isJava(ctx.config);
    const data = {
      java,
      oauth2: ctx.config.auth === "oauth2",
      backendName: ctx.config.backend === "quarkus" ? "Quarkus" : "Spring Boot",
      healthPath: ctx.config.backend === "quarkus" ? "/q/health" : "/actuator/health",
    };

    ctx.copyFile("e2e-web/playwright.config.ts.ejs", "apps/web/playwright.config.ts", data);
    ctx.copyFile("e2e-web/e2e/smoke.spec.ts.ejs", "apps/web/e2e/smoke.spec.ts", data);
    if (java) ctx.copyFile("e2e-web/e2e/tasks.spec.ts.ejs", "apps/web/e2e/tasks.spec.ts", data);
    else if (ctx.config.auth === "sessions") ctx.copyFile("e2e-web/e2e/auth.spec.ts.ejs", "apps/web/e2e/auth.spec.ts", data);

    ctx.mergePackageJson("apps/web", {
      // 1.63: the newest release that has been out for more than two weeks.
      devDependencies: { "@playwright/test": "~1.63.0" },
      scripts: { "test:e2e": "playwright test" },
    });
    ctx.mergePackageJson(".", {
      scripts: { "test:e2e": "npm run test:e2e --workspace apps/web" },
    });
  },
});
