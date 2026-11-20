// =====================================================
// insuranceCompanySlice.ts — 保険会社マスタ CRUD
// taskTemplateSlice.ts のパターンを踏襲
// =====================================================
import type { StateCreator } from "zustand";
import type { AppState } from "../_internal/types";
import type { InsuranceCompany } from "../../types";
import { uid } from "../_internal/constants";

const STORAGE_KEY = "nippou.insuranceCompanies.v1";

function persist(companies: InsuranceCompany[]) {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
  }
}

export const createInsuranceCompanySlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    "addInsuranceCompany" | "updateInsuranceCompany" | "removeInsuranceCompany"
  >
> = (set) => ({
  addInsuranceCompany: (partial) => {
    const newItem: InsuranceCompany = {
      ...partial,
      id: uid(),
    };
    set((s) => {
      const updated = [...s.insuranceCompanies, newItem];
      persist(updated);
      return { insuranceCompanies: updated };
    });
    return newItem;
  },

  updateInsuranceCompany: (id, patch) => {
    set((s) => {
      const updated = s.insuranceCompanies.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      );
      persist(updated);
      return { insuranceCompanies: updated };
    });
  },

  removeInsuranceCompany: (id) => {
    set((s) => {
      const updated = s.insuranceCompanies.filter((c) => c.id !== id);
      persist(updated);
      return { insuranceCompanies: updated };
    });
  },
});
