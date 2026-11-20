import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Edit2, Trash2 } from "lucide-react";
import { useAppStore } from "../store";
import type { PolicyStatus } from "../types";
import { PolicyStatusBadge } from "../components/policy/PolicyStatusBadge";
import { PolicyEditModal } from "../components/policy/PolicyEditModal";
import { PRODUCT_CATEGORY_LABELS, type Tab } from "./policyDetail/constants";
import { InfoTab } from "./policyDetail/InfoTab";
import { CoveragesTab } from "./policyDetail/CoveragesTab";
import { HistoryTab } from "./policyDetail/HistoryTab";
import { ActivitiesTab } from "./policyDetail/ActivitiesTab";
import { ActivateModal } from "./policyDetail/ActivateModal";

export function PolicyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    policies,
    policyStatusHistory,
    customers,
    persons,
    users,
    reports,
    opportunities,
    deletePolicy,
    deleteCoverage,
    changePolicyStatus,
    activatePolicy,
    addToast,
    currentRole,
    currentUserId,
  } = useAppStore();

  const policy = policies.find((p) => p.id === id);
  const [tab, setTab] = useState<Tab>("info");
  const [showEdit, setShowEdit] = useState(false);
  const [showActivate, setShowActivate] = useState(false);
  const [activatePolicyNumber, setActivatePolicyNumber] = useState("");
  const [activateStartDate, setActivateStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  if (!policy) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>契約が見つかりません</p>
        <button
          onClick={() => navigate("/policies")}
          className="mt-2 text-blue-500 hover:underline text-sm"
        >
          一覧に戻る
        </button>
      </div>
    );
  }

  const household = customers.find((c) => c.id === policy.householdId);
  const owner = users.find((u) => u.id === policy.ownerId);
  const contractor = persons.find((p) => p.id === policy.contractorPersonId);
  const historyEntries = policyStatusHistory
    .filter((h) => h.policyId === policy.id)
    .sort((a, b) => b.changedAt.localeCompare(a.changedAt));
  const relatedBlocks = reports
    .flatMap((r) => r.blocks.map((b) => ({ ...b, reportDate: r.date })))
    .filter((b) => b.customerId === policy.householdId);
  const sourceOpp = policy.sourceOpportunityId
    ? opportunities.find((o) => o.id === policy.sourceOpportunityId)
    : null;
  const canEdit = currentRole === "admin" || policy.ownerId === currentUserId;

  const handleDelete = () => {
    if (!confirm("この契約を削除しますか？")) return;
    deletePolicy(policy.id);
    navigate("/policies");
    addToast({ type: "success", message: "契約を削除しました" });
  };

  const handleStatusChange = (newStatus: PolicyStatus) => {
    const note =
      prompt(
        `ステータスを「${newStatus}」に変更します。メモを入力してください（省略可）`,
      ) ?? "";
    changePolicyStatus(policy.id, newStatus, note || undefined, currentUserId);
    addToast({
      type: "success",
      message: `ステータスを「${newStatus}」に変更しました`,
    });
  };

  const handleActivate = () => {
    if (!activatePolicyNumber.trim()) {
      addToast({ type: "error", message: "証券番号を入力してください" });
      return;
    }
    activatePolicy(
      policy.id,
      activatePolicyNumber.trim(),
      activateStartDate,
      currentUserId,
    );
    addToast({ type: "success", message: "契約を有効化しました" });
    setShowActivate(false);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "info", label: "📊 基本情報" },
    { key: "coverages", label: `🛡️ 保障内容 (${policy.coverages.length})` },
    { key: "history", label: `🔁 ステータス履歴 (${historyEntries.length})` },
    { key: "activities", label: `📅 関連活動 (${relatedBlocks.length})` },
  ];

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <button
        onClick={() => navigate("/policies")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        契約一覧
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <PolicyStatusBadge status={policy.status} size="md" />
              <span className="text-xs text-gray-500">
                {PRODUCT_CATEGORY_LABELS[policy.productCategory]}
              </span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">
              {policy.productName}
            </h1>
            <p className="text-sm text-gray-600 mt-0.5">{policy.insurer}</p>
            {policy.policyNumber && (
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                No. {policy.policyNumber}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <button
                  onClick={() => setShowEdit(true)}
                  className="p-2 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs text-gray-500">月払</p>
            <p className="text-base font-bold text-gray-900">
              {policy.monthlyPremium > 0
                ? `¥${policy.monthlyPremium.toLocaleString()}`
                : "払済"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">契約者</p>
            <p className="text-sm font-semibold text-gray-800">
              {contractor?.name ?? "—"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">担当</p>
            <p className="text-sm font-semibold text-gray-800">
              {owner?.name ?? "—"}
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="mt-4 flex flex-wrap gap-2">
            {policy.status === "pending" && (
              <button
                onClick={() => setShowActivate(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                ✅ 有効化 (証券番号設定)
              </button>
            )}
            {policy.status === "inforce" && (
              <>
                <button
                  onClick={() => handleStatusChange("paid_up")}
                  className="px-3 py-1.5 text-xs bg-purple-100 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-200"
                >
                  💰 払済に変更
                </button>
                <button
                  onClick={() => handleStatusChange("surrendered")}
                  className="px-3 py-1.5 text-xs bg-red-100 text-red-700 border border-red-200 rounded-lg hover:bg-red-200"
                >
                  ❌ 解約処理
                </button>
                <button
                  onClick={() => handleStatusChange("matured")}
                  className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-200"
                >
                  🎉 満期処理
                </button>
              </>
            )}
          </div>
        )}

        {sourceOpp && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              元案件:{" "}
              <Link
                to={`/opportunities/${sourceOpp.id}`}
                className="text-blue-600 hover:underline"
              >
                {sourceOpp.title}
              </Link>
            </p>
          </div>
        )}

        {household && (
          <div className="mt-2">
            <p className="text-xs text-gray-500">
              世帯:{" "}
              <Link
                to={`/households/${household.id}`}
                className="text-blue-600 hover:underline"
              >
                {household.name}
              </Link>
            </p>
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
                tab === t.key
                  ? "border-blue-500 text-blue-600 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "info" && <InfoTab policy={policy} />}
      {tab === "coverages" && (
        <CoveragesTab
          policy={policy}
          persons={persons}
          canEdit={canEdit}
          onDeleteCoverage={deleteCoverage}
        />
      )}
      {tab === "history" && (
        <HistoryTab entries={historyEntries} users={users} />
      )}
      {tab === "activities" && <ActivitiesTab blocks={relatedBlocks} />}

      {showActivate && (
        <ActivateModal
          policyNumber={activatePolicyNumber}
          startDate={activateStartDate}
          onChangePolicyNumber={setActivatePolicyNumber}
          onChangeStartDate={setActivateStartDate}
          onConfirm={handleActivate}
          onCancel={() => setShowActivate(false)}
        />
      )}

      {showEdit && (
        <PolicyEditModal
          householdId={policy.householdId}
          policy={policy}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
