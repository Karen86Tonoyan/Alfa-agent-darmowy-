/**
 * Database helpers for Skills, Knowledge Base, and Filters
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import {
  skills,
  InsertSkill,
  knowledgeBase,
  InsertKnowledgeBaseArticle,
  filters,
  InsertFilter,
  filterConditions,
  InsertFilterCondition,
} from "../drizzle/schema";

// ============ SKILLS ============

export async function createSkill(data: InsertSkill) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(skills).values(data);
  const inserted = await db.select().from(skills).where(eq(skills.skillName, data.skillName)).limit(1);
  return inserted[0];
}

export async function getSkillsByPage(pageId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(skills).where(eq(skills.pageId, pageId));
}

export async function getSkillById(skillId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(skills).where(eq(skills.id, skillId)).limit(1);
  return result[0];
}

export async function updateSkill(skillId: number, data: Partial<InsertSkill>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(skills).set(data).where(eq(skills.id, skillId));
}

export async function deleteSkill(skillId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(skills).where(eq(skills.id, skillId));
}

// ============ KNOWLEDGE BASE ============

export async function createKnowledgeArticle(data: InsertKnowledgeBaseArticle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(knowledgeBase).values(data);
  const inserted = await db.select().from(knowledgeBase).where(eq(knowledgeBase.title, data.title)).limit(1);
  return inserted[0];
}

export async function getKnowledgeByPage(pageId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(knowledgeBase).where(eq(knowledgeBase.pageId, pageId));
}

export async function getKnowledgeById(articleId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, articleId)).limit(1);
  return result[0];
}

export async function updateKnowledgeArticle(articleId: number, data: Partial<InsertKnowledgeBaseArticle>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(knowledgeBase).set(data).where(eq(knowledgeBase.id, articleId));
}

export async function deleteKnowledgeArticle(articleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(knowledgeBase).where(eq(knowledgeBase.id, articleId));
}

export async function searchKnowledge(pageId: number, query: string) {
  const db = await getDb();
  if (!db) return [];
  // Simple search by title or content containing query
  return await db.select().from(knowledgeBase).where(
    and(
      eq(knowledgeBase.pageId, pageId),
      eq(knowledgeBase.isPublished, 1)
    )
  );
}

// ============ FILTERS ============

export async function createFilter(data: InsertFilter) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(filters).values(data);
  const inserted = await db.select().from(filters).where(eq(filters.filterName, data.filterName)).limit(1);
  return inserted[0];
}

export async function getFiltersByPage(pageId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(filters).where(eq(filters.pageId, pageId));
}

export async function getFilterById(filterId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(filters).where(eq(filters.id, filterId)).limit(1);
  return result[0];
}

export async function updateFilter(filterId: number, data: Partial<InsertFilter>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(filters).set(data).where(eq(filters.id, filterId));
}

export async function deleteFilter(filterId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(filters).where(eq(filters.id, filterId));
}

export async function getSavedFilters(pageId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(filters).where(
    and(eq(filters.pageId, pageId), eq(filters.isSaved, 1))
  );
}

// ============ FILTER CONDITIONS ============

export async function createFilterCondition(data: InsertFilterCondition) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(filterConditions).values(data);
  const inserted = await db.select().from(filterConditions).where(eq(filterConditions.filterId, data.filterId)).limit(1);
  return inserted[0];
}

export async function getFilterConditions(filterId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(filterConditions).where(eq(filterConditions.filterId, filterId));
}

export async function deleteFilterCondition(conditionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(filterConditions).where(eq(filterConditions.id, conditionId));
}

export async function deleteFilterConditionsByFilter(filterId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(filterConditions).where(eq(filterConditions.filterId, filterId));
}
