import { defineRecipe } from "./types.js";
import { isJava } from "../config/schema.js";
import { versions } from "./java.js";

/**
 * Preparado para Specgate: la ficha del cliente (docs/brief.md), la guía del día a día y los scripts.
 * La adopción en sí (`specgate init`) la hace postinstall, porque escribe sus propios ficheros.
 */
export default defineRecipe({
  id: "specgate",
  apply(ctx) {
    const web = ctx.config.platforms.includes("web") || !isJava(ctx.config);
    ctx.copyFile("specgate/docs/brief.md.ejs", "docs/brief.md", { web });
    ctx.copyFile("specgate/docs/specgate.md.ejs", "docs/specgate.md", { web });
    ctx.mergePackageJson(".", {
      devDependencies: { "@rsaglobaltech/specgate": `^${versions.specgate}` },
      scripts: {
        "spec:status": "specgate status",
        "spec:check": "specgate check",
      },
    });
  },
});
