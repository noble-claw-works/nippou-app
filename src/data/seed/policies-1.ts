// =====================================================
// シードデータ — 保険契約 1〜8 (pol1〜pol8)
// =====================================================
import { pid, cid, mkPolicy, mkCoverage } from "./policies-helpers";
import { d, f } from "./helpers";

export const pol1 = mkPolicy(pid(), {
  householdId: "c1",
  ownerId: "u1",
  contractorPersonId: "p_c1_head",
  insuredPersonIds: ["p_c1_head"],
  insurer: "日本生命",
  productName: "ニッセイ終身保険",
  productCategory: "life",
  status: "inforce",
  policyNumber: "L-0001234",
  startDate: "2018-04-01",
  maturityDate: "2058-04-01",
  monthlyPremium: 28000,
  payMode: "monthly",
  hasCashValue: true,
  cashValue: 1200000,
  tags: ["生命保険", "終身"],
  memo: "死亡保険金3000万。受取人: 配偶者",
});
pol1.coverages = [
  mkCoverage(cid(), pol1.id, {
    type: "death",
    label: "死亡保険金",
    insuredPersonId: "p_c1_head",
    isMain: true,
    faceAmount: 30000000,
    unit: "JPY",
    beneficiaryPersonId: "p_c1_spouse",
  }),
  mkCoverage(cid(), pol1.id, {
    type: "living_benefit",
    label: "生前給付特約",
    insuredPersonId: "p_c1_head",
    isMain: false,
    faceAmount: 30000000,
    unit: "JPY",
    riderName: "生前給付特約",
  }),
];

export const pol2 = mkPolicy(pid(), {
  householdId: "c1",
  ownerId: "u1",
  contractorPersonId: "p_c1_head",
  insuredPersonIds: ["p_c1_spouse"],
  insurer: "第一生命",
  productName: "ファインセーブ 医療保険",
  productCategory: "medical",
  status: "inforce",
  policyNumber: "M-0005678",
  startDate: "2019-07-01",
  monthlyPremium: 4500,
  payMode: "monthly",
  hasCashValue: false,
  tags: ["医療保険"],
  memo: "妻の医療保険。入院日額5000円",
});
pol2.coverages = [
  mkCoverage(cid(), pol2.id, {
    type: "medical_hospital",
    label: "入院給付金日額",
    insuredPersonId: "p_c1_spouse",
    isMain: true,
    unitAmount: 5000,
    unit: "day",
  }),
  mkCoverage(cid(), pol2.id, {
    type: "medical_surgery",
    label: "手術給付金",
    insuredPersonId: "p_c1_spouse",
    isMain: false,
    unitAmount: 50000,
    unit: "time",
    riderName: "手術特約",
  }),
];

export const pol3 = mkPolicy(pid(), {
  householdId: "c1",
  ownerId: "u1",
  contractorPersonId: "p_c1_head",
  insuredPersonIds: ["p_c1_child1"],
  insurer: "明治安田生命",
  productName: "じぶんの積立 学資保険",
  productCategory: "savings",
  status: "inforce",
  policyNumber: "S-0009012",
  startDate: "2016-09-01",
  maturityDate: "2023-04-01",
  monthlyPremium: 12000,
  payMode: "monthly",
  hasCashValue: true,
  cashValue: 800000,
  tags: ["学資保険", "積立"],
  memo: "長男 大学入学時満期。満期金200万",
});
pol3.coverages = [
  mkCoverage(cid(), pol3.id, {
    type: "savings",
    label: "満期保険金",
    insuredPersonId: "p_c1_child1",
    isMain: true,
    faceAmount: 2000000,
    unit: "JPY",
  }),
];

// c1 自動車保険 (opp7 から発行済)
export const pol4 = mkPolicy(pid(), {
  householdId: "c1",
  ownerId: "u1",
  contractorPersonId: "p_c1_head",
  insuredPersonIds: ["p_c1_head"],
  insurer: "東京海上日動",
  productName: "タフ・くるまの保険",
  productCategory: "auto",
  status: "inforce",
  policyNumber: "A-0011111",
  startDate: d(14),
  renewalDate: f(351),
  monthlyPremium: 8900,
  payMode: "annual",
  annualPremium: 106800,
  hasCashValue: false,
  sourceOpportunityId: "opp7",
  tags: ["自動車保険"],
  memo: "弁護士費用特約+車両保険",
});
pol4.coverages = [
  mkCoverage(cid(), pol4.id, {
    type: "liability",
    label: "対人・対物賠償",
    insuredPersonId: "p_c1_head",
    isMain: true,
  }),
  mkCoverage(cid(), pol4.id, {
    type: "asset_damage",
    label: "車両保険",
    insuredPersonId: "p_c1_head",
    isMain: false,
    faceAmount: 1800000,
    unit: "JPY",
    riderName: "車両保険",
  }),
];

