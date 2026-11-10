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

import { reportOwnerIdOf } from "./notificationGen";

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

  withdrawReport: (reportId, by?: "manager" | "self") => {
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
    // G1: 上長差戈しの場合のみ通知
    if (by === "manager") {
      const s = get();
      const ownerId = reportOwnerIdOf(s.reports, reportId);
      if (ownerId) {
        s.addNotification({
          userId: ownerId,
          type: "sent_back",
          title: "日報が差し戻されました",
          body: "上長により差し戻されました。内容を確認して再提出してください。",
          relatedReportId: reportId,
        });
      }
    }
  },

  confirmReport: (reportId) => {
    const now = new Date().toISOString();
    const s = get();
    const confirmerName =
      s.users.find((u) => u.id === s.currentUserId)?.name ?? s.currentUserId;
    set((st) => ({
      reports: st.reports.map((r) =>
        r.id === reportId && r.status === "submitted"
          ? {
              ...r,
              status: "confirmed",
              confirmedAt: now,
              confirmedBy: st.currentUserId,
              updatedAt: now,
            }
          : r,
      ),
    }));
    // G1: 日報オーナーへ確認通知
    const ownerId = reportOwnerIdOf(get().reports, reportId);
    if (ownerId) {
      get().addNotification({
        userId: ownerId,
        type: "confirmed",
        title: "日報が確認されました",
        body: `${confirmerName}が確認しました。`,
        relatedReportId: reportId,
      });
    }
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
