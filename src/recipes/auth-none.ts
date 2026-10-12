import { defineRecipe } from "./types.js";

/** auth = "none": the minimal container from core-hexagonal is enough. */
export default defineRecipe({
  id: "auth-none",
  apply() {},
});
