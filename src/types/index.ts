// =====================================================
// 型定義 - 305-hrl-nippou-app
// =====================================================

export type Role = 'general' | 'manager' | 'executive' | 'admin';
export type ReportStatus = 'planning' | 'in_progress' | 'submitted' | 'confirmed';
export type BlockType = 'visit' | 'office' | 'phone' | 'travel' | 'break' | 'meeting' | 'lunch';
export type CustomerType = 'individual' | 'corporate' | 'prospect';
export type CustomerStatus = 'active' | 'inactive';

// === Household (世帯) 型 — CustomerType/Status と互換 ===
export type HouseholdType = CustomerType;
export type HouseholdStatus = CustomerStatus;

export type PersonRelation = 'head' | 'spouse' | 'child' | 'parent' | 'sibling' | 'other';
export type PersonGender = 'M' | 'F' | 'other';
export type UserStatus = 'active' | 'inactive' | 'invited';

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
  name: string;              // 「田中家」「ABC商事」
  type: HouseholdType;
  area: string;
  primaryUserId: string;     // 担当者
  headPersonId?: string;     // 世帯主 (Person.id, 個人世帯のみ意味あり)
  address?: string;
  familyMemo: string;        // 家族構成メモ
  tags: string[];
  memo: string;
  status: HouseholdStatus;
  lastContactDate?: string;
  nextAppointment?: string;
  isFavorite?: boolean;
  annualIncome?: number;     // ★NEW 年収（円）契約者=世帯に従属 (§3-6)
}

// 互換エイリアス — 既存コードを壊さない (deprecated)
export type Customer = Household;

