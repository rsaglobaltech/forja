import { defineRecipe } from "./types.js";
import { copyJava, copyMavenWrapper, javaData } from "./java.js";

/** API Java con Spring Boot en apps/api: hexagonal, con el módulo de ejemplo `tasks`. */
export default defineRecipe({
  id: "api-spring",
  apply(ctx) {
    const data = javaData(ctx);
    const dest = "apps/api";
    copyMavenWrapper(ctx, dest);
    copyJava(ctx, "api-common", dest, data);
    copyJava(ctx, "api-spring/base", dest, data);
    copyJava(ctx, ctx.config.db === "postgres-docker" ? "api-spring/postgres" : "api-spring/memory", dest, data);
    copyJava(ctx, ctx.config.auth === "oauth2" ? "api-spring/oauth2" : "api-spring/noauth", dest, data);
    if (ctx.config.archunit) {
      copyJava(ctx, "api-common-archunit", dest, { ...data, frameworks: `"org.springframework..", "jakarta..", "io.swagger.."` });
    }
  },
});
