import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | null = null;

/** Conexión perezosa: importar este módulo sin DATABASE_URL seteada no explota. */
export function getDb(): Db {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL no está seteada. Usá los repositorios in-memory en su lugar.");
  }
  if (!cached) {
    const client = postgres(env.DATABASE_URL);
    cached = drizzle(client, { schema });
  }
  return cached;
}
