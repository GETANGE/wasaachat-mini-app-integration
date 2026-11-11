// Applies pending drizzle migrations from ./drizzle using only runtime
// dependencies, so it can run from the production image (Kubernetes init
// container) without drizzle-kit installed.
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const connection = await mysql.createConnection({ uri: databaseUrl });

try {
  await migrate(drizzle(connection), { migrationsFolder: "./drizzle" });
  console.log("Migrations applied");
} finally {
  await connection.end();
}
