import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | null = null;

/** Lazy connection: importing this module without DATABASE_URL set does not blow up. */
export function getDb(): Db {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Use the in-memory repositories instead.");
  }
  if (!cached) {
    const client = postgres(env.DATABASE_URL);
    cached = drizzle(client, { schema });
  }
  return cached;
}
