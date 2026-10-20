import { Calendar, CheckSquare } from "lucide-react";
import type { OpportunityActivityReport } from "../../types";
import {
  ACTIVITY_TYPE_OPTIONS,
  CONFIDENCE_OPTIONS,
  MILESTONE_ITEMS,
} from "./constants";
import type { FormState } from "./types";

interface ReportFormProps {
  form: FormState;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  toggleMilestone: (
    key: keyof NonNullable<OpportunityActivityReport["reachedMilestones"]>,
  ) => void;
}

export function ReportForm({
  form,
  setField,
  toggleMilestone,
}: ReportFormProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm">
      {/* 報告日 */}
      <div className="px-4 py-3 flex items-center gap-3">
        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
        <label className="text-sm font-medium text-gray-600 w-24 shrink-0">
          報告日
        </label>
        <input
          type="date"
          value={form.reportDate}
          onChange={(e) => setField("reportDate", e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 活動タイプ */}
      <div className="px-4 py-3 flex items-center gap-3">
        <span className="text-gray-400 text-sm w-4 text-center shrink-0">
          🎯
        </span>
        <label className="text-sm font-medium text-gray-600 w-24 shrink-0">
          活動種別
        </label>
        <div className="flex gap-2 flex-wrap">
          {ACTIVITY_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setField("activityType", opt.value)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                form.activityType === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-200 text-gray-600 hover:border-blue-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 活動サマリ（必須） */}
      <div className="px-4 py-3">
        <label className="text-sm font-medium text-gray-600 block mb-1.5">
          活動サマリ <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.summary}
          onChange={(e) => setField("summary", e.target.value)}
          rows={3}
          placeholder="今日の活動内容を簡潔に（日報の活動欄に自動反映されます）"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* 局面到達チェック */}
      <div className="px-4 py-3">
        <label className="text-sm font-medium text-gray-600 block mb-2 flex items-center gap-1.5">
          <CheckSquare className="w-4 h-4" />
          局面到達（今日達成した節目）
        </label>
        <div className="space-y-1.5">
          {MILESTONE_ITEMS.map((item) => (
            <label
              key={item.key}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={!!form.reachedMilestones[item.key]}
                onChange={() => toggleMilestone(item.key)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                <span className="font-medium">{item.label}</span>
                <span className="text-gray-400 ml-1 text-xs">
                  — {item.desc}
                </span>
              </span>
            </label>
          ))}
        </div>
        {Object.values(form.reachedMilestones).some(Boolean) && (
          <p className="mt-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-1.5">
            ✅
            チェックした局面の日付が案件マイルストーンに記録され、ステージが自動遷移します
          </p>
        )}
      </div>

      {/* 提案内容 */}
      <div className="px-4 py-3">
        <label className="text-sm font-medium text-gray-600 block mb-1.5">
          提案内容（任意）
        </label>
        <textarea
          value={form.proposalDetail}
          onChange={(e) => setField("proposalDetail", e.target.value)}
          rows={2}
          placeholder="提案した保険商品・内容"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* 次アクション */}
      <div className="px-4 py-3">
        <label className="text-sm font-medium text-gray-600 block mb-1.5">
          次アクション
        </label>
        <input
          type="text"
          value={form.nextAction}
          onChange={(e) => setField("nextAction", e.target.value)}
          placeholder="次回の予定アクション"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 次アクション日 */}
      <div className="px-4 py-3 flex items-center gap-3">
        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
        <label className="text-sm font-medium text-gray-600 w-24 shrink-0">
          次回アポ日
        </label>
        <input
          type="date"
          value={form.nextActionDate}
          onChange={(e) => setField("nextActionDate", e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 見込確度 */}
      <div className="px-4 py-3 flex items-center gap-3">
        <span className="text-gray-400 text-sm w-4 text-center shrink-0">
          📊
        </span>
        <label className="text-sm font-medium text-gray-600 w-24 shrink-0">
          見込確度
        </label>
        <select
          value={form.confidence ?? ""}
          onChange={(e) =>
            setField(
              "confidence",
              (e.target.value ||
                undefined) as OpportunityActivityReport["confidence"],
            )
          }
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {CONFIDENCE_OPTIONS.map((opt) => (
            <option key={opt.value ?? ""} value={opt.value ?? ""}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 集金 */}
      <div className="px-4 py-3 flex items-center gap-3">
        <span className="text-gray-400 text-sm w-4 text-center shrink-0">
          💴
        </span>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.collected}
            onChange={(e) => setField("collected", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-600">集金あり</span>
        </label>
      </div>

      {/* 不備メモ */}
      <div className="px-4 py-3">
        <label className="text-sm font-medium text-gray-600 block mb-1.5">
          不備メモ（任意）
        </label>
        <input
          type="text"
          value={form.deficiencyNote}
          onChange={(e) => setField("deficiencyNote", e.target.value)}
          placeholder="不備事項・確認依頼事項"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
