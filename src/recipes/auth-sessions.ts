import { defineRecipe } from "./types.js";

export default defineRecipe({
  id: "auth-sessions",
  apply(ctx) {
    ctx.mergePackageJson("packages/core", {
      dependencies: {
        bcryptjs: "^3.0.0",
      },
      devDependencies: {
        "@types/bcryptjs": "^2.4.6",
      },
    });

    if (ctx.has("integration")) {
      ctx.copyDir(
        "auth-sessions/packages/core/tests/integration",
        "packages/core/tests/integration",
      );
    }

    ctx.addEnv("SESSION_TTL_DAYS", "30", "Cuánto vive una sesión sin tocarla.", "auth (sessions)");

    if (ctx.has("web")) {
      ctx.copyFile("auth-sessions/apps/web/lib/session.ts.ejs", "apps/web/lib/session.ts");
      ctx.copyFile(
        "auth-sessions/apps/web/src/app/actions/auth.actions.ts.ejs",
        "apps/web/src/app/actions/auth.actions.ts",
      );
      ctx.copyFile("auth-sessions/apps/web/middleware.ts", "apps/web/middleware.ts");

      ctx.copyFile(
        "auth-sessions/apps/web/app/(auth)/login/page.tsx",
        "apps/web/app/(auth)/login/page.tsx",
      );
      ctx.copyFile(
        "auth-sessions/apps/web/app/(auth)/register/page.tsx",
        "apps/web/app/(auth)/register/page.tsx",
      );
      ctx.copyFile(
        "auth-sessions/apps/web/app/(auth)/forgot-password/page.tsx",
        "apps/web/app/(auth)/forgot-password/page.tsx",
      );
      ctx.copyFile(
        "auth-sessions/apps/web/app/(auth)/reset-password/[token]/page.tsx",
        "apps/web/app/(auth)/reset-password/[token]/page.tsx",
      );
      ctx.copyFile("auth-sessions/apps/web/app/(app)/layout.tsx", "apps/web/app/(app)/layout.tsx");
      ctx.copyFile(
        "auth-sessions/apps/web/app/(app)/dashboard/page.tsx.ejs",
        "apps/web/app/(app)/dashboard/page.tsx",
      );
    }

    // El API REST solo lo pide el móvil en v0.1 (el web usa Server Actions
    // directo); si algún día hay backend separado, esto se vuelve incondicional.
    if (ctx.has("mobile")) {
      ctx.copyFile("auth-sessions/apps/web/app/api/_lib/cors.ts", "apps/web/app/api/_lib/cors.ts");
      ctx.copyFile(
        "auth-sessions/apps/web/app/api/_lib/session.ts.ejs",
        "apps/web/app/api/_lib/session.ts",
      );
      for (const route of ["register", "login", "logout", "me", "forgot-password", "reset-password"]) {
        ctx.copyFile(
          `auth-sessions/apps/web/app/api/auth/${route}/route.ts.ejs`,
          `apps/web/app/api/auth/${route}/route.ts`,
        );
      }

      ctx.copyFile("auth-sessions/apps/mobile/lib/auth.tsx", "apps/mobile/lib/auth.tsx");
      ctx.copyFile("auth-sessions/apps/mobile/lib/api.ts.ejs", "apps/mobile/lib/api.ts");
      ctx.copyFile("auth-sessions/apps/mobile/app/_layout.tsx.ejs", "apps/mobile/app/_layout.tsx");
      ctx.copyFile(
        "auth-sessions/apps/mobile/app/(auth)/login.tsx",
        "apps/mobile/app/(auth)/login.tsx",
      );
      ctx.copyFile(
        "auth-sessions/apps/mobile/app/(auth)/register.tsx",
        "apps/mobile/app/(auth)/register.tsx",
      );
      ctx.copyFile(
        "auth-sessions/apps/mobile/app/(auth)/forgot-password.tsx",
        "apps/mobile/app/(auth)/forgot-password.tsx",
      );
      ctx.copyFile(
        "auth-sessions/apps/mobile/app/(auth)/reset-password/[token].tsx",
        "apps/mobile/app/(auth)/reset-password/[token].tsx",
      );
      ctx.copyFile("auth-sessions/apps/mobile/app/(app)/index.tsx", "apps/mobile/app/(app)/index.tsx");
    }
  },
});
