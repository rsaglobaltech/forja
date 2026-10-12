import { defineRecipe } from "./types.js";
import { isJava } from "../config/schema.js";
import { versions } from "./java.js";

/** GitHub Actions: the Java API (Maven), the web/app (Node) and, with Specgate, the specification. */
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
