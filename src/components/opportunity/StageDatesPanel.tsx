// StageDatesPanel.tsx — 案件詳細: 各段の進入日を表示・手修正（B1）
// 段変更時に空欄の進入日は自動で今日が入る。ここでは誤りを手で直せる。
import { format } from "date-fns";
import type { Opportunity, ContractMilestones } from "../../types";
import { MilestoneDateField } from "../../pages/HouseholdBatchEntryPage/MilestoneDateField";
import { getMilestoneOrderWarnings } from "../../utils/householdBatchEntry";
import {
  STAGE_MILESTONE_KEY,
  STAGE_ORDER_7,
  TAB_META,
  normalizeStage,
} from "../../utils/opportunityStage";

interface Props {
  opp: Opportunity;
  onChange: (milestones: ContractMilestones) => void;
}

export function StageDatesPanel({ opp, onChange }: Props) {
  const today = format(new Date(), "yyyy-MM-dd");
  const m = opp.milestones ?? {};
  const stage = normalizeStage(opp.stage);
  const showLost = stage === "lost" || m.lostDate != null;
  const stages = showLost ? [...STAGE_ORDER_7, "lost" as const] : STAGE_ORDER_7;
  const warnings = getMilestoneOrderWarnings(opp.milestones);

  const set = (key: keyof ContractMilestones, v: string | undefined) => {
    const next: ContractMilestones = { ...m };
    if (v) next[key] = v;
    else delete next[key];
    onChange(next);
  };

  return (
    <div className="mt-3" data-testid="stage-dates-panel">
      <p className="text-xs text-gray-500 mb-1">各段の日付（ステージ変更時に自動記録・ここで修正できます）</p>
      {/* D6: 横並びをやめて縦並び */}
      <div className="flex flex-col gap-2 max-w-xs" data-testid="stage-dates-list">
        {stages.map((st) => {
          const label = TAB_META.find((t) => t.key === st)!.label;
          const key = STAGE_MILESTONE_KEY[st];
          return (
            <MilestoneDateField
              key={st}
              label={`${label}日`}
              value={m[key]}
              today={today}
              onChange={(v) => set(key, v)}
            />
          );
        })}
      </div>
      {warnings.length > 0 && (
        <p className="text-xs text-amber-600 mt-1">
          ⚠ 日付の順序が逆です: {warnings.map((w) => `${w.earlierLabel}→${w.laterLabel}`).join("、")}
        </p>
      )}
    </div>
  );
}
