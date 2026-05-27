/**
 * Database helpers for Tone Configurations
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { toneConfigurations, InsertToneConfiguration } from "../drizzle/schema";

export async function createToneConfiguration(data: InsertToneConfiguration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(toneConfigurations).values(data);
  const inserted = await db.select().from(toneConfigurations).where(eq(toneConfigurations.toneName, data.toneName)).limit(1);
  return inserted[0];
}

export async function getTonesByPage(pageId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(toneConfigurations).where(eq(toneConfigurations.pageId, pageId));
}

export async function getToneById(toneId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(toneConfigurations).where(eq(toneConfigurations.id, toneId)).limit(1);
  return result[0];
}

export async function getDefaultToneByPage(pageId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(toneConfigurations).where(
    and(eq(toneConfigurations.pageId, pageId), eq(toneConfigurations.isDefault, 1))
  ).limit(1);
  return result[0];
}

export async function updateToneConfiguration(toneId: number, data: Partial<InsertToneConfiguration>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(toneConfigurations).set(data).where(eq(toneConfigurations.id, toneId));
}

export async function deleteToneConfiguration(toneId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(toneConfigurations).where(eq(toneConfigurations.id, toneId));
}

export async function setDefaultTone(pageId: number, toneId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // First, unset all other defaults
  await db.update(toneConfigurations)
    .set({ isDefault: 0 })
    .where(and(eq(toneConfigurations.pageId, pageId), eq(toneConfigurations.isDefault, 1)));
  
  // Then set the new default
  return await db.update(toneConfigurations)
    .set({ isDefault: 1 })
    .where(eq(toneConfigurations.id, toneId));
}
