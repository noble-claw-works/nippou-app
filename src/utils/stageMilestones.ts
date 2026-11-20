// =====================================================
// stageMilestones.ts — ステージ変更に伴う各段の日付（進入日）の更新（B1・純関数）
//  - 進む/横: 変更先の段の日付が空なら today を入れる（既にあれば保持）
//  - 戻る: 確認の上、変更先より後ろの段の日付を消す（Q2）
//  - 失注から戻る: 失注日を消す
// =====================================================
import type { ContractMilestones, OpportunityStage } from "../types";
import { STAGE_MILESTONE_KEY, STAGE_ORDER_7, stagesAfter } from "./opportunityStage";

/** to が from より前の段か（lost は進行順の外なので false） */
export function isBackwardMove(from: OpportunityStage, to: OpportunityStage): boolean {
  const f = STAGE_ORDER_7.indexOf(from);
  const t = STAGE_ORDER_7.indexOf(to);
  return f >= 0 && t >= 0 && t < f;
}

/** 戻したときに消える日付のキー（from に日付が入っていない/空のものは対象外） */
export function datesToClearOnMove(
  milestones: ContractMilestones | undefined,
  from: OpportunityStage,
  to: OpportunityStage,
): Array<keyof ContractMilestones> {
  if (!milestones) return [];
  const keys: Array<keyof ContractMilestones> = [];
  if (from === "lost" && to !== "lost") keys.push(STAGE_MILESTONE_KEY.lost);
  if (isBackwardMove(from, to)) {
    for (const s of stagesAfter(to)) keys.push(STAGE_MILESTONE_KEY[s]);
  }
  return keys.filter((k) => milestones[k] != null);
}

export function applyStageMilestones(
  milestones: ContractMilestones | undefined,
  from: OpportunityStage,
  to: OpportunityStage,
  today: string,
  opts: { clearLaterDates?: boolean } = {},
): ContractMilestones {
  const m: ContractMilestones = { ...(milestones ?? {}) };
  // 戻し・失注復帰は既定で後ろの日付を消す（false を明示した場合のみ残す）
  if (opts.clearLaterDates !== false) {
    for (const k of datesToClearOnMove(milestones, from, to)) delete m[k];
  }
  const key = STAGE_MILESTONE_KEY[to];
  if (m[key] == null || m[key] === "") (m as Record<string, string>)[key] = today;
  return m;
}
