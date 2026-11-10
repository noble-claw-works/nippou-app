// =====================================================
// シードデータ — 営業目標 / 契約ステータス / タスクテンプレート / 商談報告
// =====================================================
import type {
  SalesTarget,
  PolicyStatusHistory,
  TaskTemplate,
  OpportunityActivityReport,
  TaskPriority,
  OpportunityStage,
} from "../../types";
import { toPeriod } from "../../utils/salesPeriod";
import { LIFE_CATEGORIES, NONLIFE_CATEGORIES } from "../../types";
import { _lastWeekday, _oarDate2, _oarDate3, d, f } from "./helpers";
import { pol1, pol5 } from "./policies-1";
import { pol10, pol13 } from "./policies-2";

const _salesNow = new Date().toISOString();
const _P = {
  m: toPeriod(new Date(), "monthly"),
  q: toPeriod(new Date(), "quarterly"),
  y: toPeriod(new Date(), "annual"),
};

const mkTarget = (
  id: string,
  scope: SalesTarget["scope"],
  ownerId: string,
  periodType: SalesTarget["periodType"],
  period: string,
  targetPolicyCount: number,
  targetPremium: number,
  createdByUserId: string,
): SalesTarget => ({
  id,
  scope,
  ownerId,
  periodType,
  period,
  targetPolicyCount,
  targetPremium,
  memo: "",
  createdByUserId,
  createdAt: _salesNow,
  updatedAt: _salesNow,
});

export const SALES_TARGETS: SalesTarget[] = [
  // 個人 u1(袏田): 月 3 件/4万 → 四半期 9 件/12万 → 年間 36 件/48万
  mkTarget("tgt_u1_m", "individual", "u1", "monthly", _P.m, 3, 40000, "u4"),
  mkTarget("tgt_u1_q", "individual", "u1", "quarterly", _P.q, 9, 120000, "u4"),
  mkTarget("tgt_u1_y", "individual", "u1", "annual", _P.y, 36, 480000, "u4"),
  // 個人 u3(山田)
  mkTarget("tgt_u3_m", "individual", "u3", "monthly", _P.m, 2, 30000, "u4"),
  mkTarget("tgt_u3_q", "individual", "u3", "quarterly", _P.q, 6, 90000, "u4"),
  mkTarget("tgt_u3_y", "individual", "u3", "annual", _P.y, 24, 360000, "u4"),
  // 個人 u2(営2課)
  mkTarget("tgt_u2_m", "individual", "u2", "monthly", _P.m, 2, 25000, "u5"),
  mkTarget("tgt_u2_q", "individual", "u2", "quarterly", _P.q, 6, 75000, "u5"),
  // チーム t1(営1課): 月 6 件/8万 → 四半期 18 件/24万 → 年間 72 件/96万
  mkTarget("tgt_t1_m", "team", "t1", "monthly", _P.m, 6, 80000, "u5"),
  mkTarget("tgt_t1_q", "team", "t1", "quarterly", _P.q, 18, 240000, "u5"),
  mkTarget("tgt_t1_y", "team", "t1", "annual", _P.y, 72, 960000, "u5"),
  // チーム t2(営2課)
  mkTarget("tgt_t2_m", "team", "t2", "monthly", _P.m, 2, 25000, "u5"),
  mkTarget("tgt_t2_q", "team", "t2", "quarterly", _P.q, 6, 75000, "u5"),
];

export const POLICY_STATUS_HISTORY: PolicyStatusHistory[] = [
  {
    id: "ph_001",
    policyId: pol1.id,
    status: "inforce",
    changedAt: "2018-04-01T00:00:00.000Z",
    changedByUserId: "u1",
    note: "契約発行",
  },
  {
    id: "ph_002",
    policyId: pol5.id,
    status: "paid_up",
    changedAt: "2023-06-01T00:00:00.000Z",
    changedByUserId: "u1",
    note: "払込期間終了",
  },
  {
    id: "ph_003",
    policyId: pol10.id,
    status: "pending",
    changedAt: d(5) + "T10:00:00.000Z",
    changedByUserId: "u1",
    note: "申込書提出",
  },
  {
    id: "ph_004",
    policyId: pol13.id,
    status: "pending",
    changedAt: d(3) + "T10:00:00.000Z",
    changedByUserId: "u1",
    note: "申込書提出・告知中",
  },
];

