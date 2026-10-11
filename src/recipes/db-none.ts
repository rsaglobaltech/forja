import { defineRecipe } from "./types.js";

/**
 * db = "none": los repositorios in-memory de core-hexagonal ya alcanzan.
 * No hay nada que agregar acá — es justo el punto del hexágono.
 */
export default defineRecipe({
  id: "db-none",
  apply() {},
});
