// =====================================================
// Toast slice — addToast, removeToast
// =====================================================
import type { StateCreator } from "zustand";
import type { AppState } from "../_internal/types";
import { uid } from "../_internal/constants";

export const createToastSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<AppState, "addToast" | "removeToast">
> = (set, get) => ({
  addToast: (toast) => {
    const id = uid();
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(
      () => get().removeToast(id),
      toast.type === "error" ? 4000 : toast.type === "warning" ? 3000 : 2000,
    );
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
});
