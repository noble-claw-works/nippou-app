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
  coverages: Coverage[];
  renewalDate?: string;
  renewalReminderSent?: boolean;
  tags: string[];
  memo: string;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyStatusHistory {
  id: string;
  policyId: string;
  status: PolicyStatus;
  changedAt: string;
  changedByUserId: string;
  note?: string;
}