// ── c2: 齋藤 和久 世帯 ─────────────────────────────
export const pol5 = mkPolicy(pid(), {
  householdId: "c2",
  ownerId: "u1",
  contractorPersonId: "p_c2_head",
  insuredPersonIds: ["p_c2_head"],
  insurer: "住友生命",
  productName: "終身保険 スミセイ",
  productCategory: "life",
  status: "paid_up",
  policyNumber: "L-0022334",
  startDate: "1998-06-01",
  maturityDate: "2048-06-01",
  monthlyPremium: 0,
  payMode: "lump_sum",
  premiumPaidUntil: "2023-06-01",
  payPeriodYears: 25,
  hasCashValue: true,
  cashValue: 3500000,
  tags: ["終身保険"],
  memo: "払込完了。解約返戻金350万",
});
pol5.coverages = [
  mkCoverage(cid(), pol5.id, {
    type: "death",
    label: "死亡保険金",
    insuredPersonId: "p_c2_head",
    isMain: true,
    faceAmount: 10000000,
    unit: "JPY",
  }),
];

export const pol6 = mkPolicy(pid(), {
  householdId: "c2",
  ownerId: "u1",
  contractorPersonId: "p_c2_head",
  insuredPersonIds: ["p_c2_head"],
  insurer: "あいおいニッセイ同和",
  productName: "タフ・くるまの保険",
  productCategory: "auto",
  status: "inforce",
  policyNumber: "A-0022222",
  startDate: d(180),
  renewalDate: f(185),
  monthlyPremium: 7200,
  payMode: "annual",
  annualPremium: 86400,
  hasCashValue: false,
  tags: ["自動車保険"],
  memo: "",
});
pol6.coverages = [
  mkCoverage(cid(), pol6.id, {
    type: "liability",
    label: "対人・対物賠償",
    insuredPersonId: "p_c2_head",
    isMain: true,
  }),
];

// ── c3: 暁和化学ゴム (法人) ─────────────────────────
export const pol7 = mkPolicy(pid(), {
  householdId: "c3",
  ownerId: "u1",
  contractorPersonId: "p_c3_head",
  insuredPersonIds: ["p_c3_head"],
  insurer: "損保ジャパン",
  productName: "企業総合保険 (工場火災)",
  productCategory: "fire",
  status: "inforce",
  policyNumber: "F-0033333",
  startDate: "2024-04-01",
  renewalDate: f(295),
  monthlyPremium: 38000,
  payMode: "annual",
  annualPremium: 456000,
  hasCashValue: false,
  tags: ["法人", "火災保険"],
  memo: "工場・在庫一式。山田部長承認済み",
});
pol7.coverages = [
  mkCoverage(cid(), pol7.id, {
    type: "asset_damage",
    label: "建物・設備損害",
    insuredPersonId: "p_c3_head",
    isMain: true,
    faceAmount: 200000000,
    unit: "JPY",
  }),
];

export const pol8 = mkPolicy(pid(), {
  householdId: "c3",
  ownerId: "u1",
  contractorPersonId: "p_c3_head",
  insuredPersonIds: ["p_c3_head"],
  insurer: "第一生命",
  productName: "経営者保険 プレミア",
  productCategory: "life",
  status: "inforce",
  policyNumber: "L-0033444",
  startDate: "2022-10-01",
  maturityDate: "2042-10-01",
  monthlyPremium: 65000,
  payMode: "monthly",
  hasCashValue: true,
  cashValue: 5200000,
  tags: ["法人", "経営者保険"],
  memo: "役員退職金積立。解約返戻金型",
});
pol8.coverages = [
  mkCoverage(cid(), pol8.id, {
    type: "death",
    label: "死亡保険金",
    insuredPersonId: "p_c3_head",
    isMain: true,
    faceAmount: 50000000,
    unit: "JPY",
  }),
  mkCoverage(cid(), pol8.id, {
    type: "savings",
    label: "解約返戻金",
    insuredPersonId: "p_c3_head",
    isMain: false,
    memo: "退職金積立目的",
  }),
];
