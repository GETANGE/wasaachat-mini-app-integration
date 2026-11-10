import { eq } from "drizzle-orm";
import { db } from "../config/db.ts";
import { users } from "../models/schema.ts";

export const publicUserColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  emailVerified: users.emailVerified,
  createdAt: users.createdAt,
};

export async function findPublicById(id: number) {
  const [user] = await db
    .select(publicUserColumns)
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return user;
}

export async function findByWasaaOpenUserId(openUserId: string) {
  const [user] = await db
    .select(publicUserColumns)
    .from(users)
    .where(eq(users.wasaaOpenUserId, openUserId))
    .limit(1);

  return user;
}

export async function createWasaaUser(input: {
  name: string;
  wasaaOpenUserId: string;
}) {
  const [created] = await db.insert(users).values(input).$returningId();
  return created!.id;
}

export async function updateName(id: number, name: string) {
  await db.update(users).set({ name }).where(eq(users.id, id));
}
