// =====================================================
// Todo slice — addTodo, toggleTodo, updateTodo, deleteTodo
// =====================================================
import type { StateCreator } from "zustand";
import type { AppState, Todo } from "../_internal/types";
import { uid } from "../_internal/constants";
import { isTodoReadOnly } from "../../utils/todoReadOnly";
import type { ReportStatus as TodoReportStatus } from "../../utils/todoReadOnly";

export const createTodoSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<AppState, "addTodo" | "toggleTodo" | "updateTodo" | "deleteTodo">
> = (set, get) => ({
  addTodo: (reportId, text, priority = "medium") => {
    const todo: Todo = {
      id: uid(),
      reportId,
      text,
      completed: false,
      status: "todo",
      rolledOver: false,
      priority,
    };
    set((s) => ({
      reports: s.reports.map((r) =>
        r.id === reportId
          ? {
              ...r,
              todos: [...r.todos, todo],
              updatedAt: new Date().toISOString(),
            }
          : r,
      ),
    }));
  },

  toggleTodo: (reportId, todoId) => {
    // BUG-B: 提出済み / 確認済み日報の TODO は変更不可（二層防御: store ガード）
    // BUG-B 残存修正: 期限切れ TODO も変更不可（store 層での二層防御）
    const report = get().reports.find((r) => r.id === reportId);
    if (!report) return;
    const todo = report.todos.find((t) => t.id === todoId);
    const todayStr = new Date().toISOString().split("T")[0];
    if (
      !todo ||
      isTodoReadOnly(todo, report.status as TodoReportStatus, todayStr)
    ) {
      console.warn("[store] toggleTodo blocked: todo is read-only", {
        reportId,
        todoId,
        status: report.status,
        dueDate: todo?.dueDate,
      });
      return;
    }
    // 3段階巡回: todo → doing → done → todo
    const nextStatus = (
      current: "todo" | "doing" | "done",
    ): "todo" | "doing" | "done" => {
      if (current === "todo") return "doing";
      if (current === "doing") return "done";
      return "todo";
    };
    set((s) => ({
      reports: s.reports.map((r) =>
        r.id === reportId
          ? {
              ...r,
              todos: r.todos.map((t) => {
                if (t.id === todoId) {
                  const newStatus = nextStatus(t.status ?? "todo");
                  return {
                    ...t,
                    status: newStatus,
                    completed: newStatus === "done",
                  };
                }
                return t;
              }),
              updatedAt: new Date().toISOString(),
            }
          : r,
      ),
    }));
  },

  updateTodo: (reportId, todoId, updates) => {
    // BUG-B: 提出済み / 確認済み日報の TODO は変更不可
    // BUG-B 残存修正: 期限切れ TODO も変更不可（store 層二層防御）
    const report = get().reports.find((r) => r.id === reportId);
    if (!report) return;
    const todo = report.todos.find((t) => t.id === todoId);
    const todayStr = new Date().toISOString().split("T")[0];
    if (
      !todo ||
      isTodoReadOnly(todo, report.status as TodoReportStatus, todayStr)
    ) {
      console.warn("[store] updateTodo blocked: todo is read-only", {
        reportId,
        todoId,
        status: report.status,
        dueDate: todo?.dueDate,
      });
      return;
    }
    set((s) => ({
      reports: s.reports.map((r) =>
        r.id === reportId
          ? {
              ...r,
              todos: r.todos.map((t) =>
                t.id === todoId ? { ...t, ...updates } : t,
              ),
              updatedAt: new Date().toISOString(),
            }
          : r,
      ),
    }));
  },

  deleteTodo: (reportId, todoId) => {
    // BUG-B: 提出済み / 確認済み日報の TODO は削除不可
    // BUG-B 残存修正: 期限切れ TODO も削除不可（store 層二層防御）
    const report = get().reports.find((r) => r.id === reportId);
    if (!report) return;
    const todo = report.todos.find((t) => t.id === todoId);
    const todayStr = new Date().toISOString().split("T")[0];
    if (
      !todo ||
      isTodoReadOnly(todo, report.status as TodoReportStatus, todayStr)
    ) {
      console.warn("[store] deleteTodo blocked: todo is read-only", {
        reportId,
        todoId,
        status: report.status,
        dueDate: todo?.dueDate,
      });
      return;
    }
    set((s) => ({
      reports: s.reports.map((r) =>
        r.id === reportId
          ? {
              ...r,
              todos: r.todos.filter((t) => t.id !== todoId),
              updatedAt: new Date().toISOString(),
            }
          : r,
      ),
    }));
  },
});
