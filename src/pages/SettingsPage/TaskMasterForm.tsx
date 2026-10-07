// =====================================================
// TaskMasterForm.tsx — タスクマスタ編集フォーム (工程B-2 2026-10-07)
// TaskMasterTab から切り出し。定数・型は taskMasterConstants.ts に集約
// =====================================================
import { useState } from "react";
import type { TaskTemplate, TaskTimingType, TaskBaseDateType } from "../../types";
import {
  TIMING_LABELS,
  BASE_DATE_LABELS,
  type DraftTemplate,
} from "./taskMasterConstants";

export function TaskMasterForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: DraftTemplate;
  onSave: (v: DraftTemplate) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<DraftTemplate>(initial);
  const isValid = draft.title.trim().length > 0;
  const isOffsetMode = draft.timingType === "offset_from_base_date";

  const handleTimingChange = (timing: TaskTimingType) => {
    setDraft((d) => ({
      ...d,
      timingType: timing,
      baseDateType:
        timing === "offset_from_base_date" ? "first_consult_date" : undefined,
      offsetDays: timing === "offset_from_base_date" ? 0 : undefined,
    }));
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          タスク名 *
        </label>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
          placeholder="例: 告知書取得"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          追加タイミング
        </label>
        <div className="flex gap-2 flex-wrap">
          {(["on_opportunity_created", "offset_from_base_date"] as TaskTimingType[]).map(
            (t) => (
              <button
                key={t}
                onClick={() => handleTimingChange(t)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  draft.timingType === t
                    ? "bg-blue-500 text-white border-blue-500"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {TIMING_LABELS[t]}
              </button>
            ),
          )}
        </div>
      </div>

      {isOffsetMode && (
        <div className="grid grid-cols-2 gap-3 bg-blue-100/50 rounded-lg p-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              基準日
            </label>
            <select
              value={draft.baseDateType ?? "first_consult_date"}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  baseDateType: e.target.value as TaskBaseDateType,
                }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            >
              {(["first_consult_date", "renewal_due_date"] as TaskBaseDateType[]).map(
                (b) => (
                  <option key={b} value={b}>
                    {BASE_DATE_LABELS[b]}
                  </option>
                ),
              )}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              オフセット日数（正=後・負=前）
            </label>
            <input
              type="number"
              value={draft.offsetDays ?? 0}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  offsetDays: parseInt(e.target.value) || 0,
                }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              placeholder="例: -7"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            優先度
          </label>
          <select
            value={draft.defaultPriority}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                defaultPriority: e.target.value as TaskTemplate["defaultPriority"],
              }))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            期限オフセット（日）
          </label>
          <input
            type="number"
            min={0}
            value={draft.defaultDueOffsetDays ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                defaultDueOffsetDays: e.target.value
                  ? parseInt(e.target.value)
                  : undefined,
              }))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            placeholder="例: 7"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            表示順
          </label>
          <input
            type="number"
            value={draft.order}
            onChange={(e) =>
              setDraft((d) => ({ ...d, order: parseInt(e.target.value) || 99 }))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          既定メモ（任意）
        </label>
        <input
          type="text"
          value={draft.defaultMemo ?? ""}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              defaultMemo: e.target.value || undefined,
            }))
          }
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="tmpl-isActive"
          checked={draft.isActive}
          onChange={(e) =>
            setDraft((d) => ({ ...d, isActive: e.target.checked }))
          }
          className="w-4 h-4 accent-blue-500"
        />
        <label htmlFor="tmpl-isActive" className="text-sm text-gray-700">
          有効（無効にすると生成に使われなくなります）
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          キャンセル
        </button>
        <button
          onClick={() => isValid && onSave(draft)}
          disabled={!isValid}
          className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          保存
        </button>
      </div>
    </div>
  );
}
