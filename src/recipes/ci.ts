import { defineRecipe } from "./types.js";
import { isJava } from "../config/schema.js";
import { versions } from "./java.js";

/** GitHub Actions: API Java (Maven), web/app (Node) y, con Specgate, la especificación. */
export default defineRecipe({
  id: "ci",
  apply(ctx) {
    ctx.copyFile("ci/ci.yml.ejs", ".github/workflows/ci.yml", {
      java: isJava(ctx.config),
      web: ctx.config.platforms.includes("web"),
      backendName: ctx.config.backend === "quarkus" ? "Quarkus" : "Spring Boot",
      versions,
    });
  },
});