// =====================================================
// タスク初期値マスタ (TaskTemplate) — ADR-TASK-MASTER
// =====================================================
const _tmplNow = new Date().toISOString();

export const TASK_TEMPLATES: TaskTemplate[] = [
  // ── 世帯作成時（household_created）──────────────────────────────────────
  {
    id: "tmpl_h01",
    title: "初回面談アポイント取得",
    scope: "household",
    trigger: "household_created",
    productCategories: null,
    defaultDueOffsetDays: 7,
    defaultPriority: "high" as TaskPriority,
    order: 10,
    isActive: true,
    createdAt: _tmplNow,
    updatedAt: _tmplNow,
  },
  {
    id: "tmpl_h02",
    title: "家族構成・加入状況ヒアリング",
    scope: "household",
    trigger: "household_created",
    productCategories: null,
    defaultDueOffsetDays: 14,
    defaultPriority: "medium" as TaskPriority,
    order: 20,
    isActive: true,
    createdAt: _tmplNow,
    updatedAt: _tmplNow,
  },

  // ── 案件作成時（opportunity_created）──────────────────────────────────────
  {
    id: "tmpl_o01",
    title: "ニーズ分析シート作成",
    scope: "opportunity",
    trigger: "opportunity_created",
    productCategories: null,
    defaultDueOffsetDays: 5,
    defaultPriority: "high" as TaskPriority,
    order: 10,
    isActive: true,
    createdAt: _tmplNow,
    updatedAt: _tmplNow,
  },
  {
    id: "tmpl_o02",
    title: "意向確認書取得",
    scope: "opportunity",
    trigger: "opportunity_created",
    productCategories: null,
    defaultPriority: "medium" as TaskPriority,
    order: 20,
    isActive: true,
    createdAt: _tmplNow,
    updatedAt: _tmplNow,
  },

  // ── ステージ到達（stage_reached / proposal）──────────────────────────────
  {
    id: "tmpl_s_proposal01",
    title: "提案書作成・送付",
    scope: "opportunity",
    trigger: "stage_reached",
    triggerStage: "proposal" as OpportunityStage,
    productCategories: null,
    defaultDueOffsetDays: 5,
    defaultPriority: "high" as TaskPriority,
    order: 10,
    isActive: true,
    createdAt: _tmplNow,
    updatedAt: _tmplNow,
  },
  {
    id: "tmpl_s_proposal02",
    title: "署名・記名押印確認",
    scope: "opportunity",
    trigger: "stage_reached",
    triggerStage: "proposal" as OpportunityStage,
    productCategories: null,
    defaultDueOffsetDays: 14,
    defaultPriority: "medium" as TaskPriority,
    order: 20,
    isActive: true,
    createdAt: _tmplNow,
    updatedAt: _tmplNow,
  },

  // ── ステージ到達（stage_reached / issued）──────────────────────────────
  {
    id: "tmpl_s_issued01",
    title: "証券回収",
    scope: "opportunity",
    trigger: "stage_reached",
    triggerStage: "issued" as OpportunityStage,
    productCategories: null,
    defaultDueOffsetDays: 30,
    defaultPriority: "high" as TaskPriority,
    order: 10,
    isActive: true,
    createdAt: _tmplNow,
    updatedAt: _tmplNow,
  },
  {
    id: "tmpl_s_issued02",
    title: "ポリシーレビュー実施",
    scope: "opportunity",
    trigger: "stage_reached",
    triggerStage: "issued" as OpportunityStage,
    productCategories: null,
    defaultDueOffsetDays: 60,
    defaultPriority: "medium" as TaskPriority,
    order: 20,
    isActive: true,
    createdAt: _tmplNow,
    updatedAt: _tmplNow,
  },

  // ── 商品追加時（product_added / 生保系）──────────────────────────────────
  {
    id: "tmpl_p_life01",
    title: "告知書取得",
    scope: "product",
    trigger: "product_added",
    productCategories: LIFE_CATEGORIES,
    defaultDueOffsetDays: 7,
    defaultPriority: "high" as TaskPriority,
    order: 10,
    isActive: true,
    createdAt: _tmplNow,
    updatedAt: _tmplNow,
  },
  {
    id: "tmpl_p_life02",
    title: "保険料シミュレーション確認",
    scope: "product",
    trigger: "product_added",
    productCategories: LIFE_CATEGORIES,
    defaultPriority: "medium" as TaskPriority,
    order: 20,
    isActive: true,
    createdAt: _tmplNow,
    updatedAt: _tmplNow,
  },

  // ── 商品追加時（product_added / 損保系）──────────────────────────────────
  {
    id: "tmpl_p_nonlife01",
    title: "車検証・契約者確認",
    scope: "product",
    trigger: "product_added",
    productCategories: NONLIFE_CATEGORIES,
    defaultDueOffsetDays: 7,
    defaultPriority: "high" as TaskPriority,
    order: 10,
    isActive: true,
    createdAt: _tmplNow,
    updatedAt: _tmplNow,
  },
  {
    id: "tmpl_p_nonlife02",
    title: "既存保険証書確認",
    scope: "product",
    trigger: "product_added",
    productCategories: NONLIFE_CATEGORIES,
    defaultPriority: "medium" as TaskPriority,
    order: 20,
    isActive: true,
    createdAt: _tmplNow,
    updatedAt: _tmplNow,
  },
];

