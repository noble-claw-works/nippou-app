// =====================================================
// OpportunityReportPage — 商談活動報告入力ページ
// ADR-B4 v2 要件6 + 要件9
// /opportunities/:id/report
// =====================================================
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Save, Calendar, CheckSquare } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "../store";
import type { OpportunityActivityReport } from "../types";

// ─── 確度ラダーオプション ────────────────────────────────────────────────────────
const CONFIDENCE_OPTIONS: Array<{
  value: OpportunityActivityReport["confidence"];
  label: string;
}> = [
  { value: undefined, label: "─ 未設定 ─" },
  { value: "S", label: "S — 最高確度" },
  { value: "A", label: "A — 高確度" },
  { value: "B", label: "B — 中層確度" },
  { value: "C", label: "C — 標準確度" },
  { value: "D", label: "D — 要フォロー" },
  { value: "fixed", label: "fixed — 確定済" },
];

// ─── 活動タイプオプション ────────────────────────────────────────────────────────
const ACTIVITY_TYPE_OPTIONS: Array<{
  value: OpportunityActivityReport["activityType"];
  label: string;
}> = [
  { value: "visit", label: "🤝 面談" },
  { value: "phone", label: "📞 電話" },
  { value: "web", label: "💻 オンライン" },
  { value: "other", label: "📋 その他" },
];

// ─── 局面到達チェックボックス定義 ────────────────────────────────────────────────
const MILESTONE_ITEMS: Array<{
  key: keyof NonNullable<OpportunityActivityReport["reachedMilestones"]>;
  label: string;
  desc: string;
}> = [
  { key: "firstConsult", label: "初回相談", desc: "初回面談を実施した" },
  { key: "lifePlan", label: "LP提案", desc: "ライフプラン提案を行った" },
  { key: "proposal", label: "提案", desc: "保険提案書を提出した" },
  { key: "contract", label: "契約", desc: "契約手続きが完了した" },
  { key: "established", label: "成立", desc: "保険が成立・交付された" },
];

type FormState = {
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

function initForm(
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

export function OpportunityReportPage() {
  const { id: opportunityId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const today = format(new Date(), "yyyy-MM-dd");

  const {
    opportunities,
    currentUserId,
    oppActivityReports,
    getOppActivityReport,
    addOppActivityReport,
    updateOppActivityReport,
    syncOppReportToNippou,
    addToast,
  } = useAppStore(
    useShallow((s) => ({
      opportunities: s.opportunities,
      currentUserId: s.currentUserId,
      oppActivityReports: s.oppActivityReports,
      getOppActivityReport: s.getOppActivityReport,
      addOppActivityReport: s.addOppActivityReport,
      updateOppActivityReport: s.updateOppActivityReport,
      syncOppReportToNippou: s.syncOppReportToNippou,
      addToast: s.addToast,
    })),
  );

  const opp = opportunities.find((o) => o.id === opportunityId);

  // 今日の既存報告を取得（ページロード時のみ初期化）
  const existingReport = opportunityId
    ? getOppActivityReport(opportunityId, today, currentUserId)
    : undefined;

  const [form, setForm] = useState<FormState>(() =>
    initForm(today, existingReport),
  );
  const [saving, setSaving] = useState(false);

  if (!opp || !opportunityId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/opportunities")}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          案件一覧へ
        </button>
        <div className="text-center py-12 text-gray-500">
          案件が見つかりません
        </div>
      </div>
    );
  }

  // 過去報告一覧（この案件）
  const pastReports = oppActivityReports
    .filter((r) => r.opportunityId === opportunityId)
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate))
    .slice(0, 5);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleMilestone = (
    key: keyof NonNullable<OpportunityActivityReport["reachedMilestones"]>,
  ) => {
    setForm((prev) => ({
      ...prev,
      reachedMilestones: {
        ...prev.reachedMilestones,
        [key]: !prev.reachedMilestones[key],
      },
    }));
  };

  const handleSave = () => {
    if (!form.summary.trim()) {
      addToast({ type: "error", message: "活動サマリを入力してください" });
      return;
    }
    setSaving(true);

    const reportData = {
      opportunityId,
      userId: currentUserId,
      reportDate: form.reportDate,
      activityType: form.activityType,
      summary: form.summary.trim(),
      proposalDetail: form.proposalDetail.trim() || undefined,
      nextAction: form.nextAction.trim() || undefined,
      nextActionDate: form.nextActionDate || undefined,
      collected: form.collected || undefined,
      confidence: form.confidence,
      deficiencyNote: form.deficiencyNote.trim() || undefined,
      reachedMilestones: Object.values(form.reachedMilestones).some(Boolean)
        ? form.reachedMilestones
        : undefined,
    };

    let savedId: string;
    // 同日・同案件・同ユーザーの既存報告があれば更新
    const existing = getOppActivityReport(
      opportunityId,
      form.reportDate,
      currentUserId,
    );
    if (existing) {
      updateOppActivityReport(existing.id, reportData);
      savedId = existing.id;
    } else {
      const created = addOppActivityReport(reportData);
      savedId = created.id;
    }

    // 要件9: 日報 TimeBlock 自動生成/更新
    syncOppReportToNippou(savedId);

    setSaving(false);
    addToast({
      type: "success",
      message: "報告を保存しました。日報にも活動を反映しました",
    });
    navigate("/opportunities");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* ── ヘッダー ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          aria-label="戻る"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
            商談活動報告
          </p>
          <h1 className="text-lg font-semibold text-gray-900 leading-tight">
            {opp.title}
          </h1>
        </div>
      </div>

      {/* ── 報告フォーム ── */}
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

      {/* ── 日報連携インフォ ── */}
      <div className="bg-blue-50 rounded-xl border border-blue-100 px-4 py-3 text-sm text-blue-700">
        <p className="font-medium mb-0.5">📋 日報自動連携</p>
        <p className="text-blue-600 text-xs leading-relaxed">
          保存すると「{form.reportDate}
          」の日報に活動ブロックが自動追加されます。
          日報から重複入力する必要はありません。
        </p>
      </div>

      {/* ── 保存ボタン ── */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 rounded-xl transition-colors"
      >
        <Save className="w-4 h-4" />
        {saving ? "保存中…" : "報告を保存して日報に反映"}
      </button>

      {/* ── 過去報告一覧 ── */}
      {pastReports.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-500">
            この案件の過去報告
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm">
            {pastReports.map((r) => (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-gray-400">{r.reportDate}</span>
                  <span className="text-xs text-gray-400">
                    {
                      ACTIVITY_TYPE_OPTIONS.find(
                        (o) => o.value === r.activityType,
                      )?.label
                    }
                  </span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">
                  {r.summary}
                </p>
                {r.nextAction && (
                  <p className="text-xs text-blue-600 mt-0.5">
                    → {r.nextAction}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
