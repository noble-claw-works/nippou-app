// =====================================================
// Store exported types — Toast, EmailChangeRequest
// and domain type re-exports used by slices
// =====================================================
import type {
  User,
  Team,
  Customer,
  DailyReport,
  Template,
  QuickChip,
  Notification,
  AuditLog,
  TimeBlock,
  Todo,
  Comment,
  Role,
  TrackingSession,
  BlockType,
  ManagerComment,
  Compliment,
  Person,
  Opportunity,
  OpportunityStage,
  Policy,
  PolicyStatusHistory,
  Coverage,
  PolicyStatus,
  CoverageType,
  ProductCategory,
  SalesTarget,
  TargetScope,
  TargetPeriodType,
  OpportunityActivityReport,
  ProposalRound,
  Task,
  TaskTemplate,
  TaskTimingType,
  TaskBaseDateType,
  Household,
  ProposalProduct,
  SalesChannel,
  RenewalCase,
  RenewalSurvey,
  RenewalStatus,
  RenewalLogKind,
  CustomerInteraction,
  InteractionKind,
  InsuranceCompany,
  ProductCategoryMaster,
} from "../../types";
import type { AuthSession } from "../auth";

// =====================================================
// トースト
// =====================================================
export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  undoFn?: () => void;
}

// =====================================================
// メールアドレス変更申請
// =====================================================
export interface EmailChangeRequest {
  id: string;
  userId: string;
  newEmail: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  processedAt?: string;
}

// Re-export domain types used by slices
export type {
  User,
  Team,
  Customer,
  DailyReport,
  Template,
  QuickChip,
  Notification,
  AuditLog,
  TimeBlock,
  Todo,
  Comment,
  Role,
  TrackingSession,
  BlockType,
  ManagerComment,
  Compliment,
  Person,
  Opportunity,
  OpportunityStage,
  Policy,
  PolicyStatusHistory,
  Coverage,
  PolicyStatus,
  CoverageType,
  ProductCategory,
  SalesTarget,
  TargetScope,
  TargetPeriodType,
  OpportunityActivityReport,
  ProposalRound,
  Task,
  TaskTemplate,
  TaskTimingType,
  TaskBaseDateType,
  Household,
  ProposalProduct,
  SalesChannel,
  AuthSession,
  RenewalCase,
  RenewalSurvey,
  RenewalStatus,
  RenewalLogKind,
  CustomerInteraction,
  InteractionKind,
  InsuranceCompany,
  ProductCategoryMaster,
};
