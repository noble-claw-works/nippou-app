import { X } from "lucide-react";
import { BLOCK_COLORS, BLOCK_EMOJIS, BLOCK_LABELS } from "../../../utils";
import type { TimeBlock } from "../../../types";

interface BlockDetailModalProps {
  block: TimeBlock | null;
  customerName?: string;
  onClose: () => void;
}

export function BlockDetailModal({
  block,
  customerName,
  onClose,
}: BlockDetailModalProps) {
  if (!block) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="ブロック詳細"
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div
          className={`px-4 py-3 flex items-center justify-between border-b border-gray-100 ${BLOCK_COLORS[block.type] ?? "bg-gray-100 border-gray-200"}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">
              {BLOCK_EMOJIS[block.type]}
            </span>
            <span className="text-sm font-semibold text-gray-800">
              {block.title || BLOCK_LABELS[block.type]}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/10"
            aria-label="閉じる"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* 本文 */}
        <div className="px-4 py-3 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <span className="text-gray-400 text-xs w-16 flex-shrink-0">
              種別
            </span>
            <span>{BLOCK_LABELS[block.type]}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <span className="text-gray-400 text-xs w-16 flex-shrink-0">
              時間
            </span>
            <span className="tabular-nums">
              {block.startTime} – {block.endTime}
            </span>
          </div>
          {block.title && (
            <div className="flex items-start gap-2 text-gray-700">
              <span className="text-gray-400 text-xs w-16 flex-shrink-0 pt-0.5">
                タイトル
              </span>
              <span>{block.title}</span>
            </div>
          )}
          {customerName && (
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-gray-400 text-xs w-16 flex-shrink-0">
                顧客
              </span>
              <span>👥 {customerName}</span>
            </div>
          )}
          {block.memo && (
            <div className="flex items-start gap-2 text-gray-700">
              <span className="text-gray-400 text-xs w-16 flex-shrink-0 pt-0.5">
                メモ
              </span>
              <span className="whitespace-pre-wrap break-words">
                {block.memo}
              </span>
            </div>
          )}
          {block.opportunityId && (
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-gray-400 text-xs w-16 flex-shrink-0">
                商談
              </span>
              <a
                href={`/opportunities/${block.opportunityId}`}
                className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
                onClick={onClose}
              >
                商談詳細を確認 →
              </a>
            </div>
          )}
          {block.sourceReportId && (
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-gray-400 text-xs w-16 flex-shrink-0">
                報告
              </span>
              <a
                href={`/opportunities/${block.opportunityId}/reports/${block.sourceReportId}`}
                className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
                onClick={onClose}
              >
                商談報告を確認 →
              </a>
            </div>
          )}
          {block.result && (
            <div className="flex items-start gap-2 text-gray-700">
              <span className="text-gray-400 text-xs w-16 flex-shrink-0 pt-0.5">
                結果
              </span>
              <span className="whitespace-pre-wrap break-words">
                {block.result}
              </span>
            </div>
          )}
          {block.proposal && (
            <div className="flex items-start gap-2 text-gray-700">
              <span className="text-gray-400 text-xs w-16 flex-shrink-0 pt-0.5">
                提案
              </span>
              <span className="whitespace-pre-wrap break-words">
                {block.proposal}
              </span>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
