import { defineRecipe } from "./types.js";
import { javaData } from "./java.js";

/** Development docker-compose with whatever the configuration needs (Postgres, Keycloak). */
export default defineRecipe({
  id: "compose",
  apply(ctx) {
    ctx.copyFile("compose/docker-compose.yml.ejs", "docker-compose.yml", javaData(ctx));
  },
});
