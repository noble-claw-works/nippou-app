// =====================================================
// SalesTarget slice — addSalesTarget, updateSalesTarget,
// deleteSalesTarget, getTarget, upsertTarget
// =====================================================
import type { StateCreator } from "zustand";
import type { AppState, SalesTarget } from "../_internal/types";
import { uid } from "../_internal/constants";

export const createSalesTargetSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "addSalesTarget"
    | "updateSalesTarget"
    | "deleteSalesTarget"
    | "getTarget"
    | "upsertTarget"
  >
> = (set, get) => ({
  addSalesTarget: (partial) => {
    const now = new Date().toISOString();
    const target: SalesTarget = {
      ...partial,
      id: uid(),
      createdAt: now,
      updatedAt: now,
    };
    set((s) => {
      const updated = [...s.salesTargets, target];
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.salesTargets.v1",
          JSON.stringify(updated),
        );
      }
      return { salesTargets: updated };
    });
    return target;
  },

  updateSalesTarget: (id, patch) => {
    set((s) => {
      const updated = s.salesTargets.map((t) =>
        t.id === id
          ? { ...t, ...patch, updatedAt: new Date().toISOString() }
          : t,
      );
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.salesTargets.v1",
          JSON.stringify(updated),
        );
      }
      return { salesTargets: updated };
    });
  },

  deleteSalesTarget: (id) => {
    set((s) => {
      const updated = s.salesTargets.filter((t) => t.id !== id);
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.salesTargets.v1",
          JSON.stringify(updated),
        );
      }
      return { salesTargets: updated };
    });
  },

  getTarget: (scope, ownerId, periodType, period) => {
    return get().salesTargets.find(
      (t) =>
        t.scope === scope &&
        t.ownerId === ownerId &&
        t.periodType === periodType &&
        t.period === period,
    );
  },

  upsertTarget: (
    scope,
    ownerId,
    periodType,
    period,
    values,
    createdByUserId,
  ) => {
    const existing = get().getTarget(scope, ownerId, periodType, period);
    if (existing) {
      get().updateSalesTarget(existing.id, values);
      return { ...existing, ...values, updatedAt: new Date().toISOString() };
    } else {
      return get().addSalesTarget({
        scope,
        ownerId,
        periodType,
        period,
        targetPolicyCount: values.targetPolicyCount,
        targetPremium: values.targetPremium,
        memo: values.memo ?? "",
        createdByUserId,
      });
    }
  },
});
