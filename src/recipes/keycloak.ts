import { defineRecipe } from "./types.js";

/** Development Keycloak realm: the `web` client (Auth.js), the `dev-cli` client and the demo/other users. */
export default defineRecipe({
  id: "keycloak",
  apply(ctx) {
    ctx.copyFile("keycloak/realm.json.ejs", `infra/keycloak/${ctx.config.name}-realm.json`);
  },
});
