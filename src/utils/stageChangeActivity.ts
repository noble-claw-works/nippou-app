// ステージ変更を活動履歴(日報の TimeBlock・opportunityId 紐付け)へ 1 件記録する (#305 A2)
import { format } from "date-fns";
import type { Opportunity, OpportunityStage, TimeBlock } from "../types";
import { STAGE_META } from "../components/opportunity/stageMeta";

export interface StageActivityStore {
  currentUserId: string;
  reports: { id: string; userId: string; date: string }[];
  createReport: (userId: string, date: string) => { id: string };
  addBlock: (reportId: string, block: Omit<TimeBlock, "id">) => unknown;
}

export function buildStageChangeBlock(
  reportId: string,
  opp: Pick<Opportunity, "id" | "title" | "stage">,
  newStage: OpportunityStage,
  note: string | undefined,
  now: Date = new Date(),
): Omit<TimeBlock, "id"> {
  const hhmm = format(now, "HH:mm");
  const from = STAGE_META[opp.stage]?.label ?? opp.stage;
  const to = STAGE_META[newStage]?.label ?? newStage;
  const trimmed = note?.trim();
  return {
    reportId,
    type: "meeting",
    startTime: hhmm,
    endTime: hhmm,
    title: `ステージ変更: ${from} → ${to}`,
    memo: trimmed ? `変更メモ: ${trimmed}` : "",
    isPlanned: false,
    isActual: true,
    attachments: [],
    opportunityId: opp.id,
  };
}

/** 現在ユーザーの当日日報へステージ変更ブロックを 1 件追加する */
export function recordStageChangeActivity(
  store: StageActivityStore,
  opp: Pick<Opportunity, "id" | "title" | "stage">,
  newStage: OpportunityStage,
  note: string | undefined,
  now: Date = new Date(),
): void {
  const date = format(now, "yyyy-MM-dd");
  const userId = store.currentUserId;
  const report =
    store.reports.find((r) => r.userId === userId && r.date === date) ??
    store.createReport(userId, date);
  store.addBlock(
    report.id,
    buildStageChangeBlock(report.id, opp, newStage, note, now),
  );
}
