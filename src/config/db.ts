import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../models/schema.ts";

function createConnection() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = mysql.createPool({
    uri: databaseUrl,
    connectionLimit: Number(process.env.DB_POOL_SIZE ?? 10),
    waitForConnections: true,
  });

  const db = drizzle(pool, { schema, mode: "default" });

  return { pool, db };
}

type Connection = ReturnType<typeof createConnection>;

let connection: Connection | undefined;

function getConnection(): Connection {
  connection ??= createConnection();
  return connection;
}

function lazyProxy<T extends object>(pick: (connection: Connection) => T): T {
  return new Proxy({} as T, {
    get(_target, property) {
      const source = pick(getConnection());
      const value = Reflect.get(source, property);
      return typeof value === "function" ? value.bind(source) : value;
    },
  });
}

export const pool = lazyProxy((current) => current.pool);
export const db = lazyProxy((current) => current.db);
