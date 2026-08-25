// HouseholdDetailPage.tsx — 世帯詳細 (Phase 1: 世帯員セクション追加 / Phase 2: 商談タブ追加)

import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Tag,
  Edit,
  Clock,
  User as UserIcon,
  FileText,
  CheckCircle2,
  Calendar as CalendarIcon,
  Plus,
  Layers,
} from "lucide-react";
import { useAppStore } from "../store";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { PersonEditModal } from "../components/household/PersonEditModal";
import { BLOCK_EMOJIS, BLOCK_LABELS } from "../utils";
import type {
  Customer,
  CustomerType,
  PersonRelation,
  PersonGender,
  Task,
  BlockType,
} from "../types";
import { StageBadge } from "../components/opportunity/StageBadge";
import { QuickOpportunityModal } from "../components/opportunity/QuickOpportunityModal";
import { PolicyStatusBadge } from "../components/policy/PolicyStatusBadge";
import { CoverageMatrix } from "../components/policy/CoverageMatrix";
import { PolicyEditModal } from "../components/policy/PolicyEditModal";

const TYPE_LABELS: Record<CustomerType, string> = {
  individual: "個人",
  corporate: "法人",
  prospect: "見込み",
};
const RELATION_LABELS: Record<PersonRelation, string> = {
  head: "世帯主",
  spouse: "配偶者",
  child: "子",
  parent: "親",
  sibling: "兄弟姉妹",
  other: "その他",
};
const GENDER_LABELS: Record<PersonGender, string> = {
  M: "男性",
  F: "女性",
  other: "その他",
};

function calcAge(birthDate?: string): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const today = new Date();
  const age =
    today.getFullYear() -
    birth.getFullYear() -
    (today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
      ? 1
      : 0);
  return `${age}歳`;
}

function CustomerEditForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Customer;
  onSave: (data: Partial<Customer>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<Customer>>({ ...initial });
  const { users } = useAppStore();
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          世帯名
        </label>
        <input
          value={form.name ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          エリア
        </label>
        <input
          value={form.area ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          主担当
        </label>
        <select
          value={form.primaryUserId ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, primaryUserId: e.target.value }))
          }
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {users
            .filter((u) => u.status === "active")
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          家族構成メモ
        </label>
        <textarea
          value={form.familyMemo ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, familyMemo: e.target.value }))
          }
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          メモ
        </label>
        <textarea
          value={form.memo ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          キャンセル
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.name?.trim()}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          保存
        </button>
      </div>
    </div>
  );
}

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
  const [oppTab, setOppTab] = useState<"open" | "closed">("open");
  const [showQuickAddOpp, setShowQuickAddOpp] = useState(false);
  const [policyTab, setPolicyTab] = useState<"active" | "closed">("active");
  const [showAddPolicy, setShowAddPolicy] = useState(false);

  // ADR-TASK-MASTER: 世帯タスク
  const [addingHouseholdTask, setAddingHouseholdTask] = useState(false);
  const [householdTaskDraft, setHouseholdTaskDraft] = useState<{
    title: string;
    dueDate: string;
    priority: Task["priority"];
    memo: string;
  }>({
    title: "",
    dueDate: "",
    priority: "medium",
    memo: "",
  });
  const [editingHouseholdTaskId, setEditingHouseholdTaskId] = useState<
    string | null
  >(null);
  const [householdTaskEditDraft, setHouseholdTaskEditDraft] = useState<
    Partial<Task>
  >({});

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
            .sort((a, b) => {
              const order: Record<PersonRelation, number> = {
                head: 0,
                spouse: 1,
                child: 2,
                parent: 3,
                sibling: 4,
                other: 5,
              };
              return (order[a.relation] ?? 9) - (order[b.relation] ?? 9);
            })
        : [],
    [persons, customerId, customer],
  );

  const historyEntries = useMemo(() => {
    if (!customer) return [];
    const entries: Array<{
      reportId: string;
      reportDate: string;
      reportUserId: string;
      block: (typeof reports)[number]["blocks"][number];
    }> = [];
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

  // Phase 2: Opportunities for this household
  const householdOpportunities = useMemo(
    () =>
      customer ? opportunities.filter((o) => o.householdId === customerId) : [],
    [opportunities, customerId, customer],
  );

  // Phase 3: Policies for this household
  // getPoliciesByHousehold は store の selector で毎レンダー新しい参照になるため除外。policies/customerIdの変化で十分再計算される。
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

  const openOpportunities = householdOpportunities.filter(
    (o) => o.status === "open",
  );
  const closedOpportunities = householdOpportunities.filter(
    (o) => o.status !== "open",
  );
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
      {/* ─── 左カラム: メイン本文 ─── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate("/households")}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> 世帯一覧へ
          </button>

          {/* 世帯情報カード */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-gray-900">
                    🏠 {customer.name}
                  </h1>
                  {customer.isFavorite && <span>⭐</span>}
                  {customer.status === "inactive" && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      無効
                    </span>
                  )}
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {TYPE_LABELS[customer.type]}
                </span>
              </div>
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    onClick={() => setShowEdit(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Edit className="w-4 h-4" /> 編集
                  </button>
                )}
                {canDeactivate && customer.status === "active" && (
                  <button
                    onClick={() => setDeactivating(true)}
                    className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                  >
                    無効化
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">エリア:</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{customer.area || "未設定"}</span>
                </div>
              </div>
              <div>
                <span className="text-gray-500">主担当:</span>
                <p className="mt-0.5">{primaryUser?.name ?? "未設定"}</p>
              </div>
              <div>
                <span className="text-gray-500">最終接触:</span>
                <p className="mt-0.5">{customer.lastContactDate ?? "未記録"}</p>
              </div>
              <div>
                <span className="text-gray-500">次回AP:</span>
                <p className="mt-0.5 text-blue-600">
                  {customer.nextAppointment ?? "未設定"}
                </p>
              </div>
            </div>

            {customer.familyMemo && (
              <div className="mt-4">
                <span className="text-xs text-gray-500 block mb-1">
                  家族構成メモ:
                </span>
                <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-3">
                  {customer.familyMemo}
                </p>
              </div>
            )}

            {customer.tags.length > 0 && (
              <div className="mt-4">
                <span className="text-xs text-gray-500 block mb-1">タグ:</span>
                <div className="flex gap-1 flex-wrap">
                  {customer.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-0.5 text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {customer.memo && (
              <div className="mt-4">
                <span className="text-xs text-gray-500 block mb-1">メモ:</span>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                  {customer.memo}
                </p>
              </div>
            )}

            {/* Phase 3: 保険料統計 */}
            {householdPolicies.length > 0 && (
              <div className="mt-4 flex gap-4 text-sm">
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2">
                  <p className="text-xs text-blue-600">総月払</p>
                  <p className="text-base font-bold text-blue-900">
                    ￥{totalMonthlyPremium.toLocaleString()}
                  </p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2">
                  <p className="text-xs text-green-600">年換算</p>
                  <p className="text-base font-bold text-green-900">
                    ￥{(totalMonthlyPremium * 12).toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2">
                  <p className="text-xs text-gray-600">強効中契約</p>
                  <p className="text-base font-bold text-gray-800">
                    {
                      activePolicies.filter((p) => p.status === "inforce")
                        .length
                    }
                    件
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 👨‍👩‍👧 世帯員セクション */}
          <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">
                👨‍👩‍👧 世帯員 ({householdPersons.length}名)
              </h2>
              <button
                onClick={() => setShowAddPerson(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50"
              >
                + 世帯員を追加
              </button>
            </div>

            {householdPersons.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                世帯員が登録されていません
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {householdPersons.map((person) => (
                  <div
                    key={person.id}
                    className="border border-gray-200 rounded-lg p-3 hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 text-sm">
                            {person.name}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                            {RELATION_LABELS[person.relation]}
                          </span>
                          {person.relation === "head" && (
                            <span className="text-xs text-yellow-600">👑</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 space-y-0.5">
                          {person.kana && <p>{person.kana}</p>}
                          <div className="flex gap-3 flex-wrap">
                            {person.gender && (
                              <span>{GENDER_LABELS[person.gender]}</span>
                            )}
                            {person.birthDate && (
                              <span>
                                {person.birthDate} ({calcAge(person.birthDate)})
                              </span>
                            )}
                            {person.occupation && (
                              <span>職業: {person.occupation}</span>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap mt-1">
                            {person.smoker && (
                              <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded text-[10px]">
                                🚬 喫煙
                              </span>
                            )}
                            {person.healthNotes && (
                              <span
                                className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-[10px]"
                                title={person.healthNotes}
                              >
                                🏥{" "}
                                {person.healthNotes.length > 12
                                  ? person.healthNotes.slice(0, 12) + "…"
                                  : person.healthNotes}
                              </span>
                            )}
                          </div>
                          {person.memo && (
                            <p className="text-gray-600 mt-1">{person.memo}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 ml-2">
                        <button
                          onClick={() => setEditPersonId(person.id)}
                          className="px-2 py-1 text-[10px] text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
                        >
                          ✎ 編集
                        </button>
                        <button
                          onClick={() => setDeletePersonId(person.id)}
                          className="px-2 py-1 text-[10px] text-red-600 border border-red-200 rounded hover:bg-red-50"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 商談案件 — Phase 2 */}
          <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">
                💼 商談 ({householdOpportunities.length}件)
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/households/${customerId}/batch-entry`)
                  }
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Layers className="w-3 h-3" />
                  まとめて入力/更新
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickAddOpp(true)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新規案件
                </button>
              </div>
            </div>

            {/* open / closed tab */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setOppTab("open")}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  oppTab === "open"
                    ? "bg-blue-100 border-blue-300 text-blue-700"
                    : "border-gray-200 text-gray-500"
                }`}
              >
                進行中 ({openOpportunities.length})
              </button>
              <button
                onClick={() => setOppTab("closed")}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  oppTab === "closed"
                    ? "bg-gray-100 border-gray-300 text-gray-700"
                    : "border-gray-200 text-gray-500"
                }`}
              >
                完了 ({closedOpportunities.length})
              </button>
            </div>

            {(oppTab === "open" ? openOpportunities : closedOpportunities)
              .length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                {oppTab === "open"
                  ? "進行中の案件はありません"
                  : "完了した案件はありません"}
              </p>
            ) : (
              <div className="space-y-2">
                {(oppTab === "open"
                  ? openOpportunities
                  : closedOpportunities
                ).map((opp) => (
                  <Link
                    key={opp.id}
                    to={`/opportunities/${opp.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800 truncate">
                          {opp.title}
                        </span>
                        <StageBadge stage={opp.stage} size="sm" />
                      </div>
                      {opp.nextAction && (
                        <div className="text-xs text-gray-500 mt-0.5 truncate">
                          次: {opp.nextAction}
                          {opp.nextActionDate ? ` (${opp.nextActionDate})` : ""}
                        </div>
                      )}
                    </div>
                    {opp.totalMonthlyPremium && (
                      <span className="text-xs text-gray-500 shrink-0">
                        ¥{opp.totalMonthlyPremium.toLocaleString()}/月
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Phase 3: 契約セクション */}
          <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">
                📜 契約 ({householdPolicies.length}件)
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPolicy(true)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  <span>+</span>新規契約
                </button>
              </div>
            </div>

            {/* active / closed tab */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setPolicyTab("active")}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  policyTab === "active"
                    ? "bg-blue-100 border-blue-300 text-blue-700"
                    : "border-gray-200 text-gray-500"
                }`}
              >
                強効中 ({activePolicies.length})
              </button>
              <button
                onClick={() => setPolicyTab("closed")}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  policyTab === "closed"
                    ? "bg-gray-100 border-gray-300 text-gray-700"
                    : "border-gray-200 text-gray-500"
                }`}
              >
                その他 ({closedPolicies.length})
              </button>
            </div>

            {(policyTab === "active" ? activePolicies : closedPolicies)
              .length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                {policyTab === "active"
                  ? "強効中の契約はありません"
                  : "該当する契約はありません"}
              </p>
            ) : (
              <div className="space-y-2">
                {(policyTab === "active" ? activePolicies : closedPolicies).map(
                  (policy) => (
                    <a
                      key={policy.id}
                      href={`/policies/${policy.id}`}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors block"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <PolicyStatusBadge status={policy.status} size="sm" />
                        </div>
                        <p className="text-sm font-medium text-gray-800">
                          {policy.productName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {policy.insurer}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {policy.monthlyPremium > 0
                            ? `￥${policy.monthlyPremium.toLocaleString()}/月`
                            : "払済"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {policy.startDate}
                        </p>
                      </div>
                    </a>
                  ),
                )}
              </div>
            )}
          </section>

          {/* Phase 3: 保障マトリクス */}
          <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              🛡️ 保障マトリクス
            </h2>
            <CoverageMatrix householdId={customerId!} />
          </section>

          {/* ADR-TASK-MASTER: 世帯タスク */}
          <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">
                ☑️ 世帯タスク (
                {(customer.tasks ?? []).filter((t) => t.done).length}/
                {(customer.tasks ?? []).length})
              </h2>
              <button
                onClick={() => {
                  setAddingHouseholdTask(true);
                  setEditingHouseholdTaskId(null);
                }}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-3.5 h-3.5" />
                タスク追加
              </button>
            </div>

            {addingHouseholdTask && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 space-y-2">
                <input
                  type="text"
                  placeholder="タスク名"
                  value={householdTaskDraft.title}
                  onChange={(e) =>
                    setHouseholdTaskDraft((d) => ({
                      ...d,
                      title: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={householdTaskDraft.dueDate}
                    onChange={(e) =>
                      setHouseholdTaskDraft((d) => ({
                        ...d,
                        dueDate: e.target.value,
                      }))
                    }
                    className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-sm"
                  />
                  <select
                    value={householdTaskDraft.priority}
                    onChange={(e) =>
                      setHouseholdTaskDraft((d) => ({
                        ...d,
                        priority: e.target.value as Task["priority"],
                      }))
                    }
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                  >
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setAddingHouseholdTask(false)}
                    className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => {
                      if (!householdTaskDraft.title.trim()) return;
                      addHouseholdTask(customer.id, {
                        title: householdTaskDraft.title.trim(),
                        done: false,
                        priority: householdTaskDraft.priority,
                        rolledOver: false,
                        scope: "household",
                        householdId: customer.id,
                        dueDate: householdTaskDraft.dueDate || undefined,
                        ownerId: customer.primaryUserId,
                      });
                      setHouseholdTaskDraft({
                        title: "",
                        dueDate: "",
                        priority: "medium",
                        memo: "",
                      });
                      setAddingHouseholdTask(false);
                    }}
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    追加
                  </button>
                </div>
              </div>
            )}

            {(customer.tasks ?? []).length === 0 && !addingHouseholdTask ? (
              <p className="text-sm text-gray-400 text-center py-3">
                世帯タスクはありません
              </p>
            ) : (
              <div className="space-y-1">
                {(customer.tasks ?? []).map((task) => {
                  if (editingHouseholdTaskId === task.id) {
                    return (
                      <div
                        key={task.id}
                        className="bg-gray-50 rounded-lg p-3 space-y-2"
                      >
                        <input
                          type="text"
                          value={householdTaskEditDraft.title ?? ""}
                          onChange={(e) =>
                            setHouseholdTaskEditDraft((d) => ({
                              ...d,
                              title: e.target.value,
                            }))
                          }
                          className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={householdTaskEditDraft.dueDate ?? ""}
                            onChange={(e) =>
                              setHouseholdTaskEditDraft((d) => ({
                                ...d,
                                dueDate: e.target.value || undefined,
                              }))
                            }
                            className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-sm"
                          />
                          <select
                            value={householdTaskEditDraft.priority ?? "medium"}
                            onChange={(e) =>
                              setHouseholdTaskEditDraft((d) => ({
                                ...d,
                                priority: e.target.value as Task["priority"],
                              }))
                            }
                            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                          >
                            <option value="high">高</option>
                            <option value="medium">中</option>
                            <option value="low">低</option>
                          </select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingHouseholdTaskId(null);
                              setHouseholdTaskEditDraft({});
                            }}
                            className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={() => {
                              updateHouseholdTask(
                                customer.id,
                                task.id,
                                householdTaskEditDraft,
                              );
                              setEditingHouseholdTaskId(null);
                              setHouseholdTaskEditDraft({});
                            }}
                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    );
                  }
                  const isAutoGenerated = task.sourceMasterId !== undefined;
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-gray-50 group"
                    >
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={(e) =>
                          toggleHouseholdTaskDone(
                            customer.id,
                            task.id,
                            e.target.checked,
                          )
                        }
                        className="w-4 h-4 accent-blue-500 rounded flex-shrink-0"
                      />
                      <span className="flex-1 min-w-0">
                        <span
                          className={`text-sm ${task.done ? "line-through text-gray-400" : "text-gray-800"}`}
                        >
                          {task.title}
                        </span>
                        {isAutoGenerated && (
                          <span className="ml-1.5 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            自動
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="ml-1.5 text-xs text-gray-500">
                            期限: {task.dueDate}
                          </span>
                        )}
                        {task.done && task.doneDate && (
                          <span className="ml-1.5 text-xs text-green-600">
                            完了: {task.doneDate}
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingHouseholdTaskId(task.id);
                            setHouseholdTaskEditDraft({
                              title: task.title,
                              dueDate: task.dueDate,
                              priority: task.priority,
                            });
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-500 rounded"
                          title="編集"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {!isAutoGenerated && (
                          <button
                            onClick={() =>
                              removeHouseholdTask(customer.id, task.id)
                            }
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                            title="削除"
                          >
                            <Plus className="w-3.5 h-3.5 rotate-45" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* モバイル: タイムラインをここに縦積み (lg未満) */}
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
        {/* /.max-w-4xl */}
      </div>
      {/* /.左カラム */}

      {/* ─── 右カラム: タイムライン (lg以上のみ) ─── */}
      <aside
        id="history"
        className="hidden lg:flex lg:flex-col w-80 shrink-0 border-l border-gray-200 bg-white overflow-y-auto min-h-0"
      >
        {/* sticky ヘッダ */}
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

      {/* Edit Household Modal */}
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

      {/* Add Person Modal */}
      <PersonEditModal
        open={showAddPerson}
        onClose={() => setShowAddPerson(false)}
        title="世帯員を追加"
        onSave={(data) => {
          addPerson(customerId!, data);
          addToast({ type: "success", message: "世帯員を追加しました" });
        }}
      />

      {/* Edit Person Modal */}
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

      {/* Delete Person Confirm */}
      <ConfirmDialog
        open={!!deletePersonId}
        onClose={() => setDeletePersonId(null)}
        onConfirm={() => {
          const result = deletePerson(deletePersonId!);
          if (result.ok) {
            addToast({ type: "success", message: "世帯員を削除しました" });
          } else {
            addToast({
              type: "error",
              message: result.error ?? "削除に失敗しました",
            });
          }
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

      {/* Deactivate Household Confirm */}
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

      {/* Quick Opportunity Modal */}
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

      {/* Policy Add Modal */}
      {showAddPolicy && (
        <PolicyEditModal
          householdId={customer.id}
          onClose={() => setShowAddPolicy(false)}
        />
      )}
    </div>
  );
}

// ─── HouseholdTimelineBody ─────────────────────────────────────────────────
interface TimelineEntry {
  reportId: string;
  reportDate: string;
  reportUserId: string;
  block: {
    id: string;
    type: BlockType;
    startTime?: string;
    endTime?: string;
    title?: string;
    memo?: string;
    result?: string;
    proposal?: string;
    collected?: boolean;
    nextAppointment?: string;
    isActual?: boolean;
  };
}

function HouseholdTimelineBody({
  historyEntries,
  users,
  onNavigate,
}: {
  historyEntries: TimelineEntry[];
  users: { id: string; name: string }[];
  onNavigate: (date: string) => void;
}) {
  if (historyEntries.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-6 text-center">
        対応履歴がありません
      </p>
    );
  }

  const typeAccent: Record<string, string> = {
    visit: "border-l-blue-400 bg-blue-50/30",
    office: "border-l-gray-400 bg-gray-50/30",
    phone: "border-l-amber-400 bg-amber-50/30",
    travel: "border-l-emerald-400 bg-emerald-50/30",
    break: "border-l-pink-300 bg-pink-50/30",
    meeting: "border-l-purple-400 bg-purple-50/30",
    lunch: "border-l-orange-400 bg-orange-50/30",
  };

  return (
    <div className="relative pl-6">
      <div
        className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-blue-200 via-blue-100 to-transparent"
        aria-hidden="true"
      />
      <ul className="space-y-3">
        {historyEntries.map(({ reportDate, reportUserId, block }) => {
          const handler = users.find((u) => u.id === reportUserId);
          const hasResult = !!(
            block.result ||
            block.proposal ||
            block.collected ||
            block.nextAppointment
          );
          return (
            <li key={block.id} className="relative">
              <span
                className="absolute -left-[18px] top-3 w-3 h-3 rounded-full bg-white border-2 border-blue-400 shadow-sm"
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => onNavigate(reportDate)}
                className={`block w-full text-left rounded-lg border border-gray-200 border-l-4 ${
                  typeAccent[block.type] ?? "border-l-gray-300 bg-gray-50/30"
                } p-3 hover:shadow-md hover:border-blue-300 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500`}
                aria-label={`${reportDate} ${block.startTime}〜${block.endTime} ${BLOCK_LABELS[block.type]} の日報を開く`}
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1.5">
                  <span className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                    {reportDate}
                  </span>
                  <span className="text-xs text-gray-600 tabular-nums inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {block.startTime || "--:--"} 〜 {block.endTime || "--:--"}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                    {BLOCK_EMOJIS[block.type]} {BLOCK_LABELS[block.type]}
                  </span>
                </div>
                {block.title && (
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {block.title}
                  </p>
                )}
                {block.memo && (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mb-2 leading-relaxed">
                    {block.memo}
                  </p>
                )}
                {hasResult && (
                  <div className="mt-2 space-y-1 text-xs">
                    {block.result && (
                      <div className="flex items-start gap-1.5 bg-white rounded px-2 py-1.5 border border-gray-100">
                        <FileText className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="block text-[10px] text-gray-500 uppercase tracking-wide">
                            結果
                          </span>
                          <span className="text-gray-800">{block.result}</span>
                        </div>
                      </div>
                    )}
                    {block.proposal && (
                      <div className="flex items-start gap-1.5 bg-white rounded px-2 py-1.5 border border-gray-100">
                        <span className="text-purple-600 flex-shrink-0">
                          💡
                        </span>
                        <div className="min-w-0">
                          <span className="block text-[10px] text-gray-500 uppercase tracking-wide">
                            提案
                          </span>
                          <span className="text-gray-800">
                            {block.proposal}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                  {handler && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                      <UserIcon className="w-3 h-3 text-gray-400" />
                      {handler.name}
                    </span>
                  )}
                  {!block.isActual && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px]">
                      予定
                    </span>
                  )}
                  {block.collected && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[10px]">
                      <CheckCircle2 className="w-3 h-3" /> 集金済
                    </span>
                  )}
                  {block.nextAppointment && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]">
                      📆 次回: {block.nextAppointment}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-blue-600 hover:underline">
                    日報を開く →
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
