// =====================================================
// ReadOnlyTimeline.tsx - RPT-2 日報確認画面の縦軸ピクセルタイムライン
// TodayPage の TimelinePanel と同じビジュアル原則だが、ドラッグ・編集不可
// variant='all': 予定/実績の 2 カラム並列（Today と同じレイアウト）
// variant='planned'|'actual': 後方互換として単一カラム
// D1: 過去ブロックもクリックで詳細確認できるようモーダル追加
// =====================================================
import { useState } from 'react';
import { X } from 'lucide-react';
import {
  BLOCK_COLORS, BLOCK_EMOJIS, BLOCK_LABELS,
  buildTimelineWithGaps, formatGapDuration,
} from '../../utils';
import { DAY_START, DAY_END, HOUR_PX, minuteToY } from '../timeline/DragAndChip';
import type { Customer, TimeBlock } from '../../types';

interface Props {
  blocks: TimeBlock[];
  customers: Customer[];
  /** 表示するブロックのフィルタ条件: 全 / 予定のみ / 実績のみ */
  variant?: 'all' | 'planned' | 'actual';
}

// ─── ブロック詳細モーダル ─────────────────────────────────────────────────────
interface BlockDetailModalProps {
  block: TimeBlock | null;
  customerName?: string;
  onClose: () => void;
}

