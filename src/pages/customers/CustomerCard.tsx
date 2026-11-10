import { useNavigate } from "react-router-dom";
import { MapPin, Tag } from "lucide-react";
import {
  canDeleteCustomer,
  hasCustomerAttachment,
} from "../../utils/customerAttachment";
import type { Customer, Role } from "../../types";
import type { User } from "../../types";
import type { AttachmentCheckState } from "../../utils/customerAttachment";
import { TYPE_LABELS } from "./constants";

interface CustomerCardProps {
  customer: Customer;
  primaryUser: User | undefined;
  historyCount: number;
  attachmentState: AttachmentCheckState;
  currentRole: Role | undefined;
  onEdit: (id: string) => void;
  onDeactivate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CustomerCard({
  customer,
  primaryUser,
  historyCount,
  attachmentState,
  currentRole,
  onEdit,
  onDeactivate,
  onDelete,
}: CustomerCardProps) {
  const navigate = useNavigate();
  const customerHasAttach = hasCustomerAttachment(attachmentState, customer.id);
  const canDeleteThis = canDeleteCustomer(
    attachmentState,
    customer.id,
    currentRole,
  );

  return (
    <div
      className={`bg-white rounded-xl border p-4 transition-all ${customer.status === "inactive" ? "opacity-50 border-gray-100" : "border-gray-200 hover:shadow-sm cursor-pointer hover:border-blue-200"}`}
      onClick={() => navigate(`/customers/${customer.id}`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-gray-900">{customer.name}</span>
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {TYPE_LABELS[customer.type]}
            </span>
            {customer.status === "inactive" && (
              <span className="text-xs text-red-500">無効</span>
            )}
            {customer.isFavorite && <span>⭐</span>}
            {customerHasAttach && (
              <span
                className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded"
                title="日報ブロックまたは TODO に結びつきあり"
              >
                🔗 付帯情報あり
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {customer.area && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {customer.area}
              </span>
            )}
            {primaryUser && <span>担当: {primaryUser.name}</span>}
            {customer.lastContactDate && (
              <span>最終接触: {customer.lastContactDate}</span>
            )}
            {customer.nextAppointment && (
              <span className="text-blue-600">
                次回AP: {customer.nextAppointment}
              </span>
            )}
            {historyCount > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                📅 履歴{historyCount}件
              </span>
            )}
          </div>
          {customer.tags.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
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
          )}
        </div>
        <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
          {historyCount > 0 && (
            <button
              onClick={() => navigate(`/customers/${customer.id}#history`)}
              className="px-2.5 py-1 text-xs text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
              aria-label={`${customer.name} の対応履歴を見る`}
            >
              📅 履歴
            </button>
          )}
          {currentRole !== undefined && customer.status === "active" && (
            <button
              onClick={() => onEdit(customer.id)}
              className="px-2.5 py-1 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              ✎ 編集
            </button>
          )}
          {currentRole !== undefined && customer.status === "active" && (
            <button
              onClick={() => onDeactivate(customer.id)}
              className="px-2.5 py-1 text-xs text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50"
              aria-label={`${customer.name} を無効化`}
            >
              🚫 無効化
            </button>
          )}
          {currentRole !== undefined && (
            <button
              disabled={!canDeleteThis}
              title={
                customerHasAttach
                  ? canDeleteThis
                    ? "付帯情報あり顧客 (admin/executive 削除可)"
                    : "付帯情報あり: admin/executive のみ削除可"
                  : ""
              }
              onClick={() => canDeleteThis && onDelete(customer.id)}
              className={`px-2.5 py-1 text-xs border rounded-lg ${
                canDeleteThis
                  ? "text-red-700 border-red-300 hover:bg-red-50"
                  : "text-red-300 border-red-200 opacity-50 cursor-not-allowed pointer-events-none"
              }`}
              aria-label={`${customer.name} を削除`}
              aria-disabled={!canDeleteThis}
            >
              🗑 削除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
