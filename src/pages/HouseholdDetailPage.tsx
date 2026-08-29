// HouseholdDetailPage.tsx — 世帯詳細 (Phase 1: 世帯員セクション追加 / Phase 2: 商談タブ追加)

import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAppStore } from "../store";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { PersonEditModal } from "../components/household/PersonEditModal";
import { QuickOpportunityModal } from "../components/opportunity/QuickOpportunityModal";
import { PolicyEditModal } from "../components/policy/PolicyEditModal";
import { RELATION_ORDER } from "./HouseholdDetailPage/helpers";
import { CustomerEditForm } from "./HouseholdDetailPage/CustomerEditForm";
import {
  HouseholdTimelineBody,
  type TimelineEntry,
} from "./HouseholdDetailPage/HouseholdTimelineBody";
import { HouseholdInfoCard } from "./HouseholdDetailPage/HouseholdInfoCard";
import { PersonsSection } from "./HouseholdDetailPage/PersonsSection";
import { OpportunitiesSection } from "./HouseholdDetailPage/OpportunitiesSection";
import { PoliciesSection } from "./HouseholdDetailPage/PoliciesSection";
import { HouseholdTaskSection } from "./HouseholdDetailPage/HouseholdTaskSection";

export function HouseholdDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.hash === "#history") {
      const el = document.getElementById("history");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  const {
    customers,
    users,
    reports,
    persons,
    opportunities,
    policies,
    currentRole,
    updateCustomer,
    deactivateCustomer,
    addToast,
    addPerson,
    updatePerson,
    deletePerson,
    getPoliciesByHousehold,
    addHouseholdTask,
    updateHouseholdTask,
    removeHouseholdTask,
    toggleHouseholdTaskDone,
  } = useAppStore();

  const [showEdit, setShowEdit] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [editPersonId, setEditPersonId] = useState<string | null>(null);
  const [deletePersonId, setDeletePersonId] = useState<string | null>(null);
  const [showQuickAddOpp, setShowQuickAddOpp] = useState(false);
  const [showAddPolicy, setShowAddPolicy] = useState(false);

  const customer = customers.find((c) => c.id === customerId);

  const primaryUser = useMemo(
    () => users.find((u) => u.id === customer?.primaryUserId),
    [users, customer?.primaryUserId],
  );

  const householdPersons = useMemo(
    () =>
      customer
        ? persons
            .filter((p) => p.householdId === customerId)
            .sort(
              (a, b) =>
                (RELATION_ORDER[a.relation] ?? 9) -
                (RELATION_ORDER[b.relation] ?? 9),
            )
        : [],
    [persons, customerId, customer],
  );

  const historyEntries = useMemo<TimelineEntry[]>(() => {
    if (!customer) return [];
    const entries: TimelineEntry[] = [];
    for (const r of reports) {
      for (const b of r.blocks) {
        if (b.customerId === customerId) {
          entries.push({
            reportId: r.id,
            reportDate: r.date,
            reportUserId: r.userId,
            block: b,
          });
        }
      }
    }
    entries.sort((a, b) => {
      if (a.reportDate !== b.reportDate)
        return a.reportDate < b.reportDate ? 1 : -1;
      return (a.block.startTime || "") < (b.block.startTime || "") ? 1 : -1;
    });
    return entries;
  }, [reports, customerId, customer]);

  const householdOpportunities = useMemo(
    () =>
      customer ? opportunities.filter((o) => o.householdId === customerId) : [],
    [opportunities, customerId, customer],
  );

  /* eslint-disable react-hooks/exhaustive-deps */
  const householdPolicies = useMemo(
    () => (customerId ? getPoliciesByHousehold(customerId) : []),
    [policies, customerId],
  );
  /* eslint-enable react-hooks/exhaustive-deps */

  if (!customer)
    return (
      <div className="px-4 py-8">
        <EmptyState icon="🔍" title="世帯が見つかりません" />
      </div>
    );

  const canEdit = currentRole === "manager" || currentRole === "admin";
  const canDeactivate = currentRole === "admin";
  const editingPerson = editPersonId
    ? householdPersons.find((p) => p.id === editPersonId)
    : null;

  const activePolicies = householdPolicies.filter(
    (p) => p.status === "inforce" || p.status === "pending",
  );
  const closedPolicies = householdPolicies.filter(
    (p) => p.status !== "inforce" && p.status !== "pending",
  );
  const totalMonthlyPremium = activePolicies
    .filter((p) => p.status === "inforce")
    .reduce((s, p) => s + p.monthlyPremium, 0);

  return (
    <div className="flex h-full min-h-0">
      {/* ─── 左カラム ─── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate("/households")}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> 世帯一覧へ
          </button>

          <HouseholdInfoCard
            customer={customer}
            primaryUserName={primaryUser?.name}
            activePolicies={activePolicies}
            householdPolicies={householdPolicies}
            totalMonthlyPremium={totalMonthlyPremium}
            canEdit={canEdit}
            canDeactivate={canDeactivate}
            onEdit={() => setShowEdit(true)}
            onDeactivate={() => setDeactivating(true)}
          />

          <PersonsSection
            persons={householdPersons}
            onAdd={() => setShowAddPerson(true)}
            onEdit={(id) => setEditPersonId(id)}
            onDelete={(id) => setDeletePersonId(id)}
          />

          <OpportunitiesSection
            opportunities={householdOpportunities}
            onBatchEntry={() =>
              navigate(`/households/${customerId}/batch-entry`)
            }
            onQuickAdd={() => setShowQuickAddOpp(true)}
          />

          <PoliciesSection
            householdId={customerId!}
            activePolicies={activePolicies}
            closedPolicies={closedPolicies}
            onAddPolicy={() => setShowAddPolicy(true)}
          />

          <HouseholdTaskSection
            customer={customer}
            onAddTask={addHouseholdTask}
            onUpdateTask={updateHouseholdTask}
            onRemoveTask={removeHouseholdTask}
            onToggleDone={toggleHouseholdTaskDone}
          />

          {/* モバイル: タイムライン (lg未満) */}
          <section
            id="history-mobile"
            className="bg-white rounded-xl border border-gray-200 p-4 lg:hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">
                📅 対応履歴 ({historyEntries.length}件)
              </h2>
              {historyEntries.length > 0 && (
                <span className="text-xs text-gray-400">新しい順</span>
              )}
            </div>
            <HouseholdTimelineBody
              historyEntries={historyEntries}
              users={users}
              onNavigate={(date) => navigate(`/reports/${date}`)}
            />
          </section>
        </div>
      </div>

      {/* ─── 右カラム: タイムライン (lg以上) ─── */}
      <aside
        id="history"
        className="hidden lg:flex lg:flex-col w-80 shrink-0 border-l border-gray-200 bg-white overflow-y-auto min-h-0"
      >
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            📅 対応履歴 ({historyEntries.length}件)
          </h2>
          {historyEntries.length > 0 && (
            <span className="text-xs text-gray-400">新しい順</span>
          )}
        </div>
        <div className="flex-1 px-4 py-3">
          <HouseholdTimelineBody
            historyEntries={historyEntries}
            users={users}
            onNavigate={(date) => navigate(`/reports/${date}`)}
          />
        </div>
      </aside>

      {/* ── Modals / Dialogs ── */}
      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="世帯を編集"
        size="md"
      >
        <CustomerEditForm
          initial={customer}
          onSave={(data) => {
            updateCustomer(customer.id, data);
            setShowEdit(false);
            addToast({ type: "success", message: "変更を保存しました" });
          }}
          onCancel={() => setShowEdit(false)}
        />
      </Modal>

      <PersonEditModal
        open={showAddPerson}
        onClose={() => setShowAddPerson(false)}
        title="世帯員を追加"
        onSave={(data) => {
          addPerson(customerId!, data);
          addToast({ type: "success", message: "世帯員を追加しました" });
        }}
      />

      {editingPerson && (
        <PersonEditModal
          open={!!editPersonId}
          onClose={() => setEditPersonId(null)}
          title="世帯員を編集"
          initial={editingPerson}
          onSave={(data) => {
            updatePerson(editingPerson.id, data);
            setEditPersonId(null);
            addToast({ type: "success", message: "世帯員を更新しました" });
          }}
        />
      )}

      <ConfirmDialog
        open={!!deletePersonId}
        onClose={() => setDeletePersonId(null)}
        onConfirm={() => {
          const result = deletePerson(deletePersonId!);
          addToast({
            type: result.ok ? "success" : "error",
            message: result.ok
              ? "世帯員を削除しました"
              : (result.error ?? "削除に失敗しました"),
          });
          setDeletePersonId(null);
        }}
        title="世帯員を削除しますか？"
        message={
          <div className="space-y-2">
            <p>
              「{householdPersons.find((p) => p.id === deletePersonId)?.name}
              」を削除します。
            </p>
            {householdPersons.find((p) => p.id === deletePersonId)?.relation ===
              "head" &&
              householdPersons.length > 1 && (
                <p className="text-sm text-amber-600">
                  ⚠ 世帯主を削除します。次の世帯員が自動的に世帯主になります。
                </p>
              )}
          </div>
        }
        confirmLabel="削除する"
      />

      <ConfirmDialog
        open={deactivating}
        onClose={() => setDeactivating(false)}
        onConfirm={() => {
          deactivateCustomer(customer.id);
          addToast({ type: "info", message: "無効化しました" });
          navigate("/households");
        }}
        title="世帯を無効化しますか？"
        message={`「${customer.name}」を無効化します。`}
        confirmLabel="無効化する"
      />

      {showQuickAddOpp && (
        <QuickOpportunityModal
          householdId={customer.id}
          householdName={customer.name}
          onCreated={(_id) => {
            setShowQuickAddOpp(false);
            navigate(`/opportunities/${_id}`);
          }}
          onClose={() => setShowQuickAddOpp(false)}
        />
      )}

      {showAddPolicy && (
        <PolicyEditModal
          householdId={customer.id}
          onClose={() => setShowAddPolicy(false)}
        />
      )}
    </div>
  );
}
