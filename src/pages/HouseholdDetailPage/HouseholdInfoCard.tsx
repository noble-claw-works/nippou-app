import { MapPin, Tag, Edit } from "lucide-react";
import type { Customer, Policy } from "../../types";
import { TYPE_LABELS } from "./helpers";

interface HouseholdInfoCardProps {
  customer: Customer;
  primaryUserName?: string;
  activePolicies: Policy[];
  householdPolicies: Policy[];
  totalMonthlyPremium: number;
  canEdit: boolean;
  canDeactivate: boolean;
  onEdit: () => void;
  onDeactivate: () => void;
}

export function HouseholdInfoCard({
  customer,
  primaryUserName,
  activePolicies,
  householdPolicies,
  totalMonthlyPremium,
  canEdit,
  canDeactivate,
  onEdit,
  onDeactivate,
}: HouseholdInfoCardProps) {
  return (
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
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Edit className="w-4 h-4" /> 編集
            </button>
          )}
          {canDeactivate && customer.status === "active" && (
            <button
              onClick={onDeactivate}
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
          <p className="mt-0.5">{primaryUserName ?? "未設定"}</p>
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
              {activePolicies.filter((p) => p.status === "inforce").length}件
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