export interface Person {
  id: string;
  householdId: string;
  name: string;
  kana?: string;
  relation: PersonRelation;
  birthDate?: string;        // YYYY-MM-DD
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
  | 'approach'        // 🌱 アプローチ (関係構築)
  | 'fact_finding'    // 🔍 ヒアリング (家族構成・既契約棚卸)
  | 'needs_analysis'  // 📊 ニーズ分析
  | 'proposal'        // 📄 設計書提示
  | 'negotiation'     // 💬 検討中 (質問対応)
  | 'application'     // ✍️ 申込書記入
  | 'underwriting'    // 🏥 引受査定中
  | 'issued'          // 🎉 証券発行 (won)
  | 'lost';           // ❌ 失注

export type OpportunityStatus = 'open' | 'won' | 'partial_won' | 'lost' | 'on_hold';

export type LostReason =
  | 'price' | 'competitor' | 'family_oppose' | 'health_decline'
  | 'no_need' | 'timing' | 'budget' | 'undecided'
  | 'lost_contact' | 'other';

export type ProductCategory =
  | 'life' | 'medical' | 'cancer' | 'income' | 'nursing'
  | 'savings' | 'auto' | 'fire' | 'liability' | 'other';

export interface ProposalProduct {
  id: string;
  productCategory: ProductCategory;
  productName: string;
  insurer: string;              // 保険会社
  insuredPersonId: string;      // 被保険者
  monthlyPremium: number;       // 月払額
  faceAmount?: number;          // 保険金額
  firstYearCommission?: number; // ★NEW 初年度手数料（円）salesPerf first_year_commission と整合 (§3-4)
  memo: string;
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
  name: string;               // 例(親): '代理店' / 例(子): 'ABC代理店 新宿支店'
  parentId: string | null;    // null=最上位（チャネル分類）、値あり=子（チャネル詳細）
  isActive: boolean;          // 廃止チャネルは false（履歴の案件参照は残す）
  order: number;              // 表示順
  memo?: string;
}

/**
 * 契約パイプラインの日付付きステージ。(§3-2)
 * 既存 stage/stageHistory（9段 funnel）とは別レイヤー。
 * 各日付は「そのイベントが起きた日」。未達なら undefined。
 */
export interface ContractMilestones {
  firstConsultDate?: string;   // 初回相談日 (YYYY-MM-DD)
  lifePlanDate?: string;       // LP提案日（ライフプラン提案）
  proposalDate?: string;       // 提案日（設計書提示）
  applicationDate?: string;    // 契約日（申込日）
  establishedDate?: string;    // 成立日（成立=会計上の実績確定日）
  inceptionDate?: string;      // ★始期日（主に損保。主上確定 2026-07-08）
  lostDate?: string;           // 失注日
}

/** 案件単位のタスク（証券回収・ポリシーレビュー）。日付は予定 or 実施日。(§3-3) */
export interface ContractTasks {
  policyCollectDate?: string;  // 証券回収日 (YYYY-MM-DD)
  policyCollected: boolean;    // 回収済みフラグ（salesPerf policy_collected 源泉）
  policyReviewDate?: string;   // ポリシーレビュー日
  policyReviewed: boolean;     // レビュー済みフラグ
}

/** 被保険者(Person)単位の意向シート・署名タスク状態。(§3-3) */
export interface InsuredTaskState {
  personId: string;            // 対象被保険者 Person.id
  intentSheetDone: boolean;    // 意向シート回収済み
  intentSheetDate?: string;    // 意向シート日付
  signatureDone: boolean;      // 署名済み
  signatureDate?: string;      // 署名日付
  memo?: string;
}

/**
 * 不備項目。選択式ではなく「転記方式」——項目名と内容を書き写す。(§3-5)
 * ★主上確定 2026-07-08: 選択ではなく転記方式
 */
export interface DeficiencyItem {
  id: string;
  item: string;                // 不備項目名（転記）例: '告知書未記入'
  detail?: string;             // 不備内容（転記）
  resolved: boolean;           // 解消済み
  resolvedDate?: string;
}

/**
 * 統一見込確度ラダー（生損共通・案件単位1値）(§3-5)
 * ★主上確定 2026-07-08: 統一する。案件ごとに1値設定
 * 生保は運用上 C/D を使わないが型上は許容
 */
export type ConfidenceUnified = 'fixed' | 'S' | 'A' | 'B' | 'C' | 'D';

export interface Opportunity {
  id: string;
  householdId: string;
  ownerId: string;
  title: string;
  targetPersonIds: string[];      // 提案対象世帯員
  stage: OpportunityStage;
  status: OpportunityStatus;
  productCategories: ProductCategory[];
  proposalProducts: ProposalProduct[];
  totalMonthlyPremium?: number;   // 合計月払 (proposalProducts から自動計算)
  expectedCloseDate?: string;     // ★契約予定日=申込予定日（主上確定 2026-07-08）
  actualCloseDate?: string;
  lostReason?: LostReason;
  lostReasonDetail?: string;
  nextAction?: string;
  nextActionDate?: string;
  needsAnalysisDone: boolean;
  illustrationProvided: boolean;
  stageHistory: OpportunityStageHistory[];  // ステージ変更履歴
  tags: string[];
  memo: string;                   // ★備考（メモ全般）として流用
  createdAt: string;
  updatedAt: string;

