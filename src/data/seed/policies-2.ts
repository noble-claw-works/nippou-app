// =====================================================
// シードデータ — 保険契約 9〜15 (pol9〜pol15) + POLICIES export
// =====================================================
import type { Policy } from "../../types";
import { pid, cid, mkPolicy, mkCoverage } from "./policies-helpers";
import { d, f } from "./helpers";
import { pol1, pol2, pol3, pol4, pol5, pol6, pol7, pol8 } from "./policies-1";

// ── c6: 鈴木 花代 世帯 ─────────────────────────────
export const pol9 = mkPolicy(pid(), {
  householdId: "c6",
  ownerId: "u2",
  contractorPersonId: "p_c6_head",
  insuredPersonIds: ["p_c6_head"],
  insurer: "アフラック",
  productName: "EVER PRIME 医療保険",
  productCategory: "medical",
  status: "inforce",
  policyNumber: "M-0066001",
  startDate: "2020-03-01",
  monthlyPremium: 6800,
  payMode: "monthly",
  hasCashValue: false,
  tags: ["医療保険"],
  memo: "看護師なので手厚い保障",
});
pol9.coverages = [
  mkCoverage(cid(), pol9.id, {
    type: "medical_hospital",
    label: "入院給付金日額",
    insuredPersonId: "p_c6_head",
    isMain: true,
    unitAmount: 10000,
    unit: "day",
  }),
  mkCoverage(cid(), pol9.id, {
    type: "cancer",
    label: "がん診断一時金",
    insuredPersonId: "p_c6_head",
    isMain: false,
    faceAmount: 1000000,
    unit: "JPY",
    riderName: "がん特約",
  }),
  mkCoverage(cid(), pol9.id, {
    type: "medical_surgery",
    label: "手術給付金",
    insuredPersonId: "p_c6_head",
    isMain: false,
    unitAmount: 50000,
    unit: "time",
    riderName: "手術特約",
  }),
];

// ── c8: 高橋 誠 (見込み案件 → pending 契約) ──────────
export const pol10 = mkPolicy(pid(), {
  householdId: "c8",
  ownerId: "u1",
  contractorPersonId: "p_c8_head",
  insuredPersonIds: ["p_c8_head"],
  insurer: "ソニー生命",
  productName: "スマート医療保険",
  productCategory: "medical",
  status: "pending",
  startDate: d(5),
  monthlyPremium: 3200,
  payMode: "monthly",
  hasCashValue: false,
  tags: ["医療保険"],
  memo: "申込書提出済み。査定中",
});
pol10.coverages = [
  mkCoverage(cid(), pol10.id, {
    type: "medical_hospital",
    label: "入院給付金日額",
    insuredPersonId: "p_c8_head",
    isMain: true,
    unitAmount: 5000,
    unit: "day",
  }),
];

// ── c10: 伊藤 幸子 ──────────────────────────────────
export const pol11 = mkPolicy(pid(), {
  householdId: "c10",
  ownerId: "u3",
  contractorPersonId: "p_c10_head",
  insuredPersonIds: ["p_c10_head"],
  insurer: "かんぽ生命",
  productName: "かんぽ 特別養老保険",
  productCategory: "medical",
  status: "inforce",
  policyNumber: "K-0010101",
  startDate: "2010-05-01",
  maturityDate: "2030-05-01",
  monthlyPremium: 8500,
  payMode: "monthly",
  hasCashValue: true,
  cashValue: 1100000,
  tags: ["養老保険", "入院"],
  memo: "高齢者向け。入院保障付き",
});
pol11.coverages = [
  mkCoverage(cid(), pol11.id, {
    type: "death",
    label: "死亡保険金",
    insuredPersonId: "p_c10_head",
    isMain: true,
    faceAmount: 2000000,
    unit: "JPY",
  }),
  mkCoverage(cid(), pol11.id, {
    type: "medical_hospital",
    label: "入院給付金日額",
    insuredPersonId: "p_c10_head",
    isMain: false,
    unitAmount: 4500,
    unit: "day",
    riderName: "入院特約",
  }),
];

