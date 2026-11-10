import { LIFE_CATEGORIES, NONLIFE_CATEGORIES } from "../../types";
import type { TaskTemplate } from "../../types";
import type { ProductCategorySet } from "./constants";

export function getCategorySet(
  cats: TaskTemplate["productCategories"],
): ProductCategorySet {
  if (cats === null) return "all";
  if (cats.length === 0) return "none";
  if (
    LIFE_CATEGORIES.every((c) => cats.includes(c)) &&
    cats.length === LIFE_CATEGORIES.length
  )
    return "life";
  if (
    NONLIFE_CATEGORIES.every((c) => cats.includes(c)) &&
    cats.length === NONLIFE_CATEGORIES.length
  )
    return "nonlife";
  return "none";
}

export function categorySetToValue(
  set: ProductCategorySet,
): TaskTemplate["productCategories"] {
  if (set === "all") return null;
  if (set === "life") return LIFE_CATEGORIES;
  if (set === "nonlife") return NONLIFE_CATEGORIES;
  return [];
}
