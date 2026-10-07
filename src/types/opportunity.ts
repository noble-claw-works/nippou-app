// =====================================================
// opportunity.ts — 商談案件 / パイプライン型
// =====================================================

import type { Task } from "./task";

// =====================================================
// Opportunity (商談案件) 型 — Phase 2
// =====================================================

export type OpportunityStage =
  | "approach" // 🌱 アプローチ (関係構築)
  | "fact_finding" // 🔍 ヒアリング (家族構成・既契約棚卸)
  | "needs_analysis" // 📊 ニーズ分析
  | "proposal" // 📄 設計書提示
  | "negotiation" // 💬 検討中 (質問対応)
  | "application" // ✍️ 申込書記入
  | "underwriting" // 🏥 引受査定中
  | "issued" // 🎉 証券発行 (won)
  | "lost"; // ❌ 失注

export type OpportunityStatus =
  "open" | "won" | "partial_won" | "lost" | "on_hold";

export type LostReason =
  | "price"
  | "competitor"
  | "family_oppose"
  | "health_decline"
  | "no_need"
  | "timing"
  | "budget"
  | "undecided"
  | "lost_contact"
  | "other";

export type ProductCategory =
  | "life"
  | "medical"
  | "cancer"
  | "income"
  | "nursing"
  | "savings"
  | "auto"
  | "fire"
  | "liability"
  | "other";

export interface ProposalProduct {
  id: string;
  productCategory: ProductCategory;
  productName: string;
  insurer: string; // 保険会社
  insuredPersonId: string; // 被保険者
  monthlyPremium: number; // 月払額
  faceAmount?: number; // 保険金額
  firstYearCommission?: number; // ★NEW 初年度手数料（円）salesPerf first_year_commission と整合 (§3-4)
  firstConsultDate?: string; // 初回相談日 YYYY-MM-DD（商品行ごとに保持）
  memo: string;

  // ── NEW（ADR-B3 A案・例外の進捗ズレ用。すべて任意。未設定＝案件の値を継承）──
  stage?: OpportunityStage; // 商品個別ステージ。未設定なら Opportunity.stage を継承
  milestones?: ContractMilestones; // 商品個別のステージ日付。未設定なら案件 milestones を継承
}

export interface OpportunityStageHistory {
  stage: OpportunityStage;
  changedAt: string;
  changedByUserId: string;
  note?: string;
}

// =====================================================
// 案件管理パイプライン拡張型 — Phase B-1 (§3・§9 準拠 2026-07-08)
// =====================================================

/** 販売チャネルマスタ。親子2階層（parentId=null が最上位分類）。(§3-1) */
export interface SalesChannel {
  id: string;
  name: string; // 例(親): '代理店' / 例(子): 'ABC代理店 新宿支店'
  parentId: string | null; // null=最上位（チャネル分類）、値あり=子（チャネル詳細）
  isActive: boolean; // 廃止チャネルは false（履歴の案件参照は残す）
  order: number; // 表示順
  memo?: string;
}

/**
 * 契約パイプラインの日付付きステージ。(§3-2)
 * 既存 stage/stageHistory（9段 funnel）とは別レイヤー。
 * 各日付は「そのイベントが起きた日」。未達なら undefined。
 */
export interface ContractMilestones {
  firstConsultDate?: string; // 初回相談日 (YYYY-MM-DD)
  lifePlanDate?: string; // LP提案日（ライフプラン提案）
  proposalDate?: string; // 提案日（設計書提示）
  applicationDate?: string; // ★契約予定日（=申込予定日。ADR-B4 v2 語義確定）
  contractDate?: string; // ★NEW 契約日（元シート「契約日」列。契約予定日と別物。ADR-B4 v2）
  establishedDate?: string; // 成立日（成立=会計上の実績確定日）
  inceptionDate?: string; // ★始期日（主に損保。主上確定 2026-07-08）
  lostDate?: string; // 失注日
}

/**
 * 不備項目。選択式ではなく「転記方式」——項目名と内容を書き写す。(§3-5)
 * ★主上確定 2026-07-08: 選択ではなく転記方式
 */
export interface DeficiencyItem {
  id: string;
  item: string; // 不備項目名（転記）例: '告知書未記入'
  detail?: string; // 不備内容（転記）
  resolved: boolean; // 解消済み
  resolvedDate?: string;
}

/**
 * 統一見込確度ラダー（生損共通・案件単位1値）(§3-5)
 * ★主上確定 2026-07-08: 統一する。案件ごとに1値設定
 * 生保は運用上 C/D を使わないが型上は許容
 */
