// =====================================================
// TimeBlock slice — addBlock, updateBlock, deleteBlock
// =====================================================
import type { StateCreator } from "zustand";
import type { AppState, TimeBlock } from "../_internal/types";
import { uid } from "../_internal/constants";

export const createBlockSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<AppState, "addBlock" | "updateBlock" | "deleteBlock">
> = (set) => ({
  addBlock: (reportId, block) => {
    const newBlock: TimeBlock = { ...block, id: uid() };
    set((s) => ({
      reports: s.reports.map((r) =>
        r.id === reportId
          ? {
              ...r,
              blocks: [...r.blocks, newBlock],
              updatedAt: new Date().toISOString(),
            }
          : r,
      ),
    }));
    return newBlock;
  },

  updateBlock: (reportId, blockId, updates) => {
    set((s) => ({
      reports: s.reports.map((r) =>
        r.id === reportId
          ? {
              ...r,
              blocks: r.blocks.map((b) =>
                b.id === blockId ? { ...b, ...updates } : b,
              ),
              updatedAt: new Date().toISOString(),
            }
          : r,
      ),
    }));
  },

  deleteBlock: (reportId, blockId) => {
    set((s) => ({
      reports: s.reports.map((r) =>
        r.id === reportId
          ? {
              ...r,
              blocks: r.blocks.filter((b) => b.id !== blockId),
              updatedAt: new Date().toISOString(),
            }
          : r,
      ),
    }));
  },
});
