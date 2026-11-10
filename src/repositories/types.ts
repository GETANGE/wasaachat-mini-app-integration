import { db } from "../config/db.ts";

export type Transaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export type Executor = typeof db | Transaction;
