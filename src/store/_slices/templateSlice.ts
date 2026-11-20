// =====================================================
// Template + QuickChip slice
// =====================================================
import type { StateCreator } from "zustand";
import type { AppState, Template, QuickChip } from "../_internal/types";
import { uid } from "../_internal/constants";

export const createTemplateSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "addTemplate"
    | "updateTemplate"
    | "publishTemplate"
    | "deactivateTemplate"
    | "addQuickChip"
    | "updateQuickChip"
    | "deleteQuickChip"
  >
> = (set) => ({
  addTemplate: (template) => {
    const now = new Date().toISOString();
    const newTemplate: Template = {
      ...template,
      id: uid(),
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ templates: [...s.templates, newTemplate] }));
    return newTemplate;
  },

  updateTemplate: (templateId, updates) => {
    set((s) => ({
      templates: s.templates.map((t) =>
        t.id === templateId
          ? { ...t, ...updates, updatedAt: new Date().toISOString() }
          : t,
      ),
    }));
  },

  publishTemplate: (templateId) => {
    set((s) => ({
      templates: s.templates.map((t) =>
        t.id === templateId
          ? {
              ...t,
              status: "published",
              isActive: true,
              updatedAt: new Date().toISOString(),
            }
          : t,
      ),
    }));
  },

  deactivateTemplate: (templateId) => {
    set((s) => ({
      templates: s.templates.map((t) =>
        t.id === templateId
          ? { ...t, isActive: false, updatedAt: new Date().toISOString() }
          : t,
      ),
    }));
  },

  addQuickChip: (chip) => {
    const newChip: QuickChip = { ...chip, id: uid() };
    set((s) => ({ quickChips: [...s.quickChips, newChip] }));
  },

  updateQuickChip: (chipId, updates) => {
    set((s) => ({
      quickChips: s.quickChips.map((c) =>
        c.id === chipId ? { ...c, ...updates } : c,
      ),
    }));
  },

  deleteQuickChip: (chipId) => {
    set((s) => ({ quickChips: s.quickChips.filter((c) => c.id !== chipId) }));
  },
});
