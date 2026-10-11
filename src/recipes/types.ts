import type { RecipeContext } from "../engine/context.js";

export interface Recipe {
  id: string;
  /** ids (o patrones "core-*") que deben aplicarse antes que esta. */
  requires?: string[];
  conflictsWith?: string[];
  apply(ctx: RecipeContext): void | Promise<void>;
}

export function defineRecipe(recipe: Recipe): Recipe {
  return recipe;
}
