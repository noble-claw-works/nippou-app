// HouseholdDetailPage.tsx — 世帯詳細 (Phase 1: 世帯員セクション追加 / Phase 2: 商談タブ追加)

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAppStore } from "../store";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { PersonEditModal } from "../components/household/PersonEditModal";
import { QuickOpportunityModal } from "../components/opportunity/QuickOpportunityModal";
import { PolicyEditModal } from "../components/policy/PolicyEditModal";
import { CustomerEditForm } from "./HouseholdDetailPage/CustomerEditForm";
import { HouseholdTimelineBody } from "./HouseholdDetailPage/HouseholdTimelineBody";
import { HouseholdInfoCard } from "./HouseholdDetailPage/HouseholdInfoCard";
import { PersonsSection } from "./HouseholdDetailPage/PersonsSection";
import { OpportunitiesSection } from "./HouseholdDetailPage/OpportunitiesSection";
import { PoliciesSection } from "./HouseholdDetailPage/PoliciesSection";
import { HouseholdTaskSection } from "./HouseholdDetailPage/HouseholdTaskSection";
import { InteractionAddForm } from "./HouseholdDetailPage/InteractionAddForm";
import { useHouseholdDetail } from "./HouseholdDetailPage/useHouseholdDetail";

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
    customerInteractions,
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
    addCustomerInteraction,
  } = useAppStore();

  const [showEdit, setShowEdit] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [editPersonId, setEditPersonId] = useState<string | null>(null);
  const [deletePersonId, setDeletePersonId] = useState<string | null>(null);
  const [showQuickAddOpp, setShowQuickAddOpp] = useState(false);
  const [showAddPolicy, setShowAddPolicy] = useState(false);
  const [showAddInteraction, setShowAddInteraction] = useState(false);

  const customer = customers.find((c) => c.id === customerId);

  const primaryUser = users.find((u) => u.id === customer?.primaryUserId);

  const {
    householdPersons,
    historyEntries,
    householdOpportunities,
    householdPolicies,
    householdInteractions,
    activePolicies,
    closedPolicies,
    totalMonthlyPremium,
  } = useHouseholdDetail({
    customerId,
    customer,
    persons,
    reports,
    opportunities,
    policies,
    customerInteractions,
    getPoliciesByHousehold,
  });

  const handleAddInteraction = useCallback(
    (data: {
      kind: import("../types").InteractionKind;
      occurredAt: string;
      personId?: string;
      summary: string;
      nextAppointment?: string;
      householdId: string;
      byUserId?: string;
    }) => {
      addCustomerInteraction(data);
      setShowAddInteraction(false);
      addToast({ type: "success", message: "対応記録を追加しました" });
    },
    [addCustomerInteraction, addToast],
  );

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
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">
                📅 対応履歴 (
                {historyEntries.length + householdInteractions.length}件)
              </h2>
              {historyEntries.length + householdInteractions.length > 0 && (
                <span className="text-xs text-gray-400">新しい順</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowAddInteraction(true)}
              className="w-full mb-3 flex items-center justify-center gap-1.5 text-xs text-blue-600 border border-blue-300 border-dashed rounded-lg py-2 hover:bg-blue-50 transition-colors"
            >
              <span className="text-base leading-none">＋</span> 対応記録を追加
            </button>
            <HouseholdTimelineBody
              historyEntries={historyEntries}
              interactions={householdInteractions}
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
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700">
              📅 対応履歴 (
              {historyEntries.length + householdInteractions.length}件)
            </h2>
            {historyEntries.length + householdInteractions.length > 0 && (
              <span className="text-xs text-gray-400">新しい順</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowAddInteraction(true)}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-blue-600 border border-blue-300 border-dashed rounded-lg py-1.5 hover:bg-blue-50 transition-colors"
          >
            <span className="text-base leading-none">＋</span> 対応記録を追加
          </button>
        </div>
        <div className="flex-1 px-4 py-3">
          <HouseholdTimelineBody
            historyEntries={historyEntries}
            interactions={householdInteractions}
            users={users}
            onNavigate={(date) => navigate(`/reports/${date}`)}
          />
        </div>
      </aside>

      {/* ── Modals / Dialogs ── */}
      {/* 対応記録追加（ポップアップ）— 入力欄を広くとるためモーダル化 */}
      <Modal
        open={showAddInteraction}
        onClose={() => setShowAddInteraction(false)}
        title="対応記録を追加"
        size="lg"
      >
        <InteractionAddForm
          hideHeader
          persons={householdPersons}
          onSave={(data) =>
            handleAddInteraction({
              ...data,
              householdId: customerId!,
            })
          }
          onCancel={() => setShowAddInteraction(false)}
        />
      </Modal>

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
