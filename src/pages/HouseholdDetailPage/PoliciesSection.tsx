import { useState } from "react";
import type { Policy } from "../../types";
import { PolicyStatusBadge } from "../../components/policy/PolicyStatusBadge";
import { CoverageMatrix } from "../../components/policy/CoverageMatrix";
import { ReflectionSourceBadge } from "../../components/policy/ReflectionSourceBadge";

interface PoliciesSectionProps {
  householdId: string;
  activePolicies: Policy[];
  closedPolicies: Policy[];
  onAddPolicy: () => void;
  onEditPolicy: (policy: Policy) => void;
  onDeletePolicy: (policyId: string) => void;
}

export function PoliciesSection({
  householdId,
  activePolicies,
  closedPolicies,
  onAddPolicy,
  onEditPolicy,
  onDeletePolicy,
}: PoliciesSectionProps) {
  const [tab, setTab] = useState<"active" | "closed">("active");
  const visible = tab === "active" ? activePolicies : closedPolicies;
  // §T4-09 件数定義の是正: 確定集計と整合する「有効中(inforce)」と
  // 確定非算入の「申込中(pending)」を分離して件数表示する。
  const inforceCount = activePolicies.filter(
    (p) => p.status === "inforce",
  ).length;
  const pendingCount = activePolicies.filter(
    (p) => p.status === "pending",
  ).length;

  return (
    <>
      <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">
            📜 保険商品 有効{inforceCount}件
            {pendingCount > 0 && (
              <span className="text-amber-600">（＋申込中{pendingCount}件）</span>
            )}
          </h2>
          <button
            type="button"
            onClick={onAddPolicy}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <span>+</span>新規契約
          </button>
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTab("active")}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${tab === "active" ? "bg-blue-100 border-blue-300 text-blue-700" : "border-gray-200 text-gray-500"}`}
          >
            有効・申込中 ({activePolicies.length})
          </button>
          <button
            onClick={() => setTab("closed")}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${tab === "closed" ? "bg-gray-100 border-gray-300 text-gray-700" : "border-gray-200 text-gray-500"}`}
          >
            その他 ({closedPolicies.length})
          </button>
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            {tab === "active"
              ? "強効中の契約はありません"
              : "該当する契約はありません"}
          </p>
        ) : (
          <div className="space-y-2">
            {visible.map((policy) => (
              <div
                key={policy.id}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <a href={`/policies/${policy.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <PolicyStatusBadge status={policy.status} size="sm" />
                  </div>
                  <p className="text-sm font-medium text-gray-800">
                    {policy.productName}
                  </p>
                  <p className="text-xs text-gray-500">{policy.insurer}</p>
                  {/* §T4-07: 商談由来の追加/変更バッジ・元商談リンク・旧値打消線 */}
                  <ReflectionSourceBadge policy={policy} />
                </a>
                <div className="text-right mx-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {policy.monthlyPremium > 0
                      ? `￥${policy.monthlyPremium.toLocaleString()}/月`
                      : "払済"}
                  </p>
                  <p className="text-xs text-gray-500">{policy.startDate}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => onEditPolicy(policy)}
                    className="px-2 py-1 text-[10px] text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
                  >
                    ✎ 編集
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePolicy(policy.id)}
                    className="px-2 py-1 text-[10px] text-red-600 border border-red-200 rounded hover:bg-red-50"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          🛡️ 保障マトリクス
        </h2>
        <CoverageMatrix householdId={householdId} />
      </section>
    </>
  );
}
