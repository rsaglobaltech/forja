import { isJava, type ForjaConfig } from "../config/schema.js";
import type { Recipe } from "../recipes/types.js";
import { recipeRegistry } from "../recipes/registry.js";

/**
 * ForjaConfig → the ordered list of recipes to apply.
 *
 * The order is fixed and written by hand (§7 of the spec): the real dependency
 * graph is small. If it grows, this is where a topological sort over
 * `requires`/`conflictsWith` would go.
 *
 * Every value reaching here has passed the schema, which accepts only what a
 * recipe implements — so there is nothing left to reject.
 *
 * Order rules that matter:
 * - "web"/"mobile" before "auth-*": auth-sessions replaces
 *   apps/mobile/app/_layout.tsx (it needs the AuthProvider version) and adds
 *   API routes to apps/web — the base `package.json` files must exist first.
 * - "web"/"mobile" before "design-tailwind": the app recipes create their
 *   `package.json` from scratch (copyFile); design-tailwind only merges
 *   dependencies on top. The other way round, the copy would overwrite the merge.
 */
export function planRecipes(config: ForjaConfig): Recipe[] {
  if (isJava(config)) return toRecipes(planJava(config));

  const ids: string[] = ["base", "shared", "core-hexagonal"];
  ids.push(config.db === "postgres-docker" ? "db-postgres-docker" : "db-none");

  if (config.platforms.includes("web")) ids.push("web");
  if (config.platforms.includes("mobile")) ids.push("mobile");

  ids.push(config.auth === "sessions" ? "auth-sessions" : "auth-none");
  if (config.auth !== "none") ids.push("mailer-console");

  if (config.design === "tailwind") ids.push("design-tailwind");
  if (config.tests.includes("e2e-web")) ids.push("e2e-web");
  if (config.extras.includes("lint")) ids.push("extras-lint");
  if (config.extras.includes("ci")) ids.push("ci");
  if (config.extras.includes("specgate")) ids.push("specgate");

  return toRecipes(ids);
}

/**
 * Java backend (spring | quarkus): the logic lives in apps/api; the web app
 * (optional) is a client of that API. Order: the base and the API first; the
 * web app before design-tailwind (which merges into its package.json); the
 * extras last, because they read what the others generated.
 */
export function planJava(config: ForjaConfig): string[] {
  const ids = ["base", `api-${config.backend}`];
  if (config.db === "postgres-docker" || config.auth === "oauth2") ids.push("compose");
  if (config.auth === "oauth2") ids.push("keycloak");
  if (config.platforms.includes("web")) {
    ids.push("shared", "web-java");
    if (config.design === "tailwind") ids.push("design-tailwind");
    if (config.tests.includes("e2e-web")) ids.push("e2e-web");
  }
  for (const extra of config.extras) {
    if (extra === "lint" && config.platforms.includes("web")) ids.push("extras-lint");
    if (extra === "ci") ids.push("ci");
    if (extra === "docker") ids.push("docker-java");
    if (extra === "specgate") ids.push("specgate");
  }
  return ids;
}

function toRecipes(ids: string[]): Recipe[] {
  return ids.map((id) => {
    const recipe = recipeRegistry[id];
    if (!recipe) throw new Error(`Unknown recipe: "${id}"`);
    return recipe;
  });
}
