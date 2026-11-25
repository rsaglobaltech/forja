import { defineRecipe } from "./types.js";
import { copyJava, copyMavenWrapper, javaData } from "./java.js";

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
