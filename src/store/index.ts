// =====================================================
// Zustand Store - 305-hrl-nippou-app
// Refactored: slice pattern (pure refactor, no logic change)
// =====================================================
import { create } from "zustand";
import type { AppState } from "./_internal/types";
import {
  _initialAuthSession,
  _initialUser,
  _initialRoleSwitch,
  _initialCustomers,
  _initialSalesTargets,
  _initialOpportunities,
  _initialPolicies,
  _initialPolicyStatusHistory,
  _initialOppActivityReports,
  _initialTaskTemplates,
} from "./_internal/constants";
import {
  USERS,
  TEAMS,
  REPORTS,
  TEMPLATES,
  DEFAULT_QUICK_CHIPS,
  NOTIFICATIONS,
  AUDIT_LOGS,
  PERSONS,
} from "../data/seed";
import { DEFAULT_DEMO_PASSWORD } from "./auth";

// Slices
import { createAuthSlice } from "./_slices/authSlice";
import { createToastSlice } from "./_slices/toastSlice";
import { createReportSlice } from "./_slices/reportSlice";
import { createBlockSlice } from "./_slices/blockSlice";
import { createTodoSlice } from "./_slices/todoSlice";
import { createCommentSlice } from "./_slices/commentSlice";
import { createCustomerSlice } from "./_slices/customerSlice";
import { createUserTeamSlice } from "./_slices/userTeamSlice";
import { createTemplateSlice } from "./_slices/templateSlice";
import { createSalesTargetSlice } from "./_slices/salesTargetSlice";
import { createPolicySlice } from "./_slices/policySlice";
import { createOpportunitySlice } from "./_slices/opportunitySlice";
import { createOppActivitySlice } from "./_slices/oppActivitySlice";
import { createTaskTemplateSlice } from "./_slices/taskTemplateSlice";
import { createNotificationTrackingSlice } from "./_slices/notificationTrackingSlice";

// =====================================================
// 再エクスポート (既存の import パス互換用)
// =====================================================
export {
  AUTH_STORAGE_KEY,
  AUTH_SESSION_TTL_MS,
  DEFAULT_DEMO_PASSWORD,
} from "./auth";
export { ROLE_SWITCH_STORAGE_KEY, USER_SWITCH_STORAGE_KEY } from "./auth";
export type { AuthSession } from "./auth";

// Toast + EmailChangeRequest types (消費者が直接 import している)
export type { Toast, EmailChangeRequest } from "./_internal/types";

// =====================================================
// Store
// =====================================================
export const useAppStore = create<AppState>((set, get) => ({
  // -------------------------------------------------------
  // 初期 state
  // -------------------------------------------------------
  // E-9: ロール切替が永続化されていればそちら優先、なければ auth ユーザーのロール
  currentRole: _initialRoleSwitch?.role ?? _initialUser?.role ?? "general",
  currentUserId: _initialRoleSwitch?.userId ?? _initialUser?.id ?? "u1",
  authSession: _initialUser ? _initialAuthSession : null,
  passwords: Object.fromEntries(
    USERS.map((u) => [u.id, DEFAULT_DEMO_PASSWORD]),
  ),
  users: USERS,
  teams: TEAMS,
  customers: _initialCustomers,
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
  salesTargets: _initialSalesTargets,
  opportunities: _initialOpportunities,
  policies: _initialPolicies,
  policyStatusHistory: _initialPolicyStatusHistory,
  oppActivityReports: _initialOppActivityReports,
  taskTemplates: _initialTaskTemplates,
  toasts: [],

  // -------------------------------------------------------
  // Actions (spread slices — 同一 set/get を全スライスで共有)
  // -------------------------------------------------------
  ...createAuthSlice(set, get, undefined as never),
  ...createToastSlice(set, get, undefined as never),
  ...createReportSlice(set, get, undefined as never),
  ...createBlockSlice(set, get, undefined as never),
  ...createTodoSlice(set, get, undefined as never),
  ...createCommentSlice(set, get, undefined as never),
  ...createCustomerSlice(set, get, undefined as never),
  ...createUserTeamSlice(set, get, undefined as never),
  ...createTemplateSlice(set, get, undefined as never),
  ...createSalesTargetSlice(set, get, undefined as never),
  ...createPolicySlice(set, get, undefined as never),
  ...createOpportunitySlice(set, get, undefined as never),
  ...createOppActivitySlice(set, get, undefined as never),
  ...createTaskTemplateSlice(set, get, undefined as never),
  ...createNotificationTrackingSlice(set, get, undefined as never),
}));