function BlockDetailModal({ block, customerName, onClose }: BlockDetailModalProps) {
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
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className={`px-4 py-3 flex items-center justify-between border-b border-gray-100 ${BLOCK_COLORS[block.type] ?? 'bg-gray-100 border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">{BLOCK_EMOJIS[block.type]}</span>
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
            <span className="text-gray-400 text-xs w-16 flex-shrink-0">種別</span>
            <span>{BLOCK_LABELS[block.type]}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <span className="text-gray-400 text-xs w-16 flex-shrink-0">時間</span>
            <span className="tabular-nums">{block.startTime} – {block.endTime}</span>
          </div>
          {block.title && (
            <div className="flex items-start gap-2 text-gray-700">
              <span className="text-gray-400 text-xs w-16 flex-shrink-0 pt-0.5">タイトル</span>
              <span>{block.title}</span>
            </div>
          )}
          {customerName && (
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-gray-400 text-xs w-16 flex-shrink-0">顧客</span>
              <span>👥 {customerName}</span>
            </div>
          )}
          {block.memo && (
            <div className="flex items-start gap-2 text-gray-700">
              <span className="text-gray-400 text-xs w-16 flex-shrink-0 pt-0.5">メモ</span>
              <span className="whitespace-pre-wrap break-words">{block.memo}</span>
            </div>
          )}
          {block.opportunityId && (
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-gray-400 text-xs w-16 flex-shrink-0">商談</span>
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
              <span className="text-gray-400 text-xs w-16 flex-shrink-0">報告</span>
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
              <span className="text-gray-400 text-xs w-16 flex-shrink-0 pt-0.5">結果</span>
              <span className="whitespace-pre-wrap break-words">{block.result}</span>
            </div>
          )}
          {block.proposal && (
            <div className="flex items-start gap-2 text-gray-700">
              <span className="text-gray-400 text-xs w-16 flex-shrink-0 pt-0.5">提案</span>
              <span className="whitespace-pre-wrap break-words">{block.proposal}</span>
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

// ─── TimeGrid ────────────────────────────────────────────────────────────────
function TimeGrid() {
  const hours = Math.floor((DAY_END - DAY_START) / 60);
  return (
    <>
      {Array.from({ length: hours + 1 }).map((_, i) => {
        const y = minuteToY(DAY_START + i * 60) + 8;
        const hour = Math.floor((DAY_START + i * 60) / 60);
        return (
          <div key={i}>
            <div
              style={{ top: `${y}px` }}
              className="absolute left-0 right-0 border-t border-gray-100 pointer-events-none"
              aria-hidden="true"
            />
            <span
              style={{ top: `${y - 8}px` }}
              className="absolute left-1 text-[10px] text-gray-400 tabular-nums pointer-events-none select-none"
              aria-hidden="true"
            >
              {String(hour).padStart(2, '0')}:00
            </span>
          </div>
        );
      })}
    </>
  );
}

// ─── BlockBar (D1: クリックで詳細モーダルを開く) ────────────────────────────
interface BlockBarProps {
  block: TimeBlock;
  customerName?: string;
  onSelect: (block: TimeBlock) => void;
}

function BlockBar({ block, customerName, onSelect }: BlockBarProps) {
  const startMin = timeToMin(block.startTime);
  const endMin = timeToMin(block.endTime);
  const top = minuteToY(startMin) + 8;
  const height = Math.max(((endMin - startMin) / 60) * HOUR_PX - 4, 24);
  const color = BLOCK_COLORS[block.type] ?? 'bg-gray-100 border-gray-200';

  return (
    <button
      type="button"
      role="button"
      aria-label={`${block.startTime}から${block.endTime} ${BLOCK_LABELS[block.type]} ${block.title || ''} — クリックで詳細`}
      style={{ top: `${top}px`, height: `${height}px`, left: '4px', right: '4px' }}
      className={`absolute rounded-lg border ${color} px-2 py-1 overflow-hidden shadow-sm text-left cursor-pointer hover:ring-2 hover:ring-blue-400 hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500`}
      onClick={() => onSelect(block)}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-sm flex-shrink-0" aria-hidden="true">{BLOCK_EMOJIS[block.type]}</span>
        <span className="text-xs font-medium text-gray-800 truncate">
          {block.title || BLOCK_LABELS[block.type]}
        </span>
        <span className="ml-auto text-[10px] text-gray-500 tabular-nums flex-shrink-0">
          {block.startTime}–{block.endTime}
        </span>
      </div>
      {customerName && (
        <p className="text-[10px] text-gray-600 truncate">👥 {customerName}</p>
      )}
      {block.memo && height > 50 && (
        <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5 whitespace-pre-wrap">{block.memo}</p>
      )}
    </button>
  );
}

// ─── GapBar ───────────────────────────────────────────────────────────────────
function GapBar({ startTime, endTime, durationMin }: { startTime: string; endTime: string; durationMin: number }) {
  const top = minuteToY(timeToMin(startTime)) + 8;
  const height = Math.max(((timeToMin(endTime) - timeToMin(startTime)) / 60) * HOUR_PX - 4, 16);
  return (
    <div
      role="note"
      aria-label={`スキマ時間 ${startTime}から${endTime} ${formatGapDuration(durationMin)}`}
      style={{ top: `${top}px`, height: `${height}px`, left: '4px', right: '4px' }}
      className="absolute rounded-lg border border-dashed border-amber-300 bg-amber-50/40 flex items-center justify-center text-[10px] text-amber-700"
    >
      <span className="px-2 truncate">
        ⏳ スキマ {startTime}–{endTime} ({formatGapDuration(durationMin)})
      </span>
    </div>
  );
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// ─── ReadOnlyTimelineColumn (2カラム用) ───────────────────────────────────────
interface ColumnProps {
  blocks: TimeBlock[];
  customers: Customer[];
  kind: 'planned' | 'actual';
  onSelectBlock: (block: TimeBlock) => void;
}

function ReadOnlyTimelineColumn({ blocks, customers, kind, onSelectBlock }: ColumnProps) {
  const filtered = blocks.filter(b => kind === 'planned' ? b.isPlanned : b.isActual);
  const items = buildTimelineWithGaps(filtered);
  const totalHeight = minuteToY(DAY_END) + 16;

  const bgClass = kind === 'planned' ? 'bg-indigo-50/20' : 'bg-emerald-50/20';

  if (filtered.length === 0) {
    return (
      <div
        className={`relative ${bgClass} overflow-hidden`}
        style={{ height: `${totalHeight}px` }}
      >
        <TimeGrid />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-xs text-gray-400">記録なし</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative ${bgClass} overflow-hidden`}
      style={{ height: `${totalHeight}px` }}
    >
      <TimeGrid />
      {items.map(item => {
        if (item.kind === 'gap') {
          return (
            <GapBar
              key={`gap-${item.startTime}-${item.endTime}`}
              startTime={item.startTime}
              endTime={item.endTime}
              durationMin={item.durationMin}
            />
          );
        }
        return (
          <BlockBar
            key={item.block.id}
            block={item.block}
            customerName={item.block.customerId
              ? (customers.find(c => c.id === item.block.customerId)?.name ?? '不明')
              : undefined}
            onSelect={onSelectBlock}
          />
        );
      })}
    </div>
  );
}

