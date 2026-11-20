// =====================================================
// CustomerInteraction slice — 世帯対応記録 (SPEC-HOUSEHOLD-INTERACTION)
// =====================================================
import type { StateCreator } from "zustand";
import type { AppState } from "../_internal/types";
import type { CustomerInteraction } from "../../types";
import { uid } from "../_internal/constants";

const LS_KEY = "nippou.customerInteractions.v1";

function persist(interactions: CustomerInteraction[]) {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(interactions));
    } catch {
      /* ignore */
    }
  }
}

export const createCustomerInteractionSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "getInteractionsByHousehold"
    | "addCustomerInteraction"
    | "updateCustomerInteraction"
    | "deleteCustomerInteraction"
  >
> = (set, get) => ({
  getInteractionsByHousehold: (householdId) => {
    return get()
      .customerInteractions.filter((i) => i.householdId === householdId)
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  },

  addCustomerInteraction: (partial) => {
    const now = new Date().toISOString();
    const interaction: CustomerInteraction = {
      ...partial,
      id: uid(),
      byUserId: partial.byUserId ?? get().currentUserId,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [...get().customerInteractions, interaction];
    persist(updated);
    set({ customerInteractions: updated });

    // Household.lastContactDate を occurredAt で更新
    const { customers, updateCustomer } = get();
    const household = customers.find((c) => c.id === partial.householdId);
    if (
      household &&
      (!household.lastContactDate ||
        partial.occurredAt > household.lastContactDate)
    ) {
      updateCustomer(partial.householdId, {
        lastContactDate: partial.occurredAt,
      });
    }

    return interaction;
  },

  updateCustomerInteraction: (id, patch) => {
    const now = new Date().toISOString();
    const updated = get().customerInteractions.map((i) =>
      i.id === id ? { ...i, ...patch, updatedAt: now } : i,
    );
    persist(updated);
    set({ customerInteractions: updated });
  },

  deleteCustomerInteraction: (id) => {
    const updated = get().customerInteractions.filter((i) => i.id !== id);
    persist(updated);
    set({ customerInteractions: updated });
  },
});
