import { defineRecipe } from "./types.js";

/** Dockerfiles de producción: API (Spring o Quarkus, multi-etapa, usuario sin privilegios) y web standalone. */
export default defineRecipe({
  id: "docker-java",
  apply(ctx) {
    ctx.copyFile(`docker-java/${ctx.config.backend}/Dockerfile`, "apps/api/Dockerfile");
    ctx.copyFile("docker-java/api.dockerignore", "apps/api/.dockerignore");
    if (ctx.config.platforms.includes("web")) {
      ctx.copyFile("docker-java/web/Dockerfile.ejs", "apps/web/Dockerfile");
      ctx.copyFile("docker-java/web.dockerignore", ".dockerignore");
    }
  },
});
