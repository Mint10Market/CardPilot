import { db } from "@/lib/db";
import { personalCollectionItems } from "@/lib/db/schema";
import { eq, and, ilike, or, asc, desc } from "drizzle-orm";

export type CollectionItemsFilters = {
  search?: string;
  category?: string;
  sort?: "title" | "acquiredDate" | "estimatedValue";
  order?: "asc" | "desc";
};

export async function getCollectionItems(userId: string, filters: CollectionItemsFilters = {}) {
  const conditions = [eq(personalCollectionItems.userId, userId)];
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(personalCollectionItems.title, term),
        ilike(personalCollectionItems.playerOrSubject, term),
        ilike(personalCollectionItems.setName, term),
        ilike(personalCollectionItems.notes, term)
      )!
    );
  }
  if (filters.category?.trim()) {
    conditions.push(eq(personalCollectionItems.category, filters.category.trim()));
  }

  const orderByColumn =
    filters.sort === "acquiredDate"
      ? personalCollectionItems.acquiredDate
      : filters.sort === "estimatedValue"
        ? personalCollectionItems.estimatedValue
        : personalCollectionItems.title;
  const dir = filters.order === "desc" ? desc : asc;

  return db.query.personalCollectionItems.findMany({
    where: and(...conditions),
    orderBy: [dir(orderByColumn), asc(personalCollectionItems.id)],
  });
}

export async function getCollectionItem(id: string, userId: string) {
  return db.query.personalCollectionItems.findFirst({
    where: and(
      eq(personalCollectionItems.id, id),
      eq(personalCollectionItems.userId, userId)
    ),
  });
}
