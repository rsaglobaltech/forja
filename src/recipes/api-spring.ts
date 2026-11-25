import { defineRecipe } from "./types.js";
import type { RecipeContext } from "../engine/context.js";
import { copyJava, copyMavenWrapper, javaData, type JavaData } from "./java.js";

/**
 * Java API with Spring Boot in apps/api: hexagonal, with the sample `tasks` module.
 *
 * `reactive` swaps the stack, not the architecture: WebFlux + R2DBC, and the
 * ports and use cases speak Reactor (Mono/Flux). The domain is shared with the
 * servlet stack; `api-common-reactive` overlays the application layer.
 */
export default defineRecipe({
  id: "api-spring",
  apply(ctx) {
    const data = javaData(ctx);
    const dest = "apps/api";
    const stack = ctx.config.reactive ? "api-spring-webflux" : "api-spring";
    copyMavenWrapper(ctx, dest);
    copyJava(ctx, "api-common", dest, data);
    if (ctx.config.reactive) copyJava(ctx, "api-common-reactive", dest, data);
    copyJava(ctx, `${stack}/base`, dest, data);
    copyJava(ctx, ctx.config.db === "postgres-docker" ? `${stack}/postgres` : `${stack}/memory`, dest, data);
    if (ctx.config.reactive && ctx.config.db === "postgres-docker") {
      // One migration for both stacks: Flyway runs it over JDBC either way.
      ctx.copyFile("api-spring/postgres/src/main/resources/db/migration/V1__tasks.sql", `${dest}/src/main/resources/db/migration/V1__tasks.sql`);
    }
    copyJava(ctx, ctx.config.auth === "oauth2" ? `${stack}/oauth2` : `${stack}/noauth`, dest, data);
    if (data.containers && ctx.config.db !== "postgres-docker") {
      // No PostgreSQL, but a vector store of its own to start in the tests.
      const file = `src/test/java/__pkg__/TestcontainersConfiguration.java`;
      ctx.copyFile(`${stack}/postgres/${file}.ejs`, `${dest}/${file.replace("__pkg__", data.pkgPath)}`, data);
    }
    if (data.ai) applyAi(ctx, dest, data);
    if (ctx.config.archunit) {
      const frameworks = `"org.springframework..", "jakarta..", "io.swagger.."`;
      // Reactor is allowed in the application layer (ports return Mono/Flux), never in the domain.
      copyJava(ctx, "api-common-archunit", dest, {
        ...data,
        frameworks,
        domainFrameworks: ctx.config.reactive ? `${frameworks}, "reactor.."` : frameworks,
      });
    }
  },
});

/**
 * Spring AI: the `assistant` module. Same hexagon as `tasks`; the stack decides whether its ports speak
 * Reactor, and the vector store whether it answers from the user's notes (RAG).
 */
function applyAi(ctx: RecipeContext, dest: string, data: JavaData): void {
  const ai = data.ai!;
  const stack = ctx.config.reactive ? "reactive" : "servlet";
  copyJava(ctx, "spring-ai/common", dest, data);
  copyJava(ctx, `spring-ai/${stack}`, dest, data);
  if (ai.store !== "none") {
    copyJava(ctx, "spring-ai/rag", dest, data);
    copyJava(ctx, `spring-ai/rag-${stack}`, dest, data);
  }
  if (ai.store === "pgvector") {
    copyJava(ctx, "spring-ai/pgvector", dest, data);
    if (ctx.config.reactive) copyJava(ctx, "spring-ai/pgvector-reactive", dest, data);
  }
  ctx.copyFile("spring-ai/env.example.ejs", `${dest}/.env.example`, data);
}