export type ConfidenceUnified = "fixed" | "S" | "A" | "B" | "C" | "D";

/**
 * 提案ラウンド。1案件で提案は複数回でき、回ごとに提案日・修正日・提案商品セットを持つ。
 * ADR-B4 v2 追加機能2。元シート「記録」グループの提案日/修正日に対応。
 */
export interface ProposalRound {
  id: string;
  roundNo: number; // 1,2,3... 提案回
  proposalDate: string; // この回の提案日（元シート「提案日」）
  revisedDate?: string; // この回の修正日（元シート「修正日」）
  /** この回で提案した商品構成のスナップショット（ProposalProduct.id 群） */
  productIds: string[]; // 参照する ProposalProduct.id（商品構成が回ごとに変わりうる）
  memo?: string;
  createdAt: string;
}

/**
 * 商談活動報告。案件(世帯商談)単位・報告日単位。ADR-B4 v2 要件5の正本。
 * 日報(DailyReport)へは本 entity から「当日の活動サマリ」を導出/生成する。
 */
export interface OpportunityActivityReport {
  id: string;
  opportunityId: string; // 対象案件
  userId: string; // 報告者
  reportDate: string; // 報告日 YYYY-MM-DD（＝日報日と紐付く）
  // ── 活動内容 ──
  activityType: "visit" | "phone" | "web" | "other"; // 面談/電話/オンライン/その他
  summary: string; // 活動サマリ
  proposalDetail?: string; // 提案内容（提案した場合）
  nextAction?: string; // 次アクション
  nextActionDate?: string; // 次回アポ/次アクション日
  collected?: boolean; // 集金
  // ── 局面到達（reachedMilestones の日付を milestones にセット） ──
  reachedMilestones?: Partial<
    Record<
      "firstConsult" | "lifePlan" | "proposal" | "contract" | "established",
      boolean
    >
  >;
  // ── 確度・不備・意向/署名の更新 ──
  confidence?: ConfidenceUnified; // この報告時点の見込確度
  deficiencyNote?: string; // 不備メモ（案件 deficiencies へ反映）
  createdAt: string;
  updatedAt: string;
}

/** 生保系カテゴリ定数 (LIFE_CATEGORIES) */
export const LIFE_CATEGORIES: ProductCategory[] = [
  "life",
  "medical",
  "cancer",
  "income",
  "nursing",
  "savings",
];

/** 損保系カテゴリ定数 (NONLIFE_CATEGORIES) */
export const NONLIFE_CATEGORIES: ProductCategory[] = [
  "auto",
  "fire",
  "liability",
];

export interface Opportunity {
  id: string;
  householdId: string;
  ownerId: string;
  title: string;
  targetPersonIds: string[]; // 提案対象世帯員
  stage: OpportunityStage;
  status: OpportunityStatus;
  productCategories: ProductCategory[];
  proposalProducts: ProposalProduct[];
  totalMonthlyPremium?: number; // 合計月払 (proposalProducts から自動計算)
  expectedCloseDate?: string; // ★契約予定日=申込予定日（主上確定 2026-07-08）
  actualCloseDate?: string;
  lostReason?: LostReason;
  lostReasonDetail?: string;
  nextAction?: string;
  nextActionDate?: string;
  needsAnalysisDone: boolean;
  illustrationProvided: boolean;
  stageHistory: OpportunityStageHistory[]; // ステージ変更履歴
  tags: string[];
  memo: string; // ★備考（メモ全般）として流用
  createdAt: string;
  updatedAt: string;

  // ── NEW（契約パイプライン拡張。すべて任意で非破壊）── (§3-5)
  contractorPersonId?: string; // 契約者 Person.id（世帯主とは限らない）
  channelId?: string; // チャネル（葉）SalesChannel.id
  confidence?: ConfidenceUnified; // 見込確度（★統一ラダー・案件単位1値・主上確定）
  milestones?: ContractMilestones; // ステージ日付（8種・ADR-B4 v2 contractDate 追加）
  tasks?: Task[]; // ★NEW 案件・商品スコープの汎用タスク (ADR-TASK-MASTER)
  deficiencies?: DeficiencyItem[]; // ★不備（項目化・転記方式。主上確定 2026-07-08）
  proposals?: ProposalRound[]; // ★NEW 提案ラウンド履歴（ADR-B4 v2 追加機能2）
}
