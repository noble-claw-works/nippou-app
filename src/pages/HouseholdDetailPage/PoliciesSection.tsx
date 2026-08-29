import { useState } from "react";
import type { Policy } from "../../types";
import { PolicyStatusBadge } from "../../components/policy/PolicyStatusBadge";
import { CoverageMatrix } from "../../components/policy/CoverageMatrix";

interface PoliciesSectionProps {
  householdId: string;
  activePolicies: Policy[];
  closedPolicies: Policy[];
  onAddPolicy: () => void;
}

export function PoliciesSection({
  householdId,
  activePolicies,
  closedPolicies,
  onAddPolicy,
}: PoliciesSectionProps) {
  const [tab, setTab] = useState<"active" | "closed">("active");
  const visible = tab === "active" ? activePolicies : closedPolicies;

  return (
    <>
      <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">
            📜 契約 ({activePolicies.length + closedPolicies.length}件)
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
            強効中 ({activePolicies.length})
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
                  <p className="text-xs text-gray-500">{policy.insurer}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {policy.monthlyPremium > 0
                      ? `￥${policy.monthlyPremium.toLocaleString()}/月`
                      : "払済"}
                  </p>
                  <p className="text-xs text-gray-500">{policy.startDate}</p>
                </div>
              </a>
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
