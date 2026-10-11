import { defineRecipe } from "./types.js";
import { javaData } from "./java.js";

/** docker-compose de desarrollo con lo que pide la configuración (Postgres, Keycloak). */
export default defineRecipe({
  id: "compose",
  apply(ctx) {
    ctx.copyFile("compose/docker-compose.yml.ejs", "docker-compose.yml", javaData(ctx));
  },
});
