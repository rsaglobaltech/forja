import { defineRecipe } from "./types.js";

export default defineRecipe({
  id: "db-postgres-docker",
  apply(ctx) {
    const dbName = ctx.config.name.replace(/-/g, "_");

    ctx.copyFile("db-postgres-docker/docker-compose.yml.ejs", "docker-compose.yml");
    ctx.copyFile("db-postgres-docker/drizzle.config.ts.ejs", "packages/core/drizzle.config.ts");
    ctx.copyDir("db-postgres-docker/packages/core/src", "packages/core/src");

    ctx.mergePackageJson("packages/core", {
      dependencies: {
        "drizzle-orm": "^0.38.3",
        postgres: "^3.4.5",
      },
      devDependencies: {
        "drizzle-kit": "^0.30.1",
      },
      scripts: {
        "db:push": "drizzle-kit push",
        "db:studio": "drizzle-kit studio",
      },
    });

    ctx.mergePackageJson(".", {
      scripts: {
        "db:push": "npm run db:push --workspace packages/core",
      },
    });

    ctx.addEnv(
      "DATABASE_URL",
      `postgresql://postgres:postgres@localhost:5432/${dbName}`,
      undefined,
      "base de datos (postgres-docker)",
    );
  },
});
