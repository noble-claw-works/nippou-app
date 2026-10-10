// =====================================================
// salesChannelSlice.ts — チャネルマスタ CRUD
// insuranceCompanySlice.ts のパターンを踏襲 (工程B-1 2026-10-07)
// =====================================================
import type { StateCreator } from "zustand";
import type { AppState } from "../_internal/types";
import type { SalesChannel } from "../../types";
import { uid } from "../_internal/constants";

const STORAGE_KEY = "nippou.salesChannels.v1";

function persist(channels: SalesChannel[]) {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
  }
}

export const createSalesChannelSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<AppState, "addSalesChannel" | "updateSalesChannel" | "removeSalesChannel">
> = (set) => ({
  addSalesChannel: (partial) => {
    const newItem: SalesChannel = {
      ...partial,
      id: uid(),
    };
    set((s) => {
      const updated = [...s.salesChannels, newItem];
      persist(updated);
      return { salesChannels: updated };
    });
    return newItem;
  },

  updateSalesChannel: (id, patch) => {
    set((s) => {
      const updated = s.salesChannels.map((ch) =>
        ch.id === id ? { ...ch, ...patch } : ch,
      );
      persist(updated);
      return { salesChannels: updated };
    });
  },

  removeSalesChannel: (id) => {
    set((s) => {
      const updated = s.salesChannels.filter((ch) => ch.id !== id);
      persist(updated);
      return { salesChannels: updated };
    });
  },
});
