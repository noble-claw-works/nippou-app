// =====================================================
// Notification + Tracking + EmailChangeRequest + resetAll
// =====================================================
import type { StateCreator } from "zustand";
import type {
  AppState,
  EmailChangeRequest,
  TimeBlock,
} from "../_internal/types";
import { uid } from "../_internal/constants";
import {
  persistAuthSession,
  persistRoleSwitch,
  DEFAULT_DEMO_PASSWORD,
} from "../auth";
import {
  USERS,
  TEAMS,
  CUSTOMERS,
  PERSONS,
  REPORTS,
  TEMPLATES,
  DEFAULT_QUICK_CHIPS,
  NOTIFICATIONS,
  AUDIT_LOGS,
  OPPORTUNITIES,
  POLICIES,
  POLICY_STATUS_HISTORY,
  SALES_TARGETS,
  TASK_TEMPLATES,
} from "../../data/seed";
import type { TrackingSession, BlockType } from "../_internal/types";

export const createNotificationTrackingSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "markNotificationRead"
    | "markAllNotificationsRead"
    | "deleteNotification"
    | "startTracking"
    | "stopTracking"
    | "discardTracking"
    | "requestEmailChange"
    | "getEmailChangeRequest"
    | "resetAll"
  >
> = (set, get) => ({
  markNotificationRead: (notifId) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === notifId ? { ...n, isRead: true } : n,
      ),
    }));
  },

  markAllNotificationsRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
    }));
  },

  deleteNotification: (notifId) => {
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== notifId),
    }));
  },

  startTracking: (blockType, customerId, memo = "") => {
    const session: TrackingSession = {
      id: uid(),
      userId: get().currentUserId,
      blockType,
      customerId,
      memo,
      startedAt: new Date().toISOString(),
      status: "running",
    };
    set({ trackingSession: session });
  },

  stopTracking: () => {
    const session = get().trackingSession;
    if (!session) return null;
    const now = new Date();
    const start = new Date(session.startedAt);
    const startHH = String(start.getHours()).padStart(2, "0");
    const startMM = String(Math.floor(start.getMinutes() / 15) * 15).padStart(
      2,
      "0",
    );
    const endHH = String(now.getHours()).padStart(2, "0");
    const endMM = String(Math.floor(now.getMinutes() / 15) * 15).padStart(
      2,
      "0",
    );
    set({ trackingSession: null });
    return {
      id: uid(),
      reportId: "",
      type: session.blockType,
      customerId: session.customerId,
      startTime: `${startHH}:${startMM}`,
      endTime: `${endHH}:${endMM}`,
      title: session.memo || "",
      memo: "",
      isPlanned: false,
      isActual: true,
      attachments: [],
    };
  },

  discardTracking: () => set({ trackingSession: null }),

  requestEmailChange: (userId, newEmail) => {
    const req: EmailChangeRequest = {
      id: uid(),
      userId,
      newEmail,
      status: "pending",
      requestedAt: new Date().toISOString(),
    };
    set((s) => ({
      emailChangeRequests: [
        ...s.emailChangeRequests.filter(
          (r) => r.userId !== userId || r.status !== "pending",
        ),
        req,
      ],
    }));
  },

  getEmailChangeRequest: (userId) => {
    return get().emailChangeRequests.find(
      (r) => r.userId === userId && r.status === "pending",
    );
  },

  resetAll: () => {
    persistAuthSession(null);
    persistRoleSwitch(null, null); // E-9: リセット時はロール切替記録もクリア
    // E-8 修正: リセット時は削除済み顧客 ID もクリア
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem("nippou.deletedCustomerIds.v1");
      window.localStorage.removeItem("nippou.opportunities.v1");
      window.localStorage.removeItem("nippou.opportunities.v2");
      window.localStorage.removeItem("nippou.policies.v1");
      window.localStorage.removeItem("nippou.policyHistory.v1");
      window.localStorage.removeItem("nippou.salesTargets.v1");
      window.localStorage.removeItem("nippou.oppActivityReports.v1");
      window.localStorage.removeItem("nippou.taskTemplates.v1");
    }
    set({
      currentRole: "general",
      currentUserId: "u1",
      authSession: null,
      passwords: Object.fromEntries(
        USERS.map((u) => [u.id, DEFAULT_DEMO_PASSWORD]),
      ),
      users: USERS,
      teams: TEAMS,
      customers: CUSTOMERS,
      persons: PERSONS,
      reports: REPORTS,
      templates: TEMPLATES,
      quickChips: DEFAULT_QUICK_CHIPS,
      notifications: NOTIFICATIONS,
      auditLogs: AUDIT_LOGS,
      trackingSession: null,
      emailChangeRequests: [],
      managerComments: [],
      compliments: [],
      opportunities: OPPORTUNITIES,
      policies: POLICIES,
      policyStatusHistory: POLICY_STATUS_HISTORY,
      salesTargets: SALES_TARGETS,
      oppActivityReports: [],
      taskTemplates: TASK_TEMPLATES,
      toasts: [],
    });
  },
});

// suppress unused import warnings
void (undefined as unknown as TimeBlock);
void (undefined as unknown as BlockType);
