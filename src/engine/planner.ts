import { isJava, type ForjaConfig } from "../config/schema.js";
import type { Recipe } from "../recipes/types.js";
import { recipeRegistry } from "../recipes/registry.js";

/**
 * ForjaConfig → lista ordenada de recipes a aplicar.
 * El orden es fijo y a mano (sección 7): alcanza para v0.1 porque el grafo
 * de dependencias real es chico. Si esto crece, acá es donde iría un
 * topological sort sobre `requires`/`conflictsWith`.
 *
 * Reglas de orden que importan (no son arbitrarias):
 * - "web"/"mobile" van antes que "auth-*": auth-sessions pisa
 *   apps/mobile/app/_layout.tsx (necesita la versión con AuthProvider) y
 *   agrega rutas API sobre apps/web — tienen que existir los `package.json`
 *   base primero.
 * - "web"/"mobile" van antes que "design-tailwind": los recipes de app
 *   crean su `package.json` desde cero (copyFile); design-tailwind solo
 *   mergea deps encima. Al revés, el copyFile de la app pisaría el merge.
 */
export function planRecipes(config: ForjaConfig): Recipe[] {
  if (isJava(config)) return toRecipes(planJava(config));
  const ids: string[] = ["base", "shared"];

  if (config.arch === "hexagonal") {
    ids.push("core-hexagonal");
  } else {
    throw new UnsupportedOptionError("arch", config.arch, "v0.2");
  }

  switch (config.db) {
    case "postgres-docker":
      ids.push("db-postgres-docker");
      break;
    case "none":
      ids.push("db-none");
      break;
    default:
      throw new UnsupportedOptionError("db", config.db, "v0.2");
  }

  if (config.ui === "shadcn") {
    throw new UnsupportedOptionError("ui", config.ui, "v0.2");
  }

  if (config.platforms.includes("web")) ids.push("web");
  if (config.platforms.includes("mobile")) ids.push("mobile");

  switch (config.auth) {
    case "sessions":
      ids.push("auth-sessions");
      break;
    case "none":
      ids.push("auth-none");
      break;
    default:
      throw new UnsupportedOptionError("auth", config.auth, "v0.2");
  }

  if (config.auth !== "none") {
    switch (config.mailer) {
      case "console":
        ids.push("mailer-console");
        break;
      default:
        throw new UnsupportedOptionError("mailer", config.mailer, "v0.2");
    }
  }

  if (config.design === "tailwind") {
    ids.push("design-tailwind");
  }

  if (config.extras.includes("lint")) ids.push("extras-lint");
  if (config.extras.includes("ci")) ids.push("ci");
  // "docker": docker-compose.yml ya lo genera db-postgres-docker sin pedirlo
  // aparte (no tendría sentido Compose sin Postgres en v0.1); no-op acá.
  for (const extra of ["husky", "i18n", "trigger", "ai", "storybook"] as const) {
    if (config.extras.includes(extra)) throw new UnsupportedOptionError("extras", extra, "v0.2");
  }

  for (const test of config.tests) {
    if (test === "e2e-web" || test === "e2e-mobile") {
      throw new UnsupportedOptionError("tests", test, "v0.2");
    }
  }

  if (config.extras.includes("specgate")) ids.push("specgate");

  return toRecipes(ids);
}

/**
 * Backend Java (spring | quarkus): la lógica vive en apps/api; la web (opcional) es un cliente de esa API.
 * Orden: la base y la API primero; la web antes que design-tailwind (que mergea sobre su package.json);
 * los extras al final, porque leen lo que generaron los demás.
 */
export function planJava(config: ForjaConfig): string[] {
  const ids = ["base", `api-${config.backend}`];
  if (config.db === "postgres-docker" || config.auth === "oauth2") ids.push("compose");
  if (config.auth === "oauth2") ids.push("keycloak");
  if (config.platforms.includes("web")) {
    ids.push("shared", "web-java");
    if (config.design === "tailwind") ids.push("design-tailwind");
  }
  for (const extra of config.extras) {
    switch (extra) {
      case "lint":
        if (config.platforms.includes("web")) ids.push("extras-lint");
        break;
      case "ci":
        ids.push("ci");
        break;
      case "docker":
        ids.push("docker-java");
        break;
      case "specgate":
        ids.push("specgate");
        break;
      default:
        throw new UnsupportedOptionError("extras", extra, "v0.3");
    }
  }
  for (const test of config.tests) {
    if (test === "e2e-mobile") throw new UnsupportedOptionError("tests", test, "v0.3");
  }
  return ids;
}

function toRecipes(ids: string[]): Recipe[] {
  return ids.map((id) => {
    const recipe = recipeRegistry[id];
    if (!recipe) throw new Error(`Recipe desconocida: "${id}"`);
    return recipe;
  });
}

export class UnsupportedOptionError extends Error {
  constructor(field: string, value: string, availableFrom: string) {
    super(`"${field}: ${value}" todavía no está implementado. Llega en ${availableFrom}.`);
    this.name = "UnsupportedOptionError";
  }
}
