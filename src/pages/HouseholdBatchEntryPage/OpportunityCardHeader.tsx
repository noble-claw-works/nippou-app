// 案件カードヘッダー（折りたたみ行）
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Trash2,
  AlertCircle,
} from "lucide-react";
import type { ConfidenceUnified } from "../../types";
import { CONFIDENCE_LABELS } from "../../utils/householdBatchEntry";
import { PRODUCT_CATEGORY_LABELS } from "./constants";
import type { DraftOpportunity } from "../../utils/householdBatchEntry";

interface OpportunityCardHeaderProps {
  draft: DraftOpportunity;
  index: number;
  persons: Array<{ id: string; name: string }>;
  headerContractorId?: string;
  totalPremium: number;
  hasError: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
  onDuplicate: () => void;
  onDeleteRequest: () => void;
}

export function OpportunityCardHeader({
  draft,
  index,
  persons,
  headerContractorId,
  totalPremium,
  hasError,
  isOpen,
  onToggleOpen,
  onDuplicate,
  onDeleteRequest,
}: OpportunityCardHeaderProps) {
  const firstProduct = draft.proposalProducts[0];
  const contractorName =
    persons.find(
      (p) => p.id === (draft.contractorPersonId ?? headerContractorId),
    )?.name ?? "─";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggleOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggleOpen();
        }
      }}
      aria-expanded={isOpen}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer select-none ${
        isOpen
          ? "bg-blue-50 border-b border-blue-100"
          : "bg-white hover:bg-gray-50"
      }`}
    >
      <span className="text-blue-600 shrink-0">
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </span>

      {/* 番号 */}
      <span className="text-xs font-bold text-gray-500 shrink-0 w-5">
        {index + 1}
      </span>

      {/* サマリ情報 */}
      <div className="flex-1 min-w-0 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-800 truncate">
            {draft.title}
          </span>
          {draft.confidence && (
            <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full shrink-0">
              {CONFIDENCE_LABELS[draft.confidence as ConfidenceUnified] ??
                draft.confidence}
            </span>
          )}
          {draft.proposalProducts.length > 0 && (
            <span className="text-[10px] text-gray-500 shrink-0">
              {draft.proposalProducts.length}商品
            </span>
          )}
        </div>
        {!isOpen && (
          <div className="text-xs text-gray-500 mt-0.5 flex gap-3 flex-wrap">
            <span>{contractorName}</span>
            {totalPremium > 0 && (
              <span className="font-medium text-blue-700">
                ¥{totalPremium.toLocaleString()}/月
              </span>
            )}
            {firstProduct && (
              <span>
                {PRODUCT_CATEGORY_LABELS[firstProduct.productCategory]}
              </span>
            )}
          </div>
        )}
      </div>

      {/* バリデーションエラー表示 */}
      {hasError && (
        <AlertCircle
          className="w-4 h-4 text-red-500 shrink-0"
          aria-label="入力エラーあり"
        />
      )}

      {/* 変更バッジ */}
      {draft._isDirty && (
        <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded shrink-0">
          未保存
        </span>
      )}

      {/* 操作ボタン（開いた時のみ） */}
      {isOpen && (
        <div
          className="flex gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onDuplicate}
            title="この案件を複製"
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-100 min-h-[36px]"
          >
            <Copy className="w-3.5 h-3.5" /> 複製
          </button>
          <button
            type="button"
            onClick={onDeleteRequest}
            title="この案件を削除"
            className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 min-h-[36px]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
