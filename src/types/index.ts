// =====================================================
// 型定義 - 305-hrl-nippou-app
// =====================================================

export type Role = "general" | "manager" | "executive" | "admin";
export type ReportStatus =
  "planning" | "in_progress" | "submitted" | "confirmed";
export type BlockType =
  "visit" | "office" | "phone" | "travel" | "break" | "meeting" | "lunch";
export type CustomerType = "individual" | "corporate" | "prospect";
export type CustomerStatus = "active" | "inactive";

// === Household (世帯) 型 — CustomerType/Status と互換 ===
export type HouseholdType = CustomerType;
export type HouseholdStatus = CustomerStatus;

export type PersonRelation =
  "head" | "spouse" | "child" | "parent" | "sibling" | "other";
export type PersonGender = "M" | "F" | "other";
export type UserStatus = "active" | "inactive" | "invited";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  teamIds: string[];
  status: UserStatus;
  lastLogin?: string;
  avatarInitials: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  managerIds: string[];
  memberIds: string[];
}

export interface Household {
  id: string;
  name: string; // 「田中家」「ABC商事」
  type: HouseholdType;
  area: string;
  primaryUserId: string; // 担当者
  headPersonId?: string; // 世帯主 (Person.id, 個人世帯のみ意味あり)
  address?: string;
  familyMemo: string; // 家族構成メモ
  tags: string[];
  memo: string;
  status: HouseholdStatus;
  lastContactDate?: string;
  nextAppointment?: string;
  isFavorite?: boolean;
  annualIncome?: number; // ★NEW 年収（円）契約者=世帯に従属 (§3-6)
  tasks?: Task[]; // ★NEW 世帯スコープの汎用タスク (ADR-TASK-MASTER)
}

// 互換エイリアス — 既存コードを壊さない (deprecated)
export type Customer = Household;

export interface Person {
  id: string;
  householdId: string;
  name: string;
  kana?: string;
  relation: PersonRelation;
  birthDate?: string; // YYYY-MM-DD
  gender?: PersonGender;
  occupation?: string;
  smoker?: boolean;
  healthNotes?: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
}

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
// 汎用タスク (ADR-TASK-MASTER) — 2026-08-25
// =====================================================

/** タスク付与スコープ（主上決裁 2026-08-17 14:07） */
export type TaskScope = "household" | "opportunity" | "product";

/** タスク優先度 */
export type TaskPriority = "high" | "medium" | "low";

/** 自動登録トリガー種別 */
export type TaskTriggerType =
  | "household_created" // 世帯作成時
  | "opportunity_created" // 案件作成時
  | "product_added" // 商品追加時
  | "stage_reached"; // ステージ到達時

/**
 * 汎用タスク（永続）。世帯／案件／商品のいずれかに紐づき0..n個。
 * 自動生成（マスタ由来）と手動追加が同一型で共存する。
 */
export interface Task {
  id: string;
  title: string; // タスク名（自由入力可）
  done: boolean; // 完了フラグ
  doneDate?: string; // 完了日 (YYYY-MM-DD)
  dueDate?: string; // 期限 (YYYY-MM-DD)
  ownerId?: string; // 担当 User.id
  memo?: string; // メモ
  priority: TaskPriority; // 優先度（既定 'medium'）
  rolledOver: boolean; // 繰越フラグ
  scope: TaskScope; // 'household' | 'opportunity' | 'product'
  householdId?: string; // scope='household' のとき対象 Household.id
  productId?: string; // scope='product' のとき対象 ProposalProduct.id
  sourceMasterId?: string; // 生成元 TaskTemplate.id。手動追加は undefined
  createdAt: string;
}

/**
 * タスク初期値マスタ。管理者編集可。
 */