// =====================================================
// 商談活動報告 シードデータ（F4: 報告→日報反映デモ充実）
// oar_demo_opp1: _lastWeekday の日報 (u1) に sourceReportId で紐付け
// oar_demo_opp2: d(3) の日報 (u1) に sourceReportId で紐付け（齋藤家）
// oar_demo_opp3: d(5) の日報 (u1) に sourceReportId で紐付け（水野家）
// ※ ストアの oppActivityReports 初期値として使用
// =====================================================
export const OPP_ACTIVITY_REPORTS: OpportunityActivityReport[] = [
  {
    id: "oar_demo_opp1",
    opportunityId: "opp1",
    userId: "u1",
    reportDate: _lastWeekday,
    activityType: "visit",
    summary:
      "設計書の詳細を説明。お客様より「配偶者分も検討したい」とのご意向。次回面談で配偶者用設計書を提出予定。",
    nextAction: "配偶者分の追加設計書作成・提出",
    nextActionDate: f(2),
    reachedMilestones: {},
    confidence: "A",
    createdAt: _lastWeekday + "T15:00:00",
    updatedAt: _lastWeekday + "T15:00:00",
  },
  {
    id: "oar_demo_opp2",
    opportunityId: "opp2",
    userId: "u1",
    reportDate: _oarDate2,
    activityType: "phone",
    summary:
      "告知書の未記入箇所（貧血歴）について電話で確認。本人記憶が曖昧なため、主治医への問い合わせを依頼した。奥様の同席希望を再確認し、来週の面談日程を調整中。",
    nextAction: "奥様同席の面談日程確定・告知書再記入",
    nextActionDate: f(5),
    reachedMilestones: {},
    confidence: "B",
    createdAt: _oarDate2 + "T16:30:00",
    updatedAt: _oarDate2 + "T16:30:00",
  },
  {
    id: "oar_demo_opp3",
    opportunityId: "opp3",
    userId: "u1",
    reportDate: _oarDate3,
    activityType: "phone",
    summary:
      "申込書の記入方法について電話でご案内。記入済みの書類を今週中に持参いただけるとのこと。弁護士費用特約の説明も追加で実施。お客様の意向は高く、申込確度はS。",
    nextAction: "申込書類の回収・引受審査提出",
    nextActionDate: f(2),
    reachedMilestones: {
      contract: true,
    },
    confidence: "S",
    createdAt: _oarDate3 + "T11:00:00",
    updatedAt: _oarDate3 + "T11:00:00",
  },
];
