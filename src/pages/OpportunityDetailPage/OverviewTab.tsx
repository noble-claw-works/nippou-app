import { Edit2 } from "lucide-react";
import type { Opportunity, User } from "../../types";
import { STAGE_META } from "../../components/opportunity/StageBadge";
import { LOST_REASON_LABELS } from "./constants";

interface OverviewTabProps {
  opp: Opportunity;
  users: User[];
  editingFields: boolean;
  fieldDraft: Record<string, string>;
  onToggleEdit: () => void;
  onSaveFields: () => void;
  onFieldDraftChange: (patch: Record<string, string>) => void;
  onUpdateOpportunity: (id: string, patch: Partial<Opportunity>) => void;
}

export function OverviewTab({
  opp,
  users,
  editingFields,
  fieldDraft,
  onToggleEdit,
  onSaveFields,
  onFieldDraftChange,
  onUpdateOpportunity,
}: OverviewTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">基本情報</h2>
          <button
            onClick={editingFields ? onSaveFields : onToggleEdit}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <Edit2 className="w-3.5 h-3.5" />
            {editingFields ? "保存" : "編集"}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {/* 進捗チェックリスト */}
          <div>
            <div className="text-gray-500 mb-1">進捗チェックリスト</div>
            <div className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={opp.needsAnalysisDone}
                  onChange={(e) =>
                    onUpdateOpportunity(opp.id, {
                      needsAnalysisDone: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <span>ニーズ分析完了</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={opp.illustrationProvided}
                  onChange={(e) =>
                    onUpdateOpportunity(opp.id, {
                      illustrationProvided: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <span>設計書提示済み</span>
              </label>
            </div>
          </div>

          {/* 日付 */}
          <div className="space-y-2">
            <div>
              <span className="text-gray-500">クローズ予定日: </span>
              {editingFields ? (
                <input
                  type="date"
                  className="border border-gray-300 rounded px-2 py-0.5 text-sm"
                  value={fieldDraft.expectedCloseDate}
                  onChange={(e) =>
                    onFieldDraftChange({
                      ...fieldDraft,
                      expectedCloseDate: e.target.value,
                    })
                  }
                />
              ) : (
                <span>{opp.expectedCloseDate ?? "—"}</span>
              )}
            </div>
            {opp.actualCloseDate && (
              <div>
                <span className="text-gray-500">実際のクローズ日: </span>
                <span>{opp.actualCloseDate}</span>
              </div>
            )}
            {opp.lostReason && (
              <div>
                <span className="text-gray-500">失注理由: </span>
                <span>
                  {LOST_REASON_LABELS[opp.lostReason] ?? opp.lostReason}
                </span>
                {opp.lostReasonDetail && (
                  <span className="text-gray-400 ml-1">
                    ({opp.lostReasonDetail})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 次アクション */}
          <div>
            <div className="text-gray-500 mb-1">次アクション</div>
            {editingFields ? (
              <div className="space-y-1">
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  placeholder="次アクション内容"
                  value={fieldDraft.nextAction}
                  onChange={(e) =>
                    onFieldDraftChange({
                      ...fieldDraft,
                      nextAction: e.target.value,
                    })
                  }
                />
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  value={fieldDraft.nextActionDate}
                  onChange={(e) =>
                    onFieldDraftChange({
                      ...fieldDraft,
                      nextActionDate: e.target.value,
                    })
                  }
                />
              </div>
            ) : (
              <span>
                {opp.nextAction ?? "—"}
                {opp.nextActionDate ? ` (${opp.nextActionDate})` : ""}
              </span>
            )}
          </div>

          {/* メモ */}
          <div>
            <div className="text-gray-500 mb-1">メモ</div>
            {editingFields ? (
              <textarea
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm resize-none"
                rows={3}
                value={fieldDraft.memo}
                onChange={(e) =>
                  onFieldDraftChange({ ...fieldDraft, memo: e.target.value })
                }
              />
            ) : (
              <span className="whitespace-pre-wrap">{opp.memo || "—"}</span>
            )}
          </div>
        </div>
      </div>

      {/* ステージ変更履歴 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-3">ステージ変更履歴</h2>
        <div className="space-y-2">
          {[...opp.stageHistory].reverse().map((h, i) => {
            const meta = STAGE_META[h.stage];
            const changer = users.find((u) => u.id === h.changedByUserId);
            return (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-lg leading-none mt-0.5">
                  {meta.emoji}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800">
                      {meta.label}
                    </span>
                    <span className="text-gray-400">
                      {h.changedAt.slice(0, 10)}
                    </span>
                    {changer && (
                      <span className="text-gray-400">{changer.name}</span>
                    )}
                  </div>
                  {h.note && (
                    <div className="text-gray-500 mt-0.5">{h.note}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