// ─── Legacy single-column (variant='planned'|'actual') ───────────────────────
function SingleColumnTimeline({ blocks, customers, variant, onSelectBlock }: { blocks: TimeBlock[]; customers: Customer[]; variant: 'planned' | 'actual'; onSelectBlock: (block: TimeBlock) => void }) {
  const filtered = blocks.filter(b => variant === 'planned' ? b.isPlanned : b.isActual);
  const items = buildTimelineWithGaps(filtered);
  const totalHeight = minuteToY(DAY_END) + 16;
  const totalGap = items.reduce((s, i) => s + (i.kind === 'gap' ? i.durationMin : 0), 0);

  if (filtered.length === 0) {
    return <p className="text-sm text-gray-400 py-6 text-center">記録がありません</p>;
  }

  return (
    <div>
      {totalGap > 0 && (
        <p className="text-xs text-gray-500 mb-2 text-right">
          スキマ計 <span className="font-medium text-amber-700">{formatGapDuration(totalGap)}</span>
        </p>
      )}
      <div
        className="relative bg-white rounded-lg border border-gray-100 overflow-hidden"
        style={{ height: `${totalHeight}px` }}
      >
        <TimeGrid />
        {items.map(item => {
          if (item.kind === 'gap') {
            return (
              <GapBar
                key={`gap-${item.startTime}-${item.endTime}`}
                startTime={item.startTime}
                endTime={item.endTime}
                durationMin={item.durationMin}
              />
            );
          }
          return (
            <BlockBar
              key={item.block.id}
              block={item.block}
              customerName={item.block.customerId
                ? (customers.find(c => c.id === item.block.customerId)?.name ?? '不明')
                : undefined}
              onSelect={onSelectBlock}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── ReadOnlyTimeline (公開コンポーネント) ────────────────────────────────────
export function ReadOnlyTimeline({ blocks, customers, variant = 'all' }: Props) {
  const [showLegend, setShowLegend] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);

  const selectedCustomerName = selectedBlock?.customerId
    ? (customers.find(c => c.id === selectedBlock.customerId)?.name ?? '不明')
    : undefined;

  // 後方互換: variant='planned'|'actual' は単一カラム
  if (variant !== 'all') {
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
            <span className="text-sm font-semibold text-gray-700">📅 タイムライン</span>
            <span className="text-xs text-gray-400">（ブロックをクリックで詳細）</span>
          </div>
          <button
            onClick={() => setShowLegend(v => !v)}
            className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            🎨 凡例
          </button>
        </div>

        {/* 凡例パネル */}
        {showLegend && (
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-x-3 gap-y-1">
            {(Object.keys(BLOCK_LABELS) as import('../../types').BlockType[]).map(type => (
              <span key={type} className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${BLOCK_COLORS[type]}`}>
                {BLOCK_EMOJIS[type]} {BLOCK_LABELS[type]}
              </span>
            ))}
          </div>
        )}

        {/* 予定/実績 説明バー (Today P0-2 と同じ) */}
        <div className="hidden sm:grid border-b border-gray-100 text-center" style={{ gridTemplateColumns: '40px 1fr 1px 1fr' }}>
          <div />
          <div className="py-1 bg-indigo-100/60 text-xs font-bold text-indigo-700">◀ 予定（計画したこと）</div>
          <div className="bg-gray-200" />
          <div className="py-1 bg-emerald-100/60 text-xs font-bold text-emerald-700">実績（実際にやったこと）▶</div>
        </div>

        {/* モバイル: 予定を上、実績を下 (縦積み) */}
        <div className="sm:hidden">
          {/* 予定 */}
          <div className="border-b border-gray-100">
            <div className="px-2 py-1 bg-indigo-50 text-xs font-bold text-indigo-700">📋 予定</div>
            <div className="flex">
              <div className="relative flex-shrink-0 bg-gray-50" style={{ width: '36px' }}>
                {Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }).map((_, i) => {
                  const min = DAY_START + i * 60;
                  const h = Math.floor(min / 60);
                  return (
                    <div key={i} style={{ top: `${minuteToY(min) + 8}px` }}
                      className="absolute right-1 text-[9px] text-gray-400 leading-none pointer-events-none">
                      {h}:00
                    </div>
                  );
                })}
                <div style={{ height: `${totalHeight}px` }} />
              </div>
              <div className="flex-1 min-w-0">
                <ReadOnlyTimelineColumn blocks={blocks} customers={customers} kind="planned" onSelectBlock={setSelectedBlock} />
              </div>
            </div>
          </div>
          {/* 実績 */}
          <div>
            <div className="px-2 py-1 bg-emerald-50 text-xs font-bold text-emerald-700">✅ 実績</div>
            <div className="flex">
              <div className="relative flex-shrink-0 bg-gray-50" style={{ width: '36px' }}>
                {Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }).map((_, i) => {
                  const min = DAY_START + i * 60;
                  const h = Math.floor(min / 60);
                  return (
                    <div key={i} style={{ top: `${minuteToY(min) + 8}px` }}
                      className="absolute right-1 text-[9px] text-gray-400 leading-none pointer-events-none">
                      {h}:00
                    </div>
                  );
                })}
                <div style={{ height: `${totalHeight}px` }} />
              </div>
              <div className="flex-1 min-w-0">
                <ReadOnlyTimelineColumn blocks={blocks} customers={customers} kind="actual" onSelectBlock={setSelectedBlock} />
              </div>
            </div>
          </div>
        </div>

        {/* デスクトップ: 時刻ラベル + 予定カラム + セパレータ + 実績カラム */}
        <div className="hidden sm:flex" style={{ height: `${totalHeight}px` }}>
          {/* 時刻ラベル列 */}
          <div className="relative flex-shrink-0 bg-gray-50/50" style={{ width: '40px' }}>
            {Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }).map((_, i) => {
              const min = DAY_START + i * 60;
              const h = Math.floor(min / 60);
              const m = min % 60;
              return (
                <div key={i} style={{ top: `${minuteToY(min) + 8}px` }}
                  className="absolute right-1 text-[10px] text-gray-400 leading-none pointer-events-none">
                  {h}:{String(m).padStart(2, '0')}
                </div>
              );
            })}
          </div>
          {/* 予定カラム */}
          <div className="flex-1 min-w-0" data-testid="timeline-planned-col">
            <ReadOnlyTimelineColumn blocks={blocks} customers={customers} kind="planned" onSelectBlock={setSelectedBlock} />
          </div>
          {/* セパレータ */}
          <div className="w-px bg-gray-200 flex-shrink-0" />
          {/* 実績カラム */}
          <div className="flex-1 min-w-0" data-testid="timeline-actual-col">
            <ReadOnlyTimelineColumn blocks={blocks} customers={customers} kind="actual" onSelectBlock={setSelectedBlock} />
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
