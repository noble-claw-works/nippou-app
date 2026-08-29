// OpportunityDetailPage.tsx — 商談案件詳細
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Trash2, CheckSquare, Square } from "lucide-react";
import { useAppStore } from "../store";
import type { ProposalProduct, Task } from "../types";
import { StageBadge } from "../components/opportunity/StageBadge";
import { StageSelector } from "../components/opportunity/StageSelector";
import { ProposalProductEditModal } from "../components/opportunity/ProposalProductEditModal";
import { QuickPolicyIssueModal } from "../components/policy/QuickPolicyIssueModal";
import { OverviewTab } from "./OpportunityDetailPage/OverviewTab";
import { ProductsTab } from "./OpportunityDetailPage/ProductsTab";
import { TasksTab } from "./OpportunityDetailPage/TasksTab";
import { ProposalsTab } from "./OpportunityDetailPage/ProposalsTab";
import { IssuedPoliciesTab } from "./OpportunityDetailPage/IssuedPoliciesTab";
import { ActivityTimeline } from "./OpportunityDetailPage/ActivityTimeline";

type Tab =
  "overview" | "products" | "tasks" | "proposals" | "todos" | "issued_policies";

export function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    opportunities,
    customers,
    users,
    reports,
    policies,
    updateOpportunity,
    deleteOpportunity,
    getPersonsByHousehold,
    addProposalRound,
    updateProposalRound,
    deleteProposalRound,
    addOppTask,
    updateOppTask,
    removeOppTask,
    toggleOppTaskDone,
  } = useAppStore();

  const opp = opportunities.find((o) => o.id === id);
  const [tab, setTab] = useState<Tab>("overview");
  const [editingStage, setEditingStage] = useState(false);
  const [editProduct, setEditProduct] = useState<
    ProposalProduct | null | undefined
  >(undefined);
  const [editingFields, setEditingFields] = useState(false);
  const [fieldDraft, setFieldDraft] = useState<Record<string, string>>({});
  const [showQuickIssue, setShowQuickIssue] = useState(false);

  if (!opp) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>案件が見つかりません</p>
        <button
          onClick={() => navigate("/opportunities")}
          className="mt-2 text-blue-500 hover:underline text-sm"
        >
          一覧に戻る
        </button>
      </div>
    );
  }

  const household = customers.find((c) => c.id === opp.householdId);
  const persons = getPersonsByHousehold(opp.householdId);
  const owner = users.find((u) => u.id === opp.ownerId);
  const issuedPolicies = policies.filter(
    (p) => p.sourceOpportunityId === opp.id,
  );
  const relatedBlocks = reports
    .flatMap((r) => r.blocks ?? [])
    .filter((b) => b.opportunityId === id)
    .sort((a, b) => b.startTime.localeCompare(a.startTime));
  const relatedTodos = reports
    .flatMap((r) => (r.todos ?? []).map((t) => ({ ...t, date: r.date })))
    .filter((t) => t.opportunityId === id);

  const handleDeleteProduct = (productId: string) => {
    const products = opp.proposalProducts.filter((p) => p.id !== productId);
    const total = products.reduce((s, p) => s + p.monthlyPremium, 0);
    updateOpportunity(id!, {
      proposalProducts: products,
      productCategories: [...new Set(products.map((p) => p.productCategory))],
      totalMonthlyPremium: total > 0 ? total : undefined,
    });
  };

  const handleSaveProduct = (product: ProposalProduct) => {
    const existing = opp.proposalProducts.find((p) => p.id === product.id);
    const products = existing
      ? opp.proposalProducts.map((p) => (p.id === product.id ? product : p))
      : [...opp.proposalProducts, product];
    const total = products.reduce((s, p) => s + p.monthlyPremium, 0);
    updateOpportunity(id!, {
      proposalProducts: products,
      productCategories: [...new Set(products.map((p) => p.productCategory))],
      totalMonthlyPremium: total > 0 ? total : undefined,
    });
    setEditProduct(undefined);
  };

  const handleDelete = () => {
    if (!confirm("この案件を削除しますか？")) return;
    deleteOpportunity(id!);
    navigate("/opportunities");
  };

  const startEditFields = () => {
    setFieldDraft({
      nextAction: opp.nextAction ?? "",
      nextActionDate: opp.nextActionDate ?? "",
      expectedCloseDate: opp.expectedCloseDate ?? "",
      memo: opp.memo,
    });
    setEditingFields(true);
  };

  const handleSaveFields = () => {
    updateOpportunity(id!, {
      nextAction: fieldDraft.nextAction ?? opp.nextAction,
      nextActionDate: fieldDraft.nextActionDate ?? opp.nextActionDate,
      expectedCloseDate: fieldDraft.expectedCloseDate ?? opp.expectedCloseDate,
      memo: fieldDraft.memo ?? opp.memo,
    });
    setEditingFields(false);
    setFieldDraft({});
  };

  const oppTasks = opp.tasks ?? [];
  const doneTaskCount = oppTasks.filter((t) => t.done).length;
  const proposals = opp.proposals ?? [];

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "📊 概要" },
  ];
  if (opp.proposalProducts.length > 0)
    TABS.push({
      key: "products",
      label: `📄 提案商品 (${opp.proposalProducts.length})`,
    });
  TABS.push({
    key: "tasks",
    label: `☑️ タスク (${doneTaskCount}/${oppTasks.length})`,
  });
  if (proposals.length > 0)
    TABS.push({ key: "proposals", label: `📝 提案履歴 (${proposals.length})` });
  if (relatedTodos.length > 0)
    TABS.push({ key: "todos", label: `✅ TODO (${relatedTodos.length})` });
  if (issuedPolicies.length > 0)
    TABS.push({
      key: "issued_policies",
      label: `📜 契約発行 (${issuedPolicies.length})`,
    });
  const activeTab: Tab = TABS.some((t) => t.key === tab) ? tab : "overview";

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-4 max-w-4xl mx-auto">
          <button
            onClick={() => navigate("/opportunities")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ChevronLeft className="w-4 h-4" /> 商談一覧
          </button>

          {/* Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{opp.title}</h1>
                <div className="mt-1 flex items-center gap-2 flex-wrap text-sm text-gray-500">
                  <Link
                    to={`/households/${opp.householdId}`}
                    className="text-blue-600 hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {household?.name ?? opp.householdId}
                  </Link>
                  <span>・</span>
                  <span>担当: {owner?.name ?? opp.ownerId}</span>
                  {opp.totalMonthlyPremium && (
                    <>
                      <span>・</span>
                      <span className="font-medium text-gray-700">
                        ¥{opp.totalMonthlyPremium.toLocaleString()}/月
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={handleDelete}
                className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <StageBadge stage={opp.stage} size="lg" />
              <button
                onClick={() => setEditingStage((v) => !v)}
                className="text-sm text-blue-600 hover:underline"
              >
                {editingStage ? "キャンセル" : "ステージを変更"}
              </button>
              {opp.stage !== "issued" &&
                opp.stage !== "lost" &&
                opp.proposalProducts.length > 0 && (
                  <button
                    onClick={() => setShowQuickIssue(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    🎉 契約発行（受注）
                  </button>
                )}
              {opp.nextAction && (
                <span className="text-sm text-gray-500">
                  次: {opp.nextAction}
                  {opp.nextActionDate && ` (${opp.nextActionDate})`}
                </span>
              )}
            </div>
            {editingStage && (
              <div className="mt-3">
                <StageSelector
                  opportunity={opp}
                  onClose={() => setEditingStage(false)}
                />
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-4">
            <div className="flex gap-0 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === t.key
                      ? "border-blue-500 text-blue-600 font-medium"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "overview" && (
            <OverviewTab
              opp={opp}
              users={users}
              editingFields={editingFields}
              fieldDraft={fieldDraft}
              onToggleEdit={startEditFields}
              onSaveFields={handleSaveFields}
              onFieldDraftChange={setFieldDraft}
              onUpdateOpportunity={(oppId, patch) =>
                updateOpportunity(oppId, patch)
              }
            />
          )}
          {activeTab === "products" && (
            <ProductsTab
              opp={opp}
              persons={persons}
              onAdd={() => setEditProduct(null)}
              onEdit={(pp) => setEditProduct(pp)}
              onDelete={handleDeleteProduct}
            />
          )}
          {activeTab === "tasks" && (
            <TasksTab
              opp={opp}
              onToggle={(taskId, done) => toggleOppTaskDone(id!, taskId, done)}
              onAdd={(task) =>
                addOppTask(
                  id!,
                  task as Omit<Task, "id" | "createdAt" | "updatedAt">,
                )
              }
              onUpdate={(taskId, patch) => updateOppTask(id!, taskId, patch)}
              onRemove={(taskId) => removeOppTask(id!, taskId)}
            />
          )}
          {activeTab === "proposals" && (
            <ProposalsTab
              opp={opp}
              onAdd={(data) => addProposalRound(id!, data)}
              onUpdate={(roundId, data) =>
                updateProposalRound(id!, roundId, data)
              }
              onDelete={(roundId) => deleteProposalRound(id!, roundId)}
            />
          )}
          {activeTab === "todos" && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">TODO</h2>
              {relatedTodos.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  この案件に紐付く TODO がありません
                </p>
              ) : (
                <div className="space-y-2">
                  {relatedTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-start gap-2 text-sm"
                    >
                      {todo.completed ? (
                        <CheckSquare className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      )}
                      <span
                        className={
                          todo.completed
                            ? "line-through text-gray-400"
                            : "text-gray-700"
                        }
                      >
                        {todo.text}
                      </span>
                      <span className="text-gray-400 ml-auto shrink-0">
                        {todo.date}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === "issued_policies" && (
            <IssuedPoliciesTab
              opp={opp}
              issuedPolicies={issuedPolicies}
              showQuickIssue={showQuickIssue}
              onShowQuickIssue={() => setShowQuickIssue(true)}
              onCloseQuickIssue={() => setShowQuickIssue(false)}
            />
          )}

          {/* Product edit modal */}
          {editProduct !== undefined && (
            <ProposalProductEditModal
              product={editProduct ?? undefined}
              opportunityId={id!}
              householdId={opp.householdId}
              onClose={() => setEditProduct(undefined)}
              onSave={handleSaveProduct}
            />
          )}
          {showQuickIssue && activeTab !== "issued_policies" && (
            <QuickPolicyIssueModal
              opportunity={opp}
              onClose={() => setShowQuickIssue(false)}
            />
          )}

          {/* Mobile activity timeline */}
          {relatedBlocks.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 mt-4 lg:hidden">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                📅 活動履歴 ({relatedBlocks.length}件)
              </h2>
              <ActivityTimeline blocks={relatedBlocks} mobile />
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-80 shrink-0 border-l border-gray-200 bg-white overflow-y-auto min-h-0">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            📅 活動履歴 ({relatedBlocks.length}件)
          </h2>
          {relatedBlocks.length > 0 && (
            <span className="text-xs text-gray-400">新しい順</span>
          )}
        </div>
        <div className="flex-1 px-4 py-3">
          <ActivityTimeline blocks={relatedBlocks} />
        </div>
      </aside>
    </div>
  );
}
