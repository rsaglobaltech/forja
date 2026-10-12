import { defineRecipe } from "./types.js";

/** Production Dockerfiles: the API (Spring or Quarkus, multi-stage, unprivileged user) and the standalone web app. */
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
