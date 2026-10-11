import { randomBytes } from "node:crypto";
import { defineRecipe } from "./types.js";

/** Web Next.js 16 que consume la API Java (apps/api). Con auth = oauth2, login con Keycloak vía Auth.js. */
export default defineRecipe({
  id: "web-java",
  apply(ctx) {
    const oauth2 = ctx.config.auth === "oauth2";
    const data = { backendName: ctx.config.backend === "spring" ? "Spring Boot" : "Quarkus" };
    ctx.copyDir("web-java/base", "apps/web", data);
    ctx.copyDir(oauth2 ? "web-java/oauth2" : "web-java/noauth", "apps/web", data);
    if (ctx.config.design !== "tailwind") ctx.copyFile("web/app/globals.css", "apps/web/app/globals.css");

    const env: [string, string, string][] = [
      ["API_URL", "http://127.0.0.1:8080", "La API Java (apps/api). 127.0.0.1 y no localhost: Node prueba antes IPv6 (::1)."],
    ];
    if (oauth2) {
      env.push(
        ["AUTH_URL", "http://localhost:3000", "URL pública de la web."],
        ["AUTH_SECRET", "", "Cifra la cookie de sesión: `npx auth secret` o `openssl rand -base64 32`."],
        ["AUTH_KEYCLOAK_ID", "web", "Cliente OIDC (infra/keycloak)."],
        ["AUTH_KEYCLOAK_SECRET", "dev-web-secret", "Secreto del cliente: el de desarrollo; en producción, el real."],
        ["AUTH_KEYCLOAK_ISSUER", `http://localhost:8180/realms/${ctx.config.name}`, "Emisor OIDC."],
      );
    }
    const render = (secret: string) =>
      env.map(([k, v, c]) => `# ${c}\n${k}=${k === "AUTH_SECRET" ? secret : v}`).join("\n\n") + "\n";
    ctx.write("apps/web/.env.example", render(""));
    // .env.local (ignorado por git): listo para `npm run dev:web` sin tocar nada.
    ctx.write("apps/web/.env.local", render(randomBytes(32).toString("base64")));
  },
});
