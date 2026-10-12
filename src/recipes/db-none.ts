import { defineRecipe } from "./types.js";

/**
 * db = "none": the in-memory repositories from core-hexagonal are enough.
 * Nothing to add here — which is exactly the point of the hexagon.
 */
export default defineRecipe({
  id: "db-none",
  apply() {},
});
