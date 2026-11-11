import { and, eq, isNull, lt, or } from "drizzle-orm";
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

export async function findWebSessionsRevokedAt(id: number): Promise<Date | null> {
  const [row] = await db
    .select({ revokedAt: users.webSessionsRevokedAt })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return row?.revokedAt ?? null;
}

// Only moves forward, so a repeated or out-of-order webhook is a no-op.
export async function revokeWebSessions(openUserId: string, at: Date): Promise<boolean> {
  const [result] = await db
    .update(users)
    .set({ webSessionsRevokedAt: at })
    .where(
      and(
        eq(users.wasaaOpenUserId, openUserId),
        or(isNull(users.webSessionsRevokedAt), lt(users.webSessionsRevokedAt, at)),
      ),
    );
  return (result as { affectedRows?: number }).affectedRows ? true : false;
}
