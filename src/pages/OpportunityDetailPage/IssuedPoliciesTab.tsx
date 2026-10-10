import type { Policy, Opportunity } from "../../types";
import { PolicyStatusBadge } from "../../components/policy/PolicyStatusBadge";
import { QuickPolicyIssueModal } from "../../components/policy/QuickPolicyIssueModal";

interface IssuedPoliciesTabProps {
  opp: Opportunity;
  issuedPolicies: Policy[];
  showQuickIssue: boolean;
  onShowQuickIssue: () => void;
  onCloseQuickIssue: () => void;
}

export function IssuedPoliciesTab({
  opp,
  issuedPolicies,
  showQuickIssue,
  onShowQuickIssue,
  onCloseQuickIssue,
}: IssuedPoliciesTabProps) {
  return (
    <>
      <div className="space-y-3">
        {issuedPolicies.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">📜</p>
            <p className="text-sm">この案件から発行された契約はありません</p>
            {opp.stage !== "issued" && opp.proposalProducts.length > 0 && (
              <button
                onClick={onShowQuickIssue}
                className="mt-3 px-4 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700"
              >
                🎉 契約を発行する
              </button>
            )}
          </div>
        ) : (
          issuedPolicies.map((policy) => (
            <div
              key={policy.id}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <PolicyStatusBadge status={policy.status} size="sm" />
                  </div>
                  <p className="text-sm font-medium text-gray-800">
                    {policy.productName}
                  </p>
                  <p className="text-xs text-gray-500">{policy.insurer}</p>
                  {policy.policyNumber && (
                    <p className="text-xs text-gray-400 font-mono">
                      {policy.policyNumber}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    ￥{policy.monthlyPremium.toLocaleString()}/月
                  </p>
                  <a
                    href={`/policies/${policy.id}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    詳細を見る →
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {showQuickIssue && (
        <QuickPolicyIssueModal opportunity={opp} onClose={onCloseQuickIssue} />
      )}
    </>
  );
}
