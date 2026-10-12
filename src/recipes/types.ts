import type { RecipeContext } from "../engine/context.js";

export interface Recipe {
  id: string;
  /** Ids (or "core-*" patterns) that must be applied before this one. */
  requires?: string[];
  conflictsWith?: string[];
  apply(ctx: RecipeContext): void | Promise<void>;
}

export function defineRecipe(recipe: Recipe): Recipe {
  return recipe;
}
