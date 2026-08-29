// =====================================================
// Report slice — getReport, getTodayReport, createReport,
// updateReport, confirmPlanning, submitReport,
// withdrawReport, confirmReport, bulkConfirmReports
// =====================================================
import type { StateCreator } from "zustand";
import type { AppState } from "../_internal/types";
import type { DailyReport } from "../_internal/types";
import { uid } from "../_internal/constants";
import { format } from "date-fns";

export const createReportSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "getReport"
    | "getTodayReport"
    | "createReport"
    | "updateReport"
    | "confirmPlanning"
    | "submitReport"
    | "withdrawReport"
    | "confirmReport"
    | "bulkConfirmReports"
  >
> = (set, get) => ({
  getReport: (userId, date) =>
    get().reports.find((r) => r.userId === userId && r.date === date),

  getTodayReport: () => {
    const today = format(new Date(), "yyyy-MM-dd");
    return get().reports.find(
      (r) => r.userId === get().currentUserId && r.date === today,
    );
  },

  createReport: (userId, date) => {
    const report: DailyReport = {
      id: uid(),
      userId,
      date,
      status: "planning",
      mainTheme: "",
      monthlyTheme: "",
      dailyTheme: "",
      blocks: [],
      todos: [],
      customerVisits: [],
      gratitude: ["", "", ""],
      morningMood: null,
      eveningMood: null,
      managerSignal: null,
      selfComment: "",
      comments: [],
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => ({ reports: [...s.reports, report] }));
    return report;
  },

  updateReport: (reportId, updates) => {
    set((s) => ({
      reports: s.reports.map((r) =>
        r.id === reportId
          ? { ...r, ...updates, updatedAt: new Date().toISOString() }
          : r,
      ),
    }));
  },

  confirmPlanning: (reportId) => {
    set((s) => ({
      reports: s.reports.map((r) =>
        r.id === reportId && r.status === "planning"
          ? { ...r, status: "in_progress", updatedAt: new Date().toISOString() }
          : r,
      ),
    }));
  },

  submitReport: (reportId) => {
    const now = new Date().toISOString();
    set((s) => ({
      reports: s.reports.map((r) =>
        r.id === reportId && r.status === "in_progress"
          ? { ...r, status: "submitted", submittedAt: now, updatedAt: now }
          : r,
      ),
    }));
  },

  withdrawReport: (reportId) => {
    // 本人取り下げ・上長差し戻し共通: submitted → in_progress
    set((s) => ({
      reports: s.reports.map((r) =>
        r.id === reportId && r.status === "submitted"
          ? {
              ...r,
              status: "in_progress",
              submittedAt: undefined,
              updatedAt: new Date().toISOString(),
            }
          : r,
      ),
    }));
  },

  confirmReport: (reportId) => {
    const now = new Date().toISOString();
    set((s) => ({
      reports: s.reports.map((r) =>
        r.id === reportId && r.status === "submitted"
          ? {
              ...r,
              status: "confirmed",
              confirmedAt: now,
              confirmedBy: s.currentUserId,
              updatedAt: now,
            }
          : r,
      ),
    }));
  },

  // MGR-4: 未確認日報の一括確認 - submitted のみを confirmed に遷移
  bulkConfirmReports: (reportIds) => {
    const now = new Date().toISOString();
    let confirmed = 0;
    set((s) => {
      const next = s.reports.map((r) => {
        if (reportIds.includes(r.id) && r.status === "submitted") {
          confirmed += 1;
          return {
            ...r,
            status: "confirmed" as const,
            confirmedAt: now,
            confirmedBy: s.currentUserId,
            updatedAt: now,
          };
        }
        return r;
      });
      return { reports: next };
    });
    return confirmed;
  },
});