// ── c4: 水野 幸重 ────────────────────────────────────
export const pol12 = mkPolicy(pid(), {
  householdId: "c4",
  ownerId: "u1",
  contractorPersonId: "p_c4_head",
  insuredPersonIds: ["p_c4_head"],
  insurer: "チューリッヒ",
  productName: "チューリッヒ 自動車保険",
  productCategory: "auto",
  status: "inforce",
  policyNumber: "A-0044444",
  startDate: d(90),
  renewalDate: f(275),
  monthlyPremium: 6500,
  payMode: "annual",
  annualPremium: 78000,
  hasCashValue: false,
  tags: ["自動車保険"],
  memo: "",
});
pol12.coverages = [
  mkCoverage(cid(), pol12.id, {
    type: "liability",
    label: "対人・対物賠償",
    insuredPersonId: "p_c4_head",
    isMain: true,
  }),
];

// c1: 追加 — がん保険 (pending: opp5 から発行想定)
export const pol13 = mkPolicy(pid(), {
  householdId: "c1",
  ownerId: "u1",
  contractorPersonId: "p_c1_head",
  insuredPersonIds: ["p_c1_head"],
  insurer: "メットライフ生命",
  productName: "フレキシィ がん保険",
  productCategory: "cancer",
  status: "pending",
  startDate: d(3),
  monthlyPremium: 4200,
  payMode: "monthly",
  hasCashValue: false,
  sourceOpportunityId: "opp5",
  tags: ["がん保険"],
  memo: "申込中。告知中",
});
pol13.coverages = [
  mkCoverage(cid(), pol13.id, {
    type: "cancer",
    label: "がん診断一時金",
    insuredPersonId: "p_c1_head",
    isMain: true,
    faceAmount: 2000000,
    unit: "JPY",
  }),
];

// c2: 医療保険
export const pol14 = mkPolicy(pid(), {
  householdId: "c2",
  ownerId: "u1",
  contractorPersonId: "p_c2_head",
  insuredPersonIds: ["p_c2_head"],
  insurer: "東京海上日動あんしん生命",
  productName: "医療保険 スーパーがん",
  productCategory: "cancer",
  status: "inforce",
  policyNumber: "C-0022001",
  startDate: "2015-01-01",
  monthlyPremium: 5200,
  payMode: "monthly",
  hasCashValue: false,
  tags: ["がん保険"],
  memo: "喫煙者のため保険料高め",
});
pol14.coverages = [
  mkCoverage(cid(), pol14.id, {
    type: "cancer",
    label: "がん入院給付金日額",
    insuredPersonId: "p_c2_head",
    isMain: true,
    unitAmount: 10000,
    unit: "day",
  }),
];

// c3: 賠償責任保険
export const pol15 = mkPolicy(pid(), {
  householdId: "c3",
  ownerId: "u1",
  contractorPersonId: "p_c3_head",
  insuredPersonIds: ["p_c3_head"],
  insurer: "東京海上日動",
  productName: "生産物賠償責任保険 (PL保険)",
  productCategory: "liability",
  status: "inforce",
  policyNumber: "B-0033001",
  startDate: "2023-04-01",
  renewalDate: f(295),
  monthlyPremium: 22000,
  payMode: "annual",
  annualPremium: 264000,
  hasCashValue: false,
  tags: ["法人", "賠償責任"],
  memo: "PL保険。ゴム製品製造",
});
pol15.coverages = [
  mkCoverage(cid(), pol15.id, {
    type: "liability",
    label: "賠償保険金",
    insuredPersonId: "p_c3_head",
    isMain: true,
    faceAmount: 100000000,
    unit: "JPY",
  }),
];

export const POLICIES: Policy[] = [
  pol1,
  pol2,
  pol3,
  pol4,
  pol5,
  pol6,
  pol7,
  pol8,
  pol9,
  pol10,
  pol11,
  pol12,
  pol13,
  pol14,
  pol15,
];
