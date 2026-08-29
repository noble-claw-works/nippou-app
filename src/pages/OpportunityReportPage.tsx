// =====================================================
// OpportunityReportPage — 商談活動報告入力ページ
// ADR-B4 v2 要件6 + 要件9
// /opportunities/:id/report
// =====================================================
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Save } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "../store";
import type { OpportunityActivityReport } from "../types";
import { ReportForm } from "./opportunityReport/ReportForm";
import { PastReportsList } from "./opportunityReport/PastReportsList";
import { initForm } from "./opportunityReport/helpers";
import type { FormState } from "./opportunityReport/types";

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
  const existingReport = opportunityId
    ? getOppActivityReport(opportunityId, today, currentUserId)
    : undefined;

  const [form, setForm] = useState<FormState>(() =>
    initForm(today, existingReport),
  );
  const [saving, setSaving] = useState(false);

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
      opportunityId: opportunityId!,
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

    const existing = getOppActivityReport(
      opportunityId!,
      form.reportDate,
      currentUserId,
    );
    let savedId: string;
    if (existing) {
      updateOppActivityReport(existing.id, reportData);
      savedId = existing.id;
    } else {
      const created = addOppActivityReport(reportData);
      savedId = created.id;
    }

    syncOppReportToNippou(savedId);
    setSaving(false);
    addToast({
      type: "success",
      message: "報告を保存しました。日報にも活動を反映しました",
    });
    navigate("/opportunities");
  };

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

  const pastReports = oppActivityReports
    .filter((r) => r.opportunityId === opportunityId)
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate))
    .slice(0, 5);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
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

      <ReportForm
        form={form}
        setField={setField}
        toggleMilestone={toggleMilestone}
      />

      <div className="bg-blue-50 rounded-xl border border-blue-100 px-4 py-3 text-sm text-blue-700">
        <p className="font-medium mb-0.5">📋 日報自動連携</p>
        <p className="text-blue-600 text-xs leading-relaxed">
          保存すると「{form.reportDate}
          」の日報に活動ブロックが自動追加されます。
          日報から重複入力する必要はありません。
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 rounded-xl transition-colors"
      >
        <Save className="w-4 h-4" />
        {saving ? "保存中…" : "報告を保存して日報に反映"}
      </button>

      <PastReportsList reports={pastReports} />
    </div>
  );
}
