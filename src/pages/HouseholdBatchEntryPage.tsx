// HouseholdBatchEntryPage — 世帯まとめ入力 / ★useShallow必須
import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useShallow } from "zustand/shallow";
import { Plus, AlertCircle } from "lucide-react";
import { useAppStore } from "../store";
import { EmptyState } from "../components/ui/EmptyState";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import type { Opportunity } from "../types";
import {
  calcTotalMonthlyPremium,
  toDraft,
  createEmptyDraft,
  duplicateDraft,
  countInvalidDrafts,
  filterDrafts,
  type DraftOpportunity,
  type ShowFilter,
} from "../utils/householdBatchEntry";
import { SALES_CHANNELS } from "../data/salesChannels";
import { OpportunityCard } from "./HouseholdBatchEntryPage/OpportunityCard";
import { PageHeader } from "./HouseholdBatchEntryPage/PageHeader";
import { PageFooter } from "./HouseholdBatchEntryPage/PageFooter";
import { HouseholdHeaderSection } from "./HouseholdBatchEntryPage/HouseholdHeaderSection";

export function HouseholdBatchEntryPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromRaw = searchParams.get("from");
  const fromParam =
    fromRaw === "today"
      ? "/today"
      : fromRaw?.startsWith("report:")
        ? `/reports/${fromRaw.slice("report:".length)}`
        : "/households";

  const {
    customers,
    persons: allPersons,
    opportunities: allOpportunities,
    currentUserId,
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
    updateCustomer,
    addToast,
  } = useAppStore(
    useShallow((s) => ({
      customers: s.customers,
      persons: s.persons,
      opportunities: s.opportunities,
      currentUserId: s.currentUserId,
      addOpportunity: s.addOpportunity,
      updateOpportunity: s.updateOpportunity,
      deleteOpportunity: s.deleteOpportunity,
      updateCustomer: s.updateCustomer,
      addToast: s.addToast,
    })),
  );

  const household = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId],
  );
  const householdPersons = useMemo(
    () => allPersons.filter((p) => p.householdId === customerId),
    [allPersons, customerId],
  );
  const personOptions = useMemo(
    () => householdPersons.map((p) => ({ id: p.id, name: p.name })),
    [householdPersons],
  );
  const rawOpportunities = useMemo(
    () => allOpportunities.filter((o) => o.householdId === customerId),
    [allOpportunities, customerId],
  );

  const [drafts, setDrafts] = useState<DraftOpportunity[]>(() =>
    rawOpportunities.map((opp) => toDraft(opp)),
  );
  const [headerContractorId, setHeaderContractorId] = useState(
    household?.headPersonId ?? "",
  );
  const [headerChannelId, setHeaderChannelId] = useState("");
  const [headerDate, setHeaderDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [annualIncome, setAnnualIncome] = useState(
    household?.annualIncome ? String(household.annualIncome) : "",
  );
  const [showFilter, setShowFilter] = useState<ShowFilter>("active");
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [pendingNavigate, setPendingNavigate] = useState<string | null>(null);

  const handleSaveSingle = useCallback(
    async (draft: DraftOpportunity) => {
      if (draft._isNew) {
        const totalMonthlyPremium = calcTotalMonthlyPremium(
          draft.proposalProducts,
        );
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _isNew, _isDirty, _isOpen, id: _draftId, ...rest } = draft;
        addOpportunity({
          ...rest,
          totalMonthlyPremium:
            totalMonthlyPremium > 0 ? totalMonthlyPremium : undefined,
        } as Omit<
          Opportunity,
          | "id"
          | "stageHistory"
          | "createdAt"
          | "updatedAt"
          | "totalMonthlyPremium"
        >);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _isNew, _isDirty, _isOpen, ...patch } = draft;
        const totalMonthlyPremium = calcTotalMonthlyPremium(
          draft.proposalProducts,
        );
        updateOpportunity(draft.id, {
          ...patch,
          totalMonthlyPremium:
            totalMonthlyPremium > 0 ? totalMonthlyPremium : undefined,
        });
      }
      setDrafts((prev) =>
        prev.map((d) =>
          d.id === draft.id ? { ...d, _isDirty: false, _isNew: false } : d,
        ),
      );
      addToast({ type: "success", message: "案件を保存しました" });
    },
    [addOpportunity, updateOpportunity, addToast],
  );

  const handleSaveAll = useCallback(async () => {
    const dirtyDrafts = drafts.filter((d) => d._isDirty);
    if (dirtyDrafts.length === 0) {
      addToast({ type: "info", message: "変更はありません" });
      return;
    }
    setSaving(true);
    try {
      for (const draft of dirtyDrafts) {
        await handleSaveSingle(draft);
      }
      if (customerId) {
        updateCustomer(customerId, {
          annualIncome: annualIncome ? Number(annualIncome) : undefined,
        });
      }
      addToast({
        type: "success",
        message: `${dirtyDrafts.length}件の案件を保存しました`,
      });
    } finally {
      setSaving(false);
    }
  }, [
    drafts,
    handleSaveSingle,
    customerId,
    annualIncome,
    updateCustomer,
    addToast,
  ]);

  const handleUpdateDraft = useCallback(
    (draftId: string, patch: Partial<DraftOpportunity>) => {
      setDrafts((prev) =>
        prev.map((d) =>
          d.id === draftId ? { ...d, ...patch, _isDirty: true } : d,
        ),
      );
    },
    [],
  );

  const handleAddOpportunity = useCallback(() => {
    const draft = createEmptyDraft({
      householdId: customerId!,
      ownerId: currentUserId,
      contractorPersonId: headerContractorId || undefined,
      channelId: headerChannelId || undefined,
    });
    setDrafts((prev) => [...prev, draft]);
  }, [customerId, currentUserId, headerContractorId, headerChannelId]);

  const handleDuplicate = useCallback(
    (draftId: string) => {
      const source = drafts.find((d) => d.id === draftId);
      if (!source) return;
      const dup = duplicateDraft(source, {
        contractorPersonId: headerContractorId || undefined,
        channelId: headerChannelId || undefined,
      });
      const idx = drafts.findIndex((d) => d.id === draftId);
      setDrafts((prev) => [
        ...prev.slice(0, idx + 1),
        dup,
        ...prev.slice(idx + 1),
      ]);
    },
    [drafts, headerContractorId, headerChannelId],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTargetId) return;
    const target = drafts.find((d) => d.id === deleteTargetId);
    if (!target) {
      setDeleteTargetId(null);
      return;
    }
    if (!target._isNew) deleteOpportunity(deleteTargetId);
    setDrafts((prev) => prev.filter((d) => d.id !== deleteTargetId));
    setDeleteTargetId(null);
    addToast({ type: "success", message: "案件を削除しました" });
  }, [deleteTargetId, drafts, deleteOpportunity, addToast]);

  const handleToggleOpen = useCallback((draftId: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, _isOpen: !d._isOpen } : d)),
    );
  }, []);

  const hasDirty = drafts.some((d) => d._isDirty);
  const handleBack = useCallback(() => {
    if (hasDirty) {
      setPendingNavigate(fromParam);
      setShowLeaveConfirm(true);
    } else navigate(fromParam);
  }, [hasDirty, fromParam, navigate]);

  const visibleDrafts = useMemo(
    () => filterDrafts(drafts, showFilter),
    [drafts, showFilter],
  );
  const dirtyDrafts = useMemo(() => drafts.filter((d) => d._isDirty), [drafts]);
  const dirtyCount = dirtyDrafts.length;
  const invalidCount = useMemo(
    () => countInvalidDrafts(dirtyDrafts, SALES_CHANNELS),
    [dirtyDrafts],
  );
  const deleteTargetDraft = useMemo(
    () => drafts.find((d) => d.id === deleteTargetId),
    [drafts, deleteTargetId],
  );

  if (!household) {
    return (
      <div className="px-4 py-8">
        <EmptyState icon="🔍" title="世帯が見つかりません" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 pb-32">
      <PageHeader
        householdName={household.name}
        saving={saving}
        dirtyCount={dirtyCount}
        onBack={handleBack}
        onSaveAll={handleSaveAll}
      />

      <HouseholdHeaderSection
        personOptions={personOptions}
        headerContractorId={headerContractorId}
        headerDate={headerDate}
        headerChannelId={headerChannelId}
        annualIncome={annualIncome}
        onContractorChange={setHeaderContractorId}
        onDateChange={setHeaderDate}
        onChannelChange={setHeaderChannelId}
        onAnnualIncomeChange={setAnnualIncome}
      />

      {/* ── 案件一覧ヘッダー ── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">
          💼 案件 (
          {rawOpportunities.length + drafts.filter((d) => d._isNew).length}件)
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={showFilter}
            onChange={(e) => setShowFilter(e.target.value as ShowFilter)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="active">進行中のみ</option>
            <option value="all">すべて表示</option>
          </select>
          <button
            type="button"
            onClick={handleAddOpportunity}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" /> 案件を追加
          </button>
        </div>
      </div>

      {invalidCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 mb-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            未入力の必須項目が {invalidCount}{" "}
            件あります（赤枠のカードをご確認ください）
          </span>
        </div>
      )}

      {visibleDrafts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
          <p className="text-3xl mb-2">📂</p>
          <p className="text-sm text-gray-500 mb-4">
            {showFilter === "active"
              ? "進行中の案件はありません"
              : "案件がまだありません"}
          </p>
          <button
            type="button"
            onClick={handleAddOpportunity}
            className="text-sm text-blue-600 hover:underline"
          >
            + 最初の案件を追加
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleDrafts.map((draft, idx) => (
            <OpportunityCard
              key={draft.id}
              draft={draft}
              index={idx}
              persons={personOptions}
              headerContractorId={headerContractorId}
              headerChannelId={headerChannelId}
              onUpdate={(patch) => handleUpdateDraft(draft.id, patch)}
              onDuplicate={() => handleDuplicate(draft.id)}
              onDeleteRequest={() => setDeleteTargetId(draft.id)}
              onToggleOpen={() => handleToggleOpen(draft.id)}
            />
          ))}
        </div>
      )}

      <PageFooter
        dirtyCount={dirtyCount}
        invalidCount={invalidCount}
        saving={saving}
        onBack={handleBack}
        onSaveAll={handleSaveAll}
      />

      <ConfirmDialog
        open={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title="案件を削除しますか？"
        message={
          <div>
            <p>「{deleteTargetDraft?.title}」を削除します。</p>
            {deleteTargetDraft && !deleteTargetDraft._isNew && (
              <p className="text-sm text-amber-600 mt-2">
                ⚠ この操作は元に戻せません。
              </p>
            )}
          </div>
        }
        confirmLabel="削除する"
      />

      <ConfirmDialog
        open={showLeaveConfirm}
        onClose={() => {
          setShowLeaveConfirm(false);
          setPendingNavigate(null);
        }}
        onConfirm={() => {
          setShowLeaveConfirm(false);
          if (pendingNavigate) navigate(pendingNavigate);
        }}
        title="変更を破棄しますか？"
        message="未保存の変更があります。このまま離脱すると変更は失われます。"
        confirmLabel="破棄して離脱"
      />
    </div>
  );
}
