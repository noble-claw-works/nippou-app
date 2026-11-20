import type { Opportunity, ProductCategory } from "../../types";
import { PRODUCT_CATEGORY_LABELS } from "./constants";
import type { ProductGroup } from "./ProductView";

export function buildProductGroups(
  filtered: Opportunity[],
  catFilter: ProductCategory | "all",
): ProductGroup[] {
  const catMap = new Map<ProductCategory, Opportunity[]>();
  for (const opp of filtered) {
    const cats =
      opp.productCategories.length > 0
        ? opp.productCategories
        : (["other"] as ProductCategory[]);
    for (const cat of cats) {
      if (catFilter !== "all" && cat !== catFilter) continue;
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat)!.push(opp);
    }
  }
  const groups: ProductGroup[] = [];
  for (const [cat, label] of Object.entries(PRODUCT_CATEGORY_LABELS) as [
    ProductCategory,
    string,
  ][]) {
    const items = catMap.get(cat);
    if (items && items.length > 0) {
      groups.push({ category: cat, label, items });
    }
  }
  return groups;
}
