// 案件カード詳細セクション（日付・タスク・不備）— 折りたたみ
import {
  ChevronUp,
  ChevronRight,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import type { ContractMilestones, DeficiencyItem } from "../../types";
import {
  MILESTONE_LABELS,
  MILESTONE_ORDER,
  type MilestoneOrderWarning,
} from "../../utils/householdBatchEntry";
import { MilestoneDateField } from "./MilestoneDateField";
import type { DraftOpportunity } from "../../utils/householdBatchEntry";

interface OpportunityCardDetailsProps {
  draft: DraftOpportunity;
  detailsOpen: boolean;
  setDetailsOpen: (fn: (v: boolean) => boolean) => void;
  milestones: ContractMilestones;
  milestoneWarnings: MilestoneOrderWarning[];
  deficiencies: DeficiencyItem[];
  todayStr: string;
  onMilestoneChange: (
    key: keyof ContractMilestones,
    value: string | undefined,
  ) => void;
  onAddDeficiency: () => void;
  onRemoveDeficiency: (id: string) => void;
  onUpdateDeficiencyField: (id: string, patch: Partial<DeficiencyItem>) => void;
  onUpdate: (patch: Partial<DraftOpportunity>) => void;
}

export function OpportunityCardDetails({
  draft,
  detailsOpen,
  setDetailsOpen,
  milestones,
  milestoneWarnings,
  deficiencies,
  todayStr,
  onMilestoneChange,
  onAddDeficiency,
  onRemoveDeficiency,
  onUpdateDeficiencyField,
  onUpdate,
}: OpportunityCardDetailsProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setDetailsOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setDetailsOpen((v) => !v);
          }
        }}
        aria-expanded={detailsOpen}
        className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 cursor-pointer select-none transition-colors"
      >
        <span className="text-gray-500 shrink-0">
          {detailsOpen ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>
        <span className="text-xs font-semibold text-gray-700">
          ▸ 詳細（日付・タスク・不備）
        </span>
        {(Object.values(milestones).some(Boolean) ||
          deficiencies.length > 0 ||
          (draft.tasks ?? []).some((t) => t.done)) && (
          <span className="ml-1 text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
            入力済
          </span>
        )}
        {milestoneWarnings.length > 0 && (
          <span className="ml-1 text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
            日付順序注意
          </span>
        )}
      </div>

      {detailsOpen && (
        <div className="p-3 space-y-4 bg-white">
          {/* --- ステージ日付 --- */}
          <div>
            <p className="text-[11px] font-semibold text-gray-600 mb-2">
              ⏱ ステージ日付
            </p>
            {milestoneWarnings.map((w: MilestoneOrderWarning) => (
              <div
                key={`${w.earlier}-${w.later}`}
                className="flex items-center gap-1.5 mb-2 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-700"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  「{w.earlierLabel}」が「{w.laterLabel}
                  」より後になっています（注意）
                </span>
              </div>
            ))}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MILESTONE_ORDER.map((key) => (
                <MilestoneDateField
                  key={key}
                  label={MILESTONE_LABELS[key]}
                  value={milestones[key]}
                  onChange={(v) => onMilestoneChange(key, v)}
                  today={todayStr}
                />
              ))}
              <MilestoneDateField
                label={MILESTONE_LABELS.inceptionDate}
                value={milestones.inceptionDate}
                onChange={(v) => onMilestoneChange("inceptionDate", v)}
                today={todayStr}
              />
              <MilestoneDateField
                label={MILESTONE_LABELS.lostDate}
                value={milestones.lostDate}
                onChange={(v) => onMilestoneChange("lostDate", v)}
                today={todayStr}
              />
            </div>
          </div>

          {/* --- 案件タスク（scope='opportunity'）--- */}
          <div>
            <p className="text-[11px] font-semibold text-gray-600 mb-2">
              ☑️ タスク
            </p>
            {(draft.tasks ?? []).filter((t) => t.scope === "opportunity")
              .length === 0 ? (
              <div className="px-3 py-4 border border-dashed border-gray-200 rounded-lg text-center">
                <p className="text-xs text-gray-400">
                  タスクなし（案件作成後に自動生成されます）
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {(draft.tasks ?? [])
                  .filter((t) => t.scope === "opportunity")
                  .map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 flex-wrap"
                    >
                      <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer min-h-[44px]">
                        <input
                          type="checkbox"
                          checked={task.done}
                          onChange={(e) => {
                            const done = e.target.checked;
                            const updatedTasks = (draft.tasks ?? []).map((t) =>
                              t.id === task.id
                                ? {
                                    ...t,
                                    done,
                                    doneDate: done
                                      ? t.doneDate || todayStr
                                      : t.doneDate,
                                  }
                                : t,
                            );
                            onUpdate({ tasks: updatedTasks });
                          }}
                          className="w-4 h-4 rounded accent-blue-600"
                        />
                        <span
                          className={
                            task.done ? "line-through text-gray-400" : ""
                          }
                        >
                          {task.title}
                        </span>
                      </label>
                      {task.done && task.doneDate && (
                        <span className="text-[10px] text-gray-400">
                          {task.doneDate}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* --- 不備 --- */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-gray-600">
                ⚠️ 不備（転記方式）
              </p>
              <button
                type="button"
                onClick={onAddDeficiency}
                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 border border-blue-300 hover:bg-blue-50 px-2 py-1 rounded min-h-[36px]"
              >
                <Plus className="w-3 h-3" /> 不備追加
              </button>
            </div>
            {deficiencies.length === 0 ? (
              <div className="px-3 py-4 border border-dashed border-gray-200 rounded-lg text-center">
                <p className="text-xs text-gray-400">不備なし</p>
              </div>
            ) : (
              <div className="space-y-2">
                {deficiencies.map((def) => (
                  <div
                    key={def.id}
                    className="border border-gray-200 rounded-lg p-2.5 space-y-2"
                  >
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] text-gray-500 mb-0.5">
                          項目名
                        </label>
                        <input
                          type="text"
                          value={def.item}
                          onChange={(e) =>
                            onUpdateDeficiencyField(def.id, {
                              item: e.target.value,
                            })
                          }
                          placeholder="例: 告知書未記入"
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveDeficiency(def.id)}
                        className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded self-end transition-colors min-h-[36px] min-w-[36px]"
                        aria-label="この不備を削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">
                        内容（転記）
                      </label>
                      <textarea
                        value={def.detail ?? ""}
                        onChange={(e) =>
                          onUpdateDeficiencyField(def.id, {
                            detail: e.target.value,
                          })
                        }
                        rows={2}
                        placeholder="不備内容を転記してください"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer min-h-[36px]">
                        <input
                          type="checkbox"
                          checked={def.resolved}
                          onChange={(e) => {
                            const resolved = e.target.checked;
                            onUpdateDeficiencyField(def.id, {
                              resolved,
                              resolvedDate: resolved
                                ? def.resolvedDate || todayStr
                                : def.resolvedDate,
                            });
                          }}
                          className="w-4 h-4 rounded accent-blue-600"
                        />
                        <span>解消済み</span>
                      </label>
                      {def.resolved && (
                        <input
                          type="date"
                          value={def.resolvedDate ?? ""}
                          onChange={(e) =>
                            onUpdateDeficiencyField(def.id, {
                              resolvedDate: e.target.value || undefined,
                            })
                          }
                          className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          aria-label="解消日"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
