// =====================================================
// ReadOnlyTimeline.tsx - RPT-2 日報確認画面の縦軸ピクセルタイムライン
// TodayPage の TimelinePanel と同じビジュアル原則だが、ドラッグ・編集不可
// variant='all': 予定/実績の 2 カラム並列（Today と同じレイアウト）
// variant='planned'|'actual': 後方互換として単一カラム
// D1: 過去ブロックもクリックで詳細確認できるようモーダル追加
// =====================================================
import { useState } from "react";
import { BLOCK_COLORS, BLOCK_EMOJIS, BLOCK_LABELS } from "../../utils";
import { DAY_START, DAY_END, minuteToY } from "../timeline/DragAndChip";
import type { Customer, TimeBlock } from "../../types";
import { BlockDetailModal } from "./ReadOnlyTimeline/BlockDetailModal";
import { ReadOnlyTimelineColumn } from "./ReadOnlyTimeline/ReadOnlyTimelineColumn";
import { SingleColumnTimeline } from "./ReadOnlyTimeline/SingleColumnTimeline";

interface Props {
  blocks: TimeBlock[];
  customers: Customer[];
  /** 表示するブロックのフィルタ条件: 全 / 予定のみ / 実績のみ */
  variant?: "all" | "planned" | "actual";
}

// ─── ReadOnlyTimeline (公開コンポーネント) ────────────────────────────────────
export function ReadOnlyTimeline({
  blocks,
  customers,
  variant = "all",
}: Props) {
  const [showLegend, setShowLegend] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);

  const selectedCustomerName = selectedBlock?.customerId
    ? (customers.find((c) => c.id === selectedBlock.customerId)?.name ?? "不明")
    : undefined;

  // 後方互換: variant='planned'|'actual' は単一カラム
  if (variant !== "all") {
    return (
      <>
        <SingleColumnTimeline
          blocks={blocks}
          customers={customers}
          variant={variant}
          onSelectBlock={setSelectedBlock}
        />
        <BlockDetailModal
          block={selectedBlock}
          customerName={selectedCustomerName}
          onClose={() => setSelectedBlock(null)}
        />
      </>
    );
  }

  // variant='all': Today と同じ 2 カラム並列
  const totalHeight = minuteToY(DAY_END) + 16;

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* パネルヘッダー */}
        <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-gray-700">
              📅 タイムライン
            </span>
            <span className="text-xs text-gray-400">
              （ブロックをクリックで詳細）
            </span>
          </div>
          <button
            onClick={() => setShowLegend((v) => !v)}
            className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            🎨 凡例
          </button>
        </div>

        {/* 凡例パネル */}
        {showLegend && (
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-x-3 gap-y-1">
            {(
              Object.keys(BLOCK_LABELS) as import("../../types").BlockType[]
            ).map((type) => (
              <span
                key={type}
                className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${BLOCK_COLORS[type]}`}
              >
                {BLOCK_EMOJIS[type]} {BLOCK_LABELS[type]}
              </span>
            ))}
          </div>
        )}

        {/* 予定/実績 説明バー (Today P0-2 と同じ) */}
        <div
          className="hidden sm:grid border-b border-gray-100 text-center"
          style={{ gridTemplateColumns: "40px 1fr 1px 1fr" }}
        >
          <div />
          <div className="py-1 bg-indigo-100/60 text-xs font-bold text-indigo-700">
            ◀ 予定（計画したこと）
          </div>
          <div className="bg-gray-200" />
          <div className="py-1 bg-emerald-100/60 text-xs font-bold text-emerald-700">
            実績（実際にやったこと）▶
          </div>
        </div>

        {/* モバイル: 予定を上、実績を下 (縦積み) */}
        <div className="sm:hidden">
          {/* 予定 */}
          <div className="border-b border-gray-100">
            <div className="px-2 py-1 bg-indigo-50 text-xs font-bold text-indigo-700">
              📋 予定
            </div>
            <div className="flex">
              <div
                className="relative flex-shrink-0 bg-gray-50"
                style={{ width: "36px" }}
              >
                {Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }).map(
                  (_, i) => {
                    const min = DAY_START + i * 60;
                    const h = Math.floor(min / 60);
                    return (
                      <div
                        key={i}
                        style={{ top: `${minuteToY(min) + 8}px` }}
                        className="absolute right-1 text-[9px] text-gray-400 leading-none pointer-events-none"
                      >
                        {h}:00
                      </div>
                    );
                  },
                )}
                <div style={{ height: `${totalHeight}px` }} />
              </div>
              <div className="flex-1 min-w-0">
                <ReadOnlyTimelineColumn
                  blocks={blocks}
                  customers={customers}
                  kind="planned"
                  onSelectBlock={setSelectedBlock}
                />
              </div>
            </div>
          </div>
          {/* 実績 */}
          <div>
            <div className="px-2 py-1 bg-emerald-50 text-xs font-bold text-emerald-700">
              ✅ 実績
            </div>
            <div className="flex">
              <div
                className="relative flex-shrink-0 bg-gray-50"
                style={{ width: "36px" }}
              >
                {Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }).map(
                  (_, i) => {
                    const min = DAY_START + i * 60;
                    const h = Math.floor(min / 60);
                    return (
                      <div
                        key={i}
                        style={{ top: `${minuteToY(min) + 8}px` }}
                        className="absolute right-1 text-[9px] text-gray-400 leading-none pointer-events-none"
                      >
                        {h}:00
                      </div>
                    );
                  },
                )}
                <div style={{ height: `${totalHeight}px` }} />
              </div>
              <div className="flex-1 min-w-0">
                <ReadOnlyTimelineColumn
                  blocks={blocks}
                  customers={customers}
                  kind="actual"
                  onSelectBlock={setSelectedBlock}
                />
              </div>
            </div>
          </div>
        </div>

        {/* デスクトップ: 時刻ラベル + 予定カラム + セパレータ + 実績カラム */}
        <div className="hidden sm:flex" style={{ height: `${totalHeight}px` }}>
          {/* 時刻ラベル列 */}
          <div
            className="relative flex-shrink-0 bg-gray-50/50"
            style={{ width: "40px" }}
          >
            {Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }).map(
              (_, i) => {
                const min = DAY_START + i * 60;
                const h = Math.floor(min / 60);
                const m = min % 60;
                return (
                  <div
                    key={i}
                    style={{ top: `${minuteToY(min) + 8}px` }}
                    className="absolute right-1 text-[10px] text-gray-400 leading-none pointer-events-none"
                  >
                    {h}:{String(m).padStart(2, "0")}
                  </div>
                );
              },
            )}
          </div>
          {/* 予定カラム */}
          <div className="flex-1 min-w-0" data-testid="timeline-planned-col">
            <ReadOnlyTimelineColumn
              blocks={blocks}
              customers={customers}
              kind="planned"
              onSelectBlock={setSelectedBlock}
            />
          </div>
          {/* セパレータ */}
          <div className="w-px bg-gray-200 flex-shrink-0" />
          {/* 実績カラム */}
          <div className="flex-1 min-w-0" data-testid="timeline-actual-col">
            <ReadOnlyTimelineColumn
              blocks={blocks}
              customers={customers}
              kind="actual"
              onSelectBlock={setSelectedBlock}
            />
          </div>
        </div>
      </div>

      {/* D1: ブロック詳細モーダル */}
      <BlockDetailModal
        block={selectedBlock}
        customerName={selectedCustomerName}
        onClose={() => setSelectedBlock(null)}
      />
    </>
  );
}
