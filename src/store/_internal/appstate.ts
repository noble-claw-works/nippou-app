// =====================================================
// AppState interface — central store shape
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
  SalesTarget,
  TargetScope,
  TargetPeriodType,
  OpportunityActivityReport,
  ProposalRound,
  Task,
  TaskTemplate,
} from "../../types";
import type { AuthSession } from "../auth";
import type { Toast, EmailChangeRequest } from "./exportedTypes";

export interface AppState {
  // Auth
  currentRole: Role;
  currentUserId: string;
  authSession: AuthSession | null;
  passwords: Record<string, string>;

  // Data
  users: User[];
  teams: Team[];
  customers: Customer[];
  persons: Person[];
  reports: DailyReport[];
  templates: Template[];
  quickChips: QuickChip[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  trackingSession: TrackingSession | null;
  emailChangeRequests: EmailChangeRequest[];
  managerComments: ManagerComment[];
  compliments: Compliment[];

  // Data: TaskTemplate (ADR-TASK-MASTER)
  taskTemplates: TaskTemplate[];

  // Data: OpportunityActivityReport (ADR-B4 v2 要件6)
  oppActivityReports: OpportunityActivityReport[];

  // Actions: OpportunityActivityReport
  getOppActivityReport: (
    opportunityId: string,
    reportDate: string,
    userId: string,
  ) => OpportunityActivityReport | undefined;
  getOppActivityReportsByOpportunity: (
    opportunityId: string,
  ) => OpportunityActivityReport[];
  addOppActivityReport: (
    partial: Omit<OpportunityActivityReport, "id" | "createdAt" | "updatedAt">,
  ) => OpportunityActivityReport;
  updateOppActivityReport: (
    id: string,
    patch: Partial<Omit<OpportunityActivityReport, "id" | "createdAt">>,
  ) => void;
  deleteOppActivityReport: (id: string) => void;
  /**
   * 要件9: 報告保存→日報 TimeBlock 自動生成/更新
   * - 当日日報がなければ createReport で作成
   * - sourceReportId で既存ブロックを探し、あれば updateBlock、なければ addBlock
   * - 二重生成しない
   */
  syncOppReportToNippou: (reportId: string) => void;

  // UI
  toasts: Toast[];

  // Actions: Role
  setRole: (role: Role) => void;

  // Actions: Auth
  login: (
    email: string,
    password: string,
  ) => { ok: true; user: User } | { ok: false; error: string };
  loginAsUser: (userId: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  touchSession: () => void;
  changePassword: (
    userId: string,
    current: string,
    next: string,
  ) => { ok: true } | { ok: false; error: string };

  // Actions: Toast
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;

  // Actions: Report
  getReport: (userId: string, date: string) => DailyReport | undefined;
  getTodayReport: () => DailyReport | undefined;
  createReport: (userId: string, date: string) => DailyReport;
  updateReport: (reportId: string, updates: Partial<DailyReport>) => void;
  confirmPlanning: (reportId: string) => void;
  submitReport: (reportId: string) => void;
  withdrawReport: (reportId: string) => void;
  confirmReport: (reportId: string) => void;
  bulkConfirmReports: (reportIds: string[]) => number;

  // Actions: TimeBlock
  addBlock: (reportId: string, block: Omit<TimeBlock, "id">) => TimeBlock;
  updateBlock: (
    reportId: string,
    blockId: string,
    updates: Partial<TimeBlock>,
  ) => void;
  deleteBlock: (reportId: string, blockId: string) => void;

  // Actions: Todo
  addTodo: (
    reportId: string,
    text: string,
    priority?: "high" | "medium" | "low",
  ) => void;
  toggleTodo: (reportId: string, todoId: string) => void;
  updateTodo: (
    reportId: string,
    todoId: string,
    updates: Partial<Todo>,
  ) => void;
  deleteTodo: (reportId: string, todoId: string) => void;

  // Actions: Comment
  addComment: (reportId: string, userId: string, text: string) => void;
  updateComment: (reportId: string, commentId: string, text: string) => void;
  deleteComment: (reportId: string, commentId: string) => void;

  // Actions: Customer
  addCustomer: (customer: Omit<Customer, "id">) => Customer;
  updateCustomer: (customerId: string, updates: Partial<Customer>) => void;
  deactivateCustomer: (customerId: string, reason?: string) => void;
  deleteCustomer: (customerId: string) => boolean;

  // Actions: Person (世帯員)
  addPerson: (
    householdId: string,
    partial: Omit<Person, "id" | "householdId" | "createdAt" | "updatedAt">,
  ) => Person;
  updatePerson: (personId: string, patch: Partial<Person>) => void;
  deletePerson: (personId: string) => { ok: boolean; error?: string };
  getPersonsByHousehold: (householdId: string) => Person[];

  // Actions: User
  addUser: (user: Omit<User, "id">) => User;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deactivateUser: (userId: string) => void;

  // Actions: Team
  addTeam: (team: Omit<Team, "id">) => Team;
  updateTeam: (teamId: string, updates: Partial<Team>) => void;
  deleteTeam: (teamId: string) => void;

  // Actions: Template
  addTemplate: (
    template: Omit<Template, "id" | "usageCount" | "createdAt" | "updatedAt">,
  ) => Template;
  updateTemplate: (templateId: string, updates: Partial<Template>) => void;
  publishTemplate: (templateId: string) => void;
  deactivateTemplate: (templateId: string) => void;

  // Actions: QuickChip
  addQuickChip: (chip: Omit<QuickChip, "id">) => void;
  updateQuickChip: (chipId: string, updates: Partial<QuickChip>) => void;
  deleteQuickChip: (chipId: string) => void;

  // Actions: ManagerComment
  addManagerComment: (
    dayKey: string,
    authorUserId: string,
    body: string,
    authorRole?: "manager" | "executive" | "general",
  ) => void;
  replyToManagerComment: (
    commentId: string,
    userId: string,
    choice: "yes" | "no",
  ) => void;
  deleteManagerComment: (commentId: string) => void;

  // Actions: Compliment
  addCompliment: (
    dayKey: string,
    customerId: string | undefined,
    customerName: string | undefined,
    type: "praise" | "request",
    body: string,
  ) => void;
  deleteCompliment: (complimentId: string) => void;

  // Data: SalesTarget
  salesTargets: SalesTarget[];

  // Actions: SalesTarget
  addSalesTarget: (
    partial: Omit<SalesTarget, "id" | "createdAt" | "updatedAt">,
  ) => SalesTarget;
  updateSalesTarget: (id: string, patch: Partial<SalesTarget>) => void;
  deleteSalesTarget: (id: string) => void;
  getTarget: (
    scope: TargetScope,
    ownerId: string,
    periodType: TargetPeriodType,
    period: string,
  ) => SalesTarget | undefined;
  upsertTarget: (
    scope: TargetScope,
    ownerId: string,
    periodType: TargetPeriodType,
    period: string,
    values: { targetPolicyCount: number; targetPremium: number; memo?: string },
    createdByUserId: string,
  ) => SalesTarget;

  // Data: Opportunity
  opportunities: Opportunity[];

  // Data: Policy
  policies: Policy[];
  policyStatusHistory: PolicyStatusHistory[];

  // Actions: Policy
  addPolicy: (
    partial: Omit<Policy, "id" | "createdAt" | "updatedAt">,
  ) => Policy;
  updatePolicy: (id: string, patch: Partial<Policy>) => void;
  deletePolicy: (id: string) => void;
  addCoverage: (
    policyId: string,
    partial: Omit<Coverage, "id" | "policyId">,
  ) => Coverage;
  updateCoverage: (coverageId: string, patch: Partial<Coverage>) => void;
  deleteCoverage: (coverageId: string) => void;
  issuePoliciesFromOpportunity: (
    opportunityId: string,
    userId: string,
  ) => Policy[];
  activatePolicy: (
    policyId: string,
    policyNumber: string,
    startDate: string,
    userId: string,
  ) => void;
  changePolicyStatus: (
    id: string,
    newStatus: PolicyStatus,
    note?: string,
    userId?: string,
  ) => void;
  getPoliciesByHousehold: (
    householdId: string,
    options?: { activeOnly?: boolean },
  ) => Policy[];
  getPoliciesByPerson: (
    personId: string,
    options?: { activeOnly?: boolean },
  ) => Policy[];
  getCoverageMatrix: (householdId: string) => Array<{
    personId: string;
    coverageTypes: Set<CoverageType>;
    totalFaceByType: Record<string, number>;
  }>;

  // Actions: Opportunity
  addOpportunity: (
    partial: Omit<
      Opportunity,
      "id" | "stageHistory" | "createdAt" | "updatedAt" | "totalMonthlyPremium"
    >,
  ) => Opportunity;
  updateOpportunity: (id: string, patch: Partial<Opportunity>) => void;
  deleteOpportunity: (id: string) => void;
  changeOpportunityStage: (
    id: string,
    newStage: OpportunityStage,
    note?: string,
    userId?: string,
  ) => void;
  getOpportunitiesByHousehold: (
    householdId: string,
    options?: { openOnly?: boolean },
  ) => Opportunity[];
  getOpportunityById: (id: string) => Opportunity | undefined;
  // ADR-TASK-MASTER: 案件/商品スコープ Task CRUD (Opportunity.tasks)
  addOppTask: (oppId: string, task: Omit<Task, "id" | "createdAt">) => void;
  updateOppTask: (oppId: string, taskId: string, patch: Partial<Task>) => void;
  removeOppTask: (oppId: string, taskId: string) => void;
  toggleOppTaskDone: (
    oppId: string,
    taskId: string,
    done: boolean,
    today?: string,
  ) => void;
  // ADR-TASK-MASTER: 世帯スコープ Task CRUD (Household.tasks)
  addHouseholdTask: (
    householdId: string,
    task: Omit<Task, "id" | "createdAt">,
  ) => void;
  updateHouseholdTask: (
    householdId: string,
    taskId: string,
    patch: Partial<Task>,
  ) => void;
  removeHouseholdTask: (householdId: string, taskId: string) => void;
  toggleHouseholdTaskDone: (
    householdId: string,
    taskId: string,
    done: boolean,
    today?: string,
  ) => void;
  // ADR-TASK-MASTER: TaskTemplate CRUD
  addTaskTemplate: (
    tmpl: Omit<TaskTemplate, "id" | "createdAt" | "updatedAt">,
  ) => TaskTemplate;
  updateTaskTemplate: (id: string, patch: Partial<TaskTemplate>) => void;
  removeTaskTemplate: (id: string) => void;
  // ADR-B4 v2 req8: 提案ラウンド
  addProposalRound: (
    id: string,
    round: Omit<ProposalRound, "id" | "roundNo" | "createdAt">,
  ) => void;
  updateProposalRound: (
    id: string,
    roundId: string,
    patch: Partial<Omit<ProposalRound, "id" | "roundNo" | "createdAt">>,
  ) => void;
  deleteProposalRound: (id: string, roundId: string) => void;

  // Actions: Notification
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (notifId: string) => void;

  // Actions: Tracking
  startTracking: (
    blockType: BlockType,
    customerId?: string,
    memo?: string,
  ) => void;
  stopTracking: () => TimeBlock | null;
  discardTracking: () => void;

  // Actions: Email Change Request
  requestEmailChange: (userId: string, newEmail: string) => void;
  getEmailChangeRequest: (userId: string) => EmailChangeRequest | undefined;

  // Reset
  resetAll: () => void;
}
