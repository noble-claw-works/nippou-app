// =====================================================
// Store internal constants + initialization helpers
// =====================================================
import {
  USERS,
  CUSTOMERS,
  OPPORTUNITIES,
  POLICIES,
  POLICY_STATUS_HISTORY,
  SALES_TARGETS,
  TASK_TEMPLATES,
  OPP_ACTIVITY_REPORTS,
} from "../../data/seed";
import type {
  SalesTarget,
  Opportunity,
  Policy,
  PolicyStatusHistory,
  OpportunityActivityReport,
  TaskTemplate,
} from "../../types";
import { loadAuthSession, loadRoleSwitch } from "../auth";
import { loadDeletedCustomerIds } from "../deletedCustomers";

// ============================================================
// uid generator
// ============================================================
let idCounter = 10000;
export const uid = () => `id_${++idCounter}_${Date.now()}`;

// ============================================================
// seed バージンガード（モックデモの localStorage 陳腐防止）
// ============================================================
export const SEED_VERSION = "2026-08-25-fb3";
export const SEED_VERSION_KEY = "nippou.seedVersion";
export const SEED_DATA_KEYS = [
  "nippou.opportunities.v2",
  "nippou.opportunities.v1",
  "nippou.oppActivityReports.v1",
  "nippou.taskTemplates.v1",
  "nippou.policies.v1",
  "nippou.policyHistory.v1",
  "nippou.salesTargets.v1",
  "nippou.deletedCustomerIds.v1",
];

// IIFE: seed バージンチェック（モジュールロード時に実行）
(() => {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const stored = window.localStorage.getItem(SEED_VERSION_KEY);
    if (stored !== SEED_VERSION) {
      for (const k of SEED_DATA_KEYS) window.localStorage.removeItem(k);
      window.localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
    }
  } catch {
    /* ignore */
  }
})();

// ============================================================
// ストア初期化時の localStorage 復元
// ============================================================

// 認証セッション復元
export const _initialAuthSession = loadAuthSession();
export const _initialUser = _initialAuthSession
  ? USERS.find((u) => u.id === _initialAuthSession.userId)
  : undefined;

// E-9: ロール切替永続化
export const _initialRoleSwitch = loadRoleSwitch();

// E-8: 削除済み顧客 ID を localStorage から復元し seed から除外
export const _deletedCustomerIds = loadDeletedCustomerIds();
export const _initialCustomers =
  _deletedCustomerIds.size > 0
    ? CUSTOMERS.filter((c) => !_deletedCustomerIds.has(c.id))
    : CUSTOMERS;

// localStorage からの各エンティティ初期値ロード
export const _initialSalesTargets = (() => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem("nippou.salesTargets.v1");
      if (raw) return JSON.parse(raw) as SalesTarget[];
    } catch {
      /* ignore */
    }
  }
  return SALES_TARGETS;
})();

export const _initialOpportunities = (() => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem("nippou.opportunities.v2");
      if (raw) return JSON.parse(raw) as Opportunity[];
    } catch {
      /* ignore */
    }
    // v1 マイグレーション: tasks フィールドを追加
    try {
      const rawV1 = window.localStorage.getItem("nippou.opportunities.v1");
      if (rawV1) {
        const parsed = JSON.parse(rawV1) as Opportunity[];
        return parsed.map((o) => ({ ...o, tasks: o.tasks ?? [] }));
      }
    } catch {
      /* ignore */
    }
  }
  return OPPORTUNITIES;
})();

export const _initialPolicies = (() => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem("nippou.policies.v1");
      if (raw) return JSON.parse(raw) as Policy[];
    } catch {
      /* ignore */
    }
  }
  return POLICIES;
})();

export const _initialPolicyStatusHistory = (() => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem("nippou.policyHistory.v1");
      if (raw) return JSON.parse(raw) as PolicyStatusHistory[];
    } catch {
      /* ignore */
    }
  }
  return POLICY_STATUS_HISTORY;
})();

export const _initialOppActivityReports = (() => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem("nippou.oppActivityReports.v1");
      if (raw) return JSON.parse(raw) as OpportunityActivityReport[];
    } catch {
      /* ignore */
    }
  }
  return OPP_ACTIVITY_REPORTS;
})();

export const _initialTaskTemplates = (() => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem("nippou.taskTemplates.v1");
      if (raw) return JSON.parse(raw) as TaskTemplate[];
    } catch {
      /* ignore */
    }
  }
  return TASK_TEMPLATES;
})();
