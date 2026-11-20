// =====================================================
// Store internal constants + initialization helpers
// =====================================================
import {
  USERS,
  CUSTOMERS,
  PERSONS,
  OPPORTUNITIES,
  POLICIES,
  POLICY_STATUS_HISTORY,
  SALES_TARGETS,
  TASK_TEMPLATES,
  OPP_ACTIVITY_REPORTS,
  RENEWAL_CASES,
  CUSTOMER_INTERACTIONS,
} from "../../data/seed";
import { INITIAL_INSURANCE_COMPANIES } from "../../data/insuranceCompanies";
import {
  migrateOpportunitiesStage,
  migrateTaskTemplatesStage,
} from "../../utils/migrations/opportunityStage";
import {
  mergeInsuranceCompanies,
  backfillOpportunityInsurerIds,
} from "../../utils/insurerMatch";
import { INITIAL_PRODUCT_CATEGORIES } from "../../data/productCategories";
import { SALES_CHANNELS } from "../../data/salesChannels";
import { backfillProposalContractors } from "../../utils/migrations/proposalContractor";
import { loadAddedHouseholds, mergeById } from "../addedHouseholds";
import { mergeSalesChannels } from "../../utils/salesChannelMerge";
import type {
  SalesTarget,
  Opportunity,
  Policy,
  PolicyStatusHistory,
  OpportunityActivityReport,
  TaskTemplate,
  RenewalCase,
  RenewalRoadmapTemplateVersion,
  CustomerInteraction,
  InsuranceCompany,
  ProductCategoryMaster,
  SalesChannel,
} from "../../types";
import { buildSeedRoadmapTemplateV1 } from "../../utils/renewalMigration";
import { migrateRenewalCases } from "../../utils/migrations/renewalCases";
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
export const SEED_VERSION = "2026-09-09-customer-interaction";
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
  "nippou.renewalCases.v1",
  "nippou.customerInteractions.v1",
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

const _rawOpportunities = (() => {
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
      if (raw) return migrateTaskTemplatesStage(JSON.parse(raw) as TaskTemplate[]);
    } catch {
      /* ignore */
    }
  }
  return migrateTaskTemplatesStage(TASK_TEMPLATES);
})();

export const _initialRenewalCases = (() => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem("nippou.renewalCases.v1");
      if (raw) return migrateRenewalCases(JSON.parse(raw) as RenewalCase[]);
    } catch {
      /* ignore */
    }
  }
  return RENEWAL_CASES;
})();

// Doc5 ロードマップ テンプレ版（PC-5）。localStorage 無ければ seed v1。
export const _initialRoadmapTemplateVersions = ((): RenewalRoadmapTemplateVersion[] => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(
        "nippou.renewalRoadmapTemplate.v1",
      );
      if (raw) {
        const parsed = JSON.parse(raw) as RenewalRoadmapTemplateVersion[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      /* ignore */
    }
  }
  return [buildSeedRoadmapTemplateV1()];
})();

export const _initialCustomerInteractions = (() => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem("nippou.customerInteractions.v1");
      if (raw) return JSON.parse(raw) as CustomerInteraction[];
    } catch {
      /* ignore */
    }
  }
  return CUSTOMER_INTERACTIONS;
})();

export const _initialInsuranceCompanies = (() => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem("nippou.insuranceCompanies.v1");
      if (raw) {
        // B3: 旧データに kind/aliases を補完（冪等）
        return mergeInsuranceCompanies(
          JSON.parse(raw) as InsuranceCompany[],
          INITIAL_INSURANCE_COMPANIES,
        );
      }
    } catch {
      /* ignore */
    }
  }
  return INITIAL_INSURANCE_COMPANIES;
})();

// 読み込み時変換（冪等）。SEED_VERSION は上げない＝テスターの入力データを残す。
const _addedHh = loadAddedHouseholds();
export const _initialOpportunities = backfillProposalContractors(
  backfillOpportunityInsurerIds(
    migrateOpportunitiesStage(_rawOpportunities), // B1: 旧9段 → 7段
    _initialInsuranceCompanies,
  ),
  mergeById(CUSTOMERS, _addedHh.customers), // D4: 契約者欠落を世帯主で補完
  mergeById(PERSONS, _addedHh.persons),
);

export const _initialProductCategories = (() => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem("nippou.productCategories.v1");
      if (raw) return JSON.parse(raw) as ProductCategoryMaster[];
    } catch {
      /* ignore */
    }
  }
  return INITIAL_PRODUCT_CATEGORIES;
})();

export const _initialSalesChannels = (() => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem("nippou.salesChannels.v1");
      // 2026-11-20: 不足チャネル（住宅/イエタテ 等）を冪等に補う
      if (raw) return mergeSalesChannels(JSON.parse(raw) as SalesChannel[], SALES_CHANNELS);
    } catch {
      /* ignore */
    }
  }
  return SALES_CHANNELS;
})();
