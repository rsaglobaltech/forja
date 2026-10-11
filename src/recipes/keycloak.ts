import { defineRecipe } from "./types.js";

/** Realm de Keycloak de desarrollo: cliente `web` (Auth.js), cliente `dev-cli` y usuarios demo/otra. */
export default defineRecipe({
  id: "keycloak",
  apply(ctx) {
    ctx.copyFile("keycloak/realm.json.ejs", `infra/keycloak/${ctx.config.name}-realm.json`);
  },
});
