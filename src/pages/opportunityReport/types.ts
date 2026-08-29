import type { OpportunityActivityReport } from "../../types";

export type FormState = {
  reportDate: string;
  activityType: OpportunityActivityReport["activityType"];
  summary: string;
  proposalDetail: string;
  nextAction: string;
  nextActionDate: string;
  collected: boolean;
  confidence: OpportunityActivityReport["confidence"];
  deficiencyNote: string;
  reachedMilestones: NonNullable<
    OpportunityActivityReport["reachedMilestones"]
  >;
};
