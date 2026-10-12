import { randomBytes } from "node:crypto";
import { defineRecipe } from "./types.js";

/** Next.js 16 web app that consumes the Java API (apps/api). With auth = oauth2, it logs in with Keycloak through Auth.js. */
export default defineRecipe({
  id: "web-java",
  apply(ctx) {
    const oauth2 = ctx.config.auth === "oauth2";
    const data = { backendName: ctx.config.backend === "spring" ? "Spring Boot" : "Quarkus" };
    ctx.copyDir("web-java/base", "apps/web", data);
    ctx.copyDir(oauth2 ? "web-java/oauth2" : "web-java/noauth", "apps/web", data);
    if (ctx.config.design !== "tailwind") ctx.copyFile("web/app/globals.css", "apps/web/app/globals.css");

    const env: [string, string, string][] = [
      ["API_URL", "http://127.0.0.1:8080", "The Java API (apps/api). 127.0.0.1 rather than localhost: Node tries IPv6 (::1) first."],
    ];
    if (oauth2) {
      env.push(
        ["AUTH_URL", "http://localhost:3000", "Public URL of the web app."],
        ["AUTH_SECRET", "", "Encrypts the session cookie: `npx auth secret` or `openssl rand -base64 32`."],
        ["AUTH_KEYCLOAK_ID", "web", "OIDC client (infra/keycloak)."],
        ["AUTH_KEYCLOAK_SECRET", "dev-web-secret", "Client secret: the development one here; the real one in production."],
        ["AUTH_KEYCLOAK_ISSUER", `http://localhost:8180/realms/${ctx.config.name}`, "OIDC issuer."],
      );
    }
    const render = (secret: string) =>
      env.map(([k, v, c]) => `# ${c}\n${k}=${k === "AUTH_SECRET" ? secret : v}`).join("\n\n") + "\n";
    ctx.write("apps/web/.env.example", render(""));
    // .env.local (ignored by git): ready for `npm run dev:web` with no edits.
    ctx.write("apps/web/.env.local", render(randomBytes(32).toString("base64")));
  },
});
