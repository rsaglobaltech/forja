import { defineRecipe } from "./types.js";
import { isJava } from "../config/schema.js";
import { versions } from "./java.js";

/**
 * Ready for Specgate: the client's brief (docs/brief.md), the day-to-day guide
 * and the scripts. The adoption itself (`specgate init`) runs in postinstall,
 * because it writes its own files.
 */
export default defineRecipe({
  id: "specgate",
  apply(ctx) {
    const web = ctx.config.platforms.includes("web") || !isJava(ctx.config);
    ctx.copyFile("specgate/docs/brief.md.ejs", "docs/brief.md", { web });
    ctx.copyFile("specgate/docs/specgate.md.ejs", "docs/specgate.md", { web, java: isJava(ctx.config) });
    ctx.mergePackageJson(".", {
      devDependencies: { "@rsaglobaltech/specgate": `^${versions.specgate}` },
      scripts: {
        spec: "specgate",
        "spec:status": "specgate status",
        "spec:check": "specgate check",
      },
    });
  },
});
