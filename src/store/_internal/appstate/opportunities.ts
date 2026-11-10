// =====================================================
// appstate/opportunities.ts — Opportunity & SalesTarget slice of AppState
// =====================================================
import type {
  Opportunity,
  OpportunityStage,
  SalesTarget,
  TargetScope,
  TargetPeriodType,
  OpportunityActivityReport,
  ProposalRound,
  Task,
  TaskTemplate,
  Policy,
  ProposalReflection,
} from "../../../types";

export interface AppStateOpportunitiesSlice {
  // Data: Opportunity
  opportunities: Opportunity[];

  // Data: SalesTarget
  salesTargets: SalesTarget[];

  // Data: TaskTemplate (ADR-TASK-MASTER)
  taskTemplates: TaskTemplate[];

  // Data: OpportunityActivityReport (ADR-B4 v2 要件6)
  oppActivityReports: OpportunityActivityReport[];

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

  // ── Doc4 反映（§2.3 / §T4-03 / PC-6）──
  /**
   * 商品行の反映指定(mode/targetPolicyId)を設定する（宣言＋最小実装）。
   * 実際の契約生成/更新は reflectOpportunityToPolicies で行う。
   */
  setProposalReflection: (
    opportunityId: string,
    proposalProductId: string,
    reflection: ProposalReflection,
  ) => void;
  /**
   * ★宣言のみ（M2 coder が実装）: 案件の reflection 指定に従い
   * 契約(Policy)を新規追加 or 既存変更として反映する。冪等（§T4-03 resultPolicyId）。
   * @returns 反映で生成/更新された Policy 配列
   */
  reflectOpportunityToPolicies: (
    opportunityId: string,
    userId: string,
  ) => Policy[];
}