export interface TaskTemplate {
  id: string;
  title: string; // 生成されるタスクのタイトル
  scope: TaskScope; // 生成タスクの scope
  trigger: TaskTriggerType; // 発火トリガー
  productCategories: ProductCategory[] | null; // 商品カテゴリ条件 (productスコープのみ適用)
  triggerStage?: OpportunityStage; // trigger='stage_reached' のとき定義ステージ
  defaultDueOffsetDays?: number; // 期限オフセット（N日後）
  defaultPriority: TaskPriority; // 生成タスクの既定優先度
  defaultMemo?: string; // 生成タスクの既定メモ
  order: number; // 表示順
  isActive: boolean; // falseの定義は生成に使わない
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

export interface TimeBlock {
  id: string;
  reportId: string;
  type: BlockType;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  customerId?: string;
  opportunityId?: string; // 紐付け案件 (Phase 2)
  title: string;
  memo: string;
  isPlanned: boolean;
  isActual: boolean;
  attachments: Attachment[];
  /** 実績化時にスナップショット元の予定ブロック id を保持。予定ブロックは未設定 */
  plannedBlockId?: string;
  // 訪問結果（visit ブロックのみ使用）
  collected?: boolean; // 集金済み
  nextAppointment?: string; // 次回AP (YYYY-MM-DD)
  proposal?: string; // 提案内容
  result?: string; // 対応結果メモ
  /** ★NEW この活動ブロックが OpportunityActivityReport から生成された場合その id（ADR-B4 v2） */
  sourceReportId?: string;
}

export interface Todo {
  id: string;
  reportId: string;
  text: string;
  completed: boolean;
  status: "todo" | "doing" | "done";
  rolledOver: boolean;
  dueDate?: string;
  priority: "high" | "medium" | "low";
  /** 付帯情報判定用: 当該 TODO が紐づく顧客 ID */
  customerId?: string;
  opportunityId?: string; // 紐付け案件 (Phase 2)
}

export interface CustomerVisit {
  id: string;
  reportId: string;
  customerId: string;
  blockId?: string;
  memo: string;
  collection?: string;
  nextAppointment?: string;
  proposal?: string;
}

export interface Comment {
  id: string;
  reportId: string;
  userId: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export type MoodType = "sunny" | "partly_cloudy" | "cloudy" | "rainy";
export type ManagerSignal = "consult" | "listen" | "ok" | null;

export interface ManagerCommentReply {
  userId: string;
  choice: "yes" | "no";
  repliedAt: string;
}

export interface ManagerComment {
  id: string;
  dayKey: string; // YYYY-MM-DD (日報特定用)
  authorUserId: string;
  /** 表示用ロール — 上長コメント: 'manager'|'executive', 部下コメント: 'general' (optional for backward compat) */
  authorRole?: "manager" | "executive" | "general";
  body: string;
  createdAt: string;
  replies: ManagerCommentReply[];
}

export interface Compliment {
  id: string;
  dayKey: string; // YYYY-MM-DD
  customerId?: string;
  customerName?: string;
  opportunityId?: string; // 紐付け案件 (Phase 2)
  type: "praise" | "request";
  body: string;
  createdAt: string;
}

export interface DailyReport {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  status: ReportStatus;
  mainTheme: string;
  monthlyTheme: string;
  dailyTheme: string;
  blocks: TimeBlock[];
  todos: Todo[];
  customerVisits: CustomerVisit[];
  gratitude: string[];
  morningMood: MoodType | null;
  eveningMood: MoodType | null;
  managerSignal: ManagerSignal;
  selfComment: string;
  comments: Comment[];
  attachments: Attachment[];
  submittedAt?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  version: number;
  status: "draft" | "published";
  isDefault: boolean;
  isActive: boolean;
  blocks: TemplateBlock[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateBlock {
  id: string;
  type:
    | "single_line"
    | "multi_line"
    | "timeline"
    | "todo"
    | "customer"
    | "radio"
    | "yn"
    | "number"
    | "attachment";
  label: string;
  required: boolean;
  order: number;
  config?: Record<string, unknown>;
}

export interface QuickChip {
  id: string;
  userId: string;
  label: string;
  emoji: string;
  blockType: BlockType;
  order: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: "comment" | "sent_back" | "confirmed" | "reminder" | "other";
  title: string;
  body: string;
  isRead: boolean;
  relatedReportId?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  ip: string;
  userAgent: string;
  result: "success" | "failure";
  diff?: Record<string, { before: unknown; after: unknown }>;
  createdAt: string;
}

// =====================================================
// Policy (保険契約) 型 — Phase 3
// =====================================================

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

// =====================================================
// SalesTarget (営業目標 / ノルマ) 型 — Phase 4
// =====================================================

/** 目標の対象スコープ: 個人 or チーム */
export type TargetScope = "individual" | "team";

/** 目標期間種別。既定は月次。四半期・年間もサポート */
export type TargetPeriodType = "monthly" | "quarterly" | "annual";

/**
 * 営業目標(ノルマ)。個人単位・チーム単位の双方を1型で表す。
 * scope='individual' のとき ownerId=User.id、scope='team' のとき ownerId=Team.id。
 * period 書式は periodType により固定:
 *   monthly   → 'YYYY-MM'   (例 '2026-07')
 *   quarterly → 'YYYY-Qn'   (例 '2026-Q3', n=1..4)
 *   annual    → 'YYYY'      (例 '2026')
 * 同一 owner が monthly/quarterly/annual を並存可能。突合キーは (scope, ownerId, periodType, period)。
 */
export interface SalesTarget {
  id: string;
  scope: TargetScope;
  ownerId: string; // scope=individual → User.id / scope=team → Team.id
  periodType: TargetPeriodType; // 既定 'monthly'
  period: string; // 'YYYY-MM' | 'YYYY-Qn' | 'YYYY'
  /** 成約件数の目標 (Policy inforce 化ベース) */
  targetPolicyCount: number;
  /** 成約保険料額の目標。月換算保険料の合計 (monthlyPremium ベース) */
  targetPremium: number;
  memo: string;
  createdByUserId: string; // 設定者 (manager/admin)
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface TrackingSession {
  id: string;
  userId: string;
  blockType: BlockType;
  customerId?: string;
  memo: string;
  startedAt: string;
  pausedAt?: string;
  endedAt?: string;
  status: "running" | "paused" | "ended" | "discarded";
}
