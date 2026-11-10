import { useState } from "react";
import { Plus, Edit2, Trash2, Shield } from "lucide-react";
import type { Policy, Person } from "../../types";
import { CoverageEditModal } from "../../components/policy/CoverageEditModal";
import { COVERAGE_TYPE_LABELS } from "./constants";

interface CoveragesTabProps {
  policy: Policy;
  persons: Person[];
  canEdit: boolean;
  onDeleteCoverage: (id: string) => void;
}

export function CoveragesTab({
  policy,
  persons,
  canEdit,
  onDeleteCoverage,
}: CoveragesTabProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const editCoverage = policy.coverages.find((c) => c.id === editId);

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            保障を追加
          </button>
        </div>
      )}
      {policy.coverages.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">保障内容が登録されていません</p>
        </div>
      ) : (
        policy.coverages.map((cov) => {
          const covPerson = persons.find((p) => p.id === cov.insuredPersonId);
          return (
            <div
              key={cov.id}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
                      {COVERAGE_TYPE_LABELS[cov.type] ?? cov.type}
                    </span>
                    {cov.isMain && (
                      <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                        主契約
                      </span>
                    )}
                    {cov.riderName && (
                      <span className="text-xs bg-green-50 text-green-700 rounded-full px-2 py-0.5">
                        {cov.riderName}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800">
                    {cov.label}
                  </p>
                  {covPerson && (
                    <p className="text-xs text-gray-500">
                      被保険者: {covPerson.name}
                    </p>
                  )}
                  {cov.faceAmount && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      保険金: ¥{(cov.faceAmount / 10000).toLocaleString()}万
                    </p>
                  )}
                  {cov.unitAmount && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      {cov.unit === "day"
                        ? "日額"
                        : cov.unit === "time"
                          ? "回額"
                          : "金額"}
                      : ¥{cov.unitAmount.toLocaleString()}
                    </p>
                  )}
                  {cov.memo && (
                    <p className="text-xs text-gray-500 mt-1">{cov.memo}</p>
                  )}
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditId(cov.id)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("この保障を削除しますか？"))
                          onDeleteCoverage(cov.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
      {showAdd && (
        <CoverageEditModal
          policyId={policy.id}
          insuredPersonIds={policy.insuredPersonIds}
          householdId={policy.householdId}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editId && editCoverage && (
        <CoverageEditModal
          policyId={policy.id}
          insuredPersonIds={policy.insuredPersonIds}
          householdId={policy.householdId}
          coverage={editCoverage}
          onClose={() => setEditId(null)}
        />
      )}
    </div>
  );
}
