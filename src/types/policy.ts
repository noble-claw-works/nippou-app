// =====================================================
// policy.ts — 保険契約 (Policy) 型 — Phase 3
// =====================================================

import type { ProductCategory } from "./opportunity";

export type PolicyStatus =
  | "inforce" // 有効中
  | "lapsed" // 失効
  | "surrendered" // 解約
  | "matured" // 満期
  | "paid_up" // 払済
  | "reduced" // 減額
  | "pending"; // 申込中

export type PayMode = "monthly" | "semi_annual" | "annual" | "lump_sum";

export type CoverageType =
  | "death" // 死亡
  | "living_benefit" // 生前給付
  | "medical_hospital" // 入院
  | "medical_surgery" // 手術
  | "cancer" // がん
  | "critical_illness" // 三大疾病
  | "disability" // 就業不能
  | "nursing" // 介護
  | "savings" // 貯蓄/年金
  | "liability" // 賠償
  | "asset_damage" // 物損
  | "other";

export interface Coverage {
  id: string;
  policyId: string;
  type: CoverageType;
  label: string;
  faceAmount?: number;
  unitAmount?: number;
  unit?: "JPY" | "day" | "time";
  insuredPersonId: string;
  beneficiaryPersonId?: string;
  riderName?: string;
  isMain: boolean;
  termYears?: number;
  memo: string;
}

export interface Policy {
  id: string;
  policyNumber?: string;
  householdId: string;
  ownerId: string;
  contractorPersonId: string;
  insuredPersonIds: string[];
  insurer: string;
  productName: string;
  productCategory: ProductCategory;
  status: PolicyStatus;
  startDate: string;
  maturityDate?: string;
  surrenderDate?: string;
  monthlyPremium: number;
  annualPremium?: number;
  payMode: PayMode;
  payerPersonId?: string;
  premiumPaidUntil?: string;
  payPeriodYears?: number;
  hasCashValue: boolean;
  cashValue?: number;
  sourceOpportunityId?: string;
  /** Doc4反映: この契約の由来（新規追加 or 既存変更）。sourceOpportunityId と併存（後者は後方互換のため残す）。 */
  reflectionSource?: {
    opportunityId: string;
    proposalProductId: string;
    mode: "new" | "existing_change";
    reflectedAt: string;
    reflectedByUserId: string;
  };
  /** Doc4反映: 既存契約変更(existing_change)の値履歴（§2.4） */
  valueHistory?: PolicyValueChange[];
  coverages: Coverage[];
  renewalDate?: string;
  renewalReminderSent?: boolean;
  tags: string[];
  memo: string;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// Doc4 反映: 値変更履歴モデル（§2.4）
// =====================================================

/** 既存契約変更(existing_change)で記録する1回分の値変更 */
export interface PolicyValueChange {
  id: string;
  changedAt: string; // ISO
  changedByUserId: string;
  source: "doc4_reflection" | "manual";
  opportunityId?: string; // doc4_reflection 時
  // 履歴化する最小項目集合（§2.4 で確定）
  fields: PolicyValueDelta[];
}

/** 値変更の差分1件（変更があったフィールドのみ） */
export interface PolicyValueDelta {
  field:
    | "monthlyPremium"
    | "faceAmount"
    | "productName"
    | "insurer"
    | "payMode"
    | "status";
  before: string | number | null;
  after: string | number | null;
}

export interface PolicyStatusHistory {
  id: string;
  policyId: string;
  status: PolicyStatus;
  changedAt: string;
  changedByUserId: string;
  note?: string;
}
