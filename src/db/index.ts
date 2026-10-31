import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: postgres.Sql | undefined;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Please configure Supabase Postgres connection string in your environment.",
    );
  }

  if (!dbInstance) {
    // prepare: false is required for Supavisor transaction pooler (port 6543)
    client = postgres(connectionString, { prepare: false });
    dbInstance = drizzle(client, { schema });
  }

  return dbInstance;
}

export * from "./schema";