  // ── NEW（契約パイプライン拡張。すべて任意で非破壊）── (§3-5)
  contractorPersonId?: string;          // 契約者 Person.id（世帯主とは限らない）
  channelId?: string;                   // チャネル（葉）SalesChannel.id
  confidence?: ConfidenceUnified;       // 見込確度（★統一ラダー・案件単位1値・主上確定）
  milestones?: ContractMilestones;      // ステージ日付（7種）
  contractTasks?: ContractTasks;        // 証券回収 / ポリシーレビュー
  insuredTasks?: InsuredTaskState[];    // 意向シート / 署名（被保険者単位）
  deficiencies?: DeficiencyItem[];      // ★不備（項目化・転記方式。主上確定 2026-07-08）
}

export interface TimeBlock {
  id: string;
  reportId: string;
  type: BlockType;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  customerId?: string;
  opportunityId?: string;  // 紐付け案件 (Phase 2)
  title: string;
  memo: string;
  isPlanned: boolean;
  isActual: boolean;
  attachments: Attachment[];
  /** 実績化時にスナップショット元の予定ブロック id を保持。予定ブロックは未設定 */
  plannedBlockId?: string;
  // 訪問結果（visit ブロックのみ使用）
  collected?: boolean;        // 集金済み
  nextAppointment?: string;   // 次回AP (YYYY-MM-DD)
  proposal?: string;          // 提案内容
  result?: string;            // 対応結果メモ
}

export interface Todo {
  id: string;
  reportId: string;
  text: string;
  completed: boolean;
  status: 'todo' | 'doing' | 'done';
  rolledOver: boolean;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
  /** 付帯情報判定用: 当該 TODO が紐づく顧客 ID */
  customerId?: string;
  opportunityId?: string;  // 紐付け案件 (Phase 2)
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

export type MoodType = 'sunny' | 'partly_cloudy' | 'cloudy' | 'rainy';
export type ManagerSignal = 'consult' | 'listen' | 'ok' | null;

export interface ManagerCommentReply {
  userId: string;
  choice: 'yes' | 'no';
  repliedAt: string;
}

export interface ManagerComment {
  id: string;
  dayKey: string; // YYYY-MM-DD (日報特定用)
  authorUserId: string;
  /** 表示用ロール — 上長コメント: 'manager'|'executive', 部下コメント: 'general' (optional for backward compat) */
  authorRole?: 'manager' | 'executive' | 'general';
  body: string;
  createdAt: string;
  replies: ManagerCommentReply[];
}

export interface Compliment {
  id: string;
  dayKey: string; // YYYY-MM-DD
  customerId?: string;
  customerName?: string;
  opportunityId?: string;  // 紐付け案件 (Phase 2)
  type: 'praise' | 'request';
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
  status: 'draft' | 'published';
  isDefault: boolean;
  isActive: boolean;
  blocks: TemplateBlock[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateBlock {
  id: string;
  type: 'single_line' | 'multi_line' | 'timeline' | 'todo' | 'customer' | 'radio' | 'yn' | 'number' | 'attachment';
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
  type: 'comment' | 'sent_back' | 'confirmed' | 'reminder' | 'other';
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
  result: 'success' | 'failure';
  diff?: Record<string, { before: unknown; after: unknown }>;
  createdAt: string;
}

// =====================================================
// Policy (保険契約) 型 — Phase 3
// =====================================================

export type PolicyStatus =
  | 'inforce'       // 有効中
  | 'lapsed'        // 失効
  | 'surrendered'   // 解約
  | 'matured'       // 満期
  | 'paid_up'       // 払済
  | 'reduced'       // 減額
  | 'pending';      // 申込中

export type PayMode = 'monthly' | 'semi_annual' | 'annual' | 'lump_sum';

export type CoverageType =
  | 'death'             // 死亡
  | 'living_benefit'    // 生前給付
  | 'medical_hospital'  // 入院
  | 'medical_surgery'   // 手術
  | 'cancer'            // がん
  | 'critical_illness'  // 三大疾病
  | 'disability'        // 就業不能
  | 'nursing'           // 介護
  | 'savings'           // 貯蓄/年金
  | 'liability'         // 賠償
  | 'asset_damage'      // 物損
  | 'other';

export interface Coverage {
  id: string;
  policyId: string;
  type: CoverageType;
  label: string;
  faceAmount?: number;
  unitAmount?: number;
  unit?: 'JPY' | 'day' | 'time';
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
export type TargetScope = 'individual' | 'team';

/** 目標期間種別。既定は月次。四半期・年間もサポート */
export type TargetPeriodType = 'monthly' | 'quarterly' | 'annual';

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
  ownerId: string;              // scope=individual → User.id / scope=team → Team.id
  periodType: TargetPeriodType; // 既定 'monthly'
  period: string;               // 'YYYY-MM' | 'YYYY-Qn' | 'YYYY'
  /** 成約件数の目標 (Policy inforce 化ベース) */
  targetPolicyCount: number;
  /** 成約保険料額の目標。月換算保険料の合計 (monthlyPremium ベース) */
  targetPremium: number;
  memo: string;
  createdByUserId: string;      // 設定者 (manager/admin)
  createdAt: string;            // ISO
  updatedAt: string;            // ISO
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
  status: 'running' | 'paused' | 'ended' | 'discarded';
}
