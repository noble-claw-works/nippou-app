// =====================================================
// productCategorySlice.ts — 種目マスタ CRUD
// taskTemplateSlice.ts のパターンを踏襲
// =====================================================
import type { StateCreator } from "zustand";
import type { AppState } from "../_internal/types";
import type { ProductCategoryMaster } from "../../types";
import { uid } from "../_internal/constants";

const STORAGE_KEY = "nippou.productCategories.v1";

function persist(categories: ProductCategoryMaster[]) {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  }
}

export const createProductCategorySlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    "addProductCategory" | "updateProductCategory" | "removeProductCategory"
  >
> = (set) => ({
  addProductCategory: (partial) => {
    const newItem: ProductCategoryMaster = {
      ...partial,
      id: uid(),
    };
    set((s) => {
      const updated = [...s.productCategories, newItem];
      persist(updated);
      return { productCategories: updated };
    });
    return newItem;
  },

  updateProductCategory: (id, patch) => {
    set((s) => {
      const updated = s.productCategories.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      );
      persist(updated);
      return { productCategories: updated };
    });
  },

  removeProductCategory: (id) => {
    set((s) => {
      const updated = s.productCategories.filter((c) => c.id !== id);
      persist(updated);
      return { productCategories: updated };
    });
  },
});
