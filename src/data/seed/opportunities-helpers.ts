// =====================================================
// シードデータ — 商談案件ヘルパー関数
// =====================================================
import type {
  Opportunity,
  OpportunityStage,
  OpportunityStatus,
} from "../../types";
import { d } from "./helpers";

export function mkOpp(
  id: string,
  householdId: string,
  ownerId: string,
  title: string,
  stage: OpportunityStage,
  status: OpportunityStatus,
  opts: Partial<Opportunity> = {},
): Opportunity {
  const now = new Date().toISOString();
  return {
    id,
    householdId,
    ownerId,
    title,
    stage,
    status,
    targetPersonIds: opts.targetPersonIds ?? [],
    productCategories: opts.productCategories ?? [],
    proposalProducts: opts.proposalProducts ?? [],
    totalMonthlyPremium: opts.proposalProducts
      ? opts.proposalProducts.reduce((s, p) => s + p.monthlyPremium, 0) ||
        undefined
      : undefined,
    needsAnalysisDone: opts.needsAnalysisDone ?? false,
    illustrationProvided: opts.illustrationProvided ?? false,
    stageHistory: opts.stageHistory ?? [
      { stage, changedAt: d(7) + "T09:00:00", changedByUserId: ownerId },
    ],
    tags: opts.tags ?? [],
    memo: opts.memo ?? "",
    expectedCloseDate: opts.expectedCloseDate,
    actualCloseDate: opts.actualCloseDate,
    lostReason: opts.lostReason,
    lostReasonDetail: opts.lostReasonDetail,
    nextAction: opts.nextAction,
    nextActionDate: opts.nextActionDate,
    createdAt: d(14) + "T10:00:00",
    updatedAt: now,
    // ── B-1 新規フィールド（任意・opts にあれば引き継ぐ）──
    ...(opts.contractorPersonId !== undefined
      ? { contractorPersonId: opts.contractorPersonId }
      : {}),
    ...(opts.channelId !== undefined ? { channelId: opts.channelId } : {}),
    ...(opts.confidence !== undefined ? { confidence: opts.confidence } : {}),
    ...(opts.milestones !== undefined ? { milestones: opts.milestones } : {}),
    ...(opts.deficiencies !== undefined
      ? { deficiencies: opts.deficiencies }
      : {}),
    tasks: opts.tasks ?? [],
    ...(opts.proposals !== undefined ? { proposals: opts.proposals } : {}),
  };
}
