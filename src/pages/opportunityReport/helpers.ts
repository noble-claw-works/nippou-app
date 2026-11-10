import type { OpportunityActivityReport } from "../../types";
import type { FormState } from "./types";

export function initForm(
  today: string,
  existing?: OpportunityActivityReport,
): FormState {
  return {
    reportDate: existing?.reportDate ?? today,
    activityType: existing?.activityType ?? "visit",
    summary: existing?.summary ?? "",
    proposalDetail: existing?.proposalDetail ?? "",
    nextAction: existing?.nextAction ?? "",
    nextActionDate: existing?.nextActionDate ?? "",
    collected: existing?.collected ?? false,
    confidence: existing?.confidence,
    deficiencyNote: existing?.deficiencyNote ?? "",
    reachedMilestones: existing?.reachedMilestones ?? {},
  };
}
