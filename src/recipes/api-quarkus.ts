import { defineRecipe } from "./types.js";
import { copyJava, copyMavenWrapper, javaData } from "./java.js";

/** Java API with Quarkus in apps/api: hexagonal, with the sample `tasks` module. */
export default defineRecipe({
  id: "api-quarkus",
  apply(ctx) {
    const data = javaData(ctx);
    const dest = "apps/api";
    copyMavenWrapper(ctx, dest);
    copyJava(ctx, "api-common", dest, data);
    copyJava(ctx, "api-quarkus/base", dest, data);
    copyJava(ctx, ctx.config.db === "postgres-docker" ? "api-quarkus/postgres" : "api-quarkus/memory", dest, data);
    copyJava(ctx, ctx.config.auth === "oauth2" ? "api-quarkus/oauth2" : "api-quarkus/noauth", dest, data);
    if (ctx.config.archunit) {
      copyJava(ctx, "api-common-archunit", dest, {
        ...data,
        frameworks: `"io.quarkus..", "jakarta..", "org.eclipse.microprofile..", "io.smallrye.."`,
      });
    }
  },
});
