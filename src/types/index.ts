// =====================================================
// index.ts — 型定義 re-export バレル (305-hrl-nippou-app)
//
// 既存の `from '@/types'` / `from '../types'` 等の参照はすべてここを通す。
// 型の実体はドメイン別ファイルに移設済み。
// =====================================================

// 基盤型
export type {
  Role,
  ReportStatus,
  BlockType,
  CustomerType,
  CustomerStatus,
  HouseholdType,
  HouseholdStatus,
  PersonRelation,
  PersonGender,
  UserStatus,
  MoodType,
  ManagerSignal,
} from "./core";

// ユーザー / チーム
export type { User, Team } from "./user";

// 世帯 / 人物
export type { Household, Customer, Person } from "./household";

// タスク
export type {
  TaskScope,
  TaskPriority,
  TaskTriggerType,
  TaskTimingType,
  TaskBaseDateType,
  Task,
  TaskTemplate,
} from "./task";

// 商談案件 / パイプライン
export type {
  OpportunityStage,
  OpportunityStatus,
  LostReason,
  ProductCategory,
  ProposalProduct,
  OpportunityStageHistory,
  SalesChannel,
  ContractMilestones,
  DeficiencyItem,
  ConfidenceUnified,
  ProposalRound,
  OpportunityActivityReport,
  Opportunity,
} from "./opportunity";

// 定数も re-export (const は `export { }` 形式)
export { LIFE_CATEGORIES, NONLIFE_CATEGORIES } from "./opportunity";

// 日報 / タイムブロック / TODO
export type {
  Attachment,
  TimeBlock,
  Todo,
  CustomerVisit,
  Comment,
  ManagerCommentReply,
  ManagerComment,
  Compliment,
  DailyReport,
} from "./report";

// テンプレート
export type { Template, TemplateBlock, QuickChip } from "./template";

// 保険契約
export type {
  PolicyStatus,
  PayMode,
  CoverageType,
  Coverage,
  Policy,
  PolicyStatusHistory,
} from "./policy";

// 営業目標 / トラッキング
export type {
  TargetScope,
  TargetPeriodType,
  SalesTarget,
  TrackingSession,
} from "./salesTarget";

// 更新案件
export type {
  RenewalStatus,
  RenewalMethod,
  RenewalProductType,
  RenewalConcern,
  RenewalConsultSurvey,
  RenewalRoadmapSurvey,
  RenewalRiderSurvey,
  RenewalSurvey,
  RenewalLogKind,
  RenewalActivityLog,
  RenewalNote,
  RenewalCase,
} from "./renewal";

// システム
export type { Notification, AuditLog } from "./system";

// 世帯対応記録
export type {
  InteractionKind,
  CustomerInteraction,
} from "./customerInteraction";
export { INTERACTION_KIND_LABEL } from "./customerInteraction";

// 保険会社マスタ / 種目マスタ
export type { InsuranceCompany, ProductCategoryMaster } from "./insurance";
