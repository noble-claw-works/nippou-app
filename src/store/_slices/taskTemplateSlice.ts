// =====================================================
// TaskTemplate + Household Task slice (ADR-TASK-MASTER)
// =====================================================
import type { StateCreator } from "zustand";
import type { AppState, TaskTemplate, Task } from "../_internal/types";
import { uid } from "../_internal/constants";
import { format } from "date-fns";

export const createTaskTemplateSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "addTaskTemplate"
    | "updateTaskTemplate"
    | "removeTaskTemplate"
    | "addHouseholdTask"
    | "updateHouseholdTask"
    | "removeHouseholdTask"
    | "toggleHouseholdTaskDone"
  >
> = (set) => ({
  // ADR-TASK-MASTER: TaskTemplate CRUD
  addTaskTemplate: (tmpl) => {
    const now = new Date().toISOString();
    const newTmpl: TaskTemplate = {
      ...tmpl,
      id: uid(),
      createdAt: now,
      updatedAt: now,
    };
    set((s) => {
      const updated = [...s.taskTemplates, newTmpl];
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.taskTemplates.v1",
          JSON.stringify(updated),
        );
      }
      return { taskTemplates: updated };
    });
    return newTmpl;
  },

  updateTaskTemplate: (id, patch) => {
    const now = new Date().toISOString();
    set((s) => {
      const updated = s.taskTemplates.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: now } : t,
      );
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.taskTemplates.v1",
          JSON.stringify(updated),
        );
      }
      return { taskTemplates: updated };
    });
  },

  removeTaskTemplate: (id) => {
    set((s) => {
      const updated = s.taskTemplates.filter((t) => t.id !== id);
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.taskTemplates.v1",
          JSON.stringify(updated),
        );
      }
      return { taskTemplates: updated };
    });
  },

  // ADR-TASK-MASTER: 世帯スコープ Task CRUD
  addHouseholdTask: (householdId, task) => {
    const now = new Date().toISOString();
    const newTask: Task = { ...task, id: uid(), createdAt: now };
    set((s) => ({
      customers: s.customers.map((c) =>
        c.id !== householdId
          ? c
          : { ...c, tasks: [...(c.tasks ?? []), newTask] },
      ),
    }));
  },

  updateHouseholdTask: (householdId, taskId, patch) => {
    set((s) => ({
      customers: s.customers.map((c) => {
        if (c.id !== householdId) return c;
        const tasks = (c.tasks ?? []).map((t) =>
          t.id === taskId ? { ...t, ...patch } : t,
        );
        return { ...c, tasks };
      }),
    }));
  },

  removeHouseholdTask: (householdId, taskId) => {
    set((s) => ({
      customers: s.customers.map((c) => {
        if (c.id !== householdId) return c;
        // 自動生成タスク（sourceMasterId != undefined）は削除不可
        const task = (c.tasks ?? []).find((t) => t.id === taskId);
        if (task?.sourceMasterId !== undefined) return c;
        const tasks = (c.tasks ?? []).filter((t) => t.id !== taskId);
        return { ...c, tasks };
      }),
    }));
  },

  toggleHouseholdTaskDone: (householdId, taskId, done, today) => {
    const todayStr = today ?? format(new Date(), "yyyy-MM-dd");
    set((s) => ({
      customers: s.customers.map((c) => {
        if (c.id !== householdId) return c;
        const tasks = (c.tasks ?? []).map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            done,
            doneDate: done ? (t.doneDate ?? todayStr) : t.doneDate,
          };
        });
        return { ...c, tasks };
      }),
    }));
  },
});
