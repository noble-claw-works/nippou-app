// =====================================================
// ReadOnlyTimeline.tsx - RPT-2 日報確認画面の縦軸ピクセルタイムライン
// TodayPage の TimelinePanel と同じビジュアル原則だが、ドラッグ・編集不可
// 予定/実績の 2 カラムを並べ、スキマ時間を amber 帯で可視化
// =====================================================
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

function BlockBar({ block, customer }: { block: TimeBlock; customer?: Customer }) {
  const startMin = timeToMin(block.startTime);
  const endMin = timeToMin(block.endTime);
  const top = minuteToY(startMin) + 8;
  const height = Math.max(((endMin - startMin) / 60) * HOUR_PX - 4, 24);
  const color = BLOCK_COLORS[block.type] ?? 'bg-gray-100 border-gray-200';

  return (
    <div
      role="article"
      aria-label={`${block.startTime}から${block.endTime} ${BLOCK_LABELS[block.type]} ${block.title || ''}`}
      style={{ top: `${top}px`, height: `${height}px`, left: '52px', right: '4px' }}
      className={`absolute rounded-lg border ${color} px-2 py-1 overflow-hidden shadow-sm`}
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
      {customer && (
        <p className="text-[10px] text-gray-600 truncate">👥 {customer.name}</p>
      )}
      {block.memo && height > 50 && (
        <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5 whitespace-pre-wrap">{block.memo}</p>
      )}
    </div>
  );
}

function GapBar({ startTime, endTime, durationMin }: { startTime: string; endTime: string; durationMin: number }) {
  const top = minuteToY(timeToMin(startTime)) + 8;
  const height = Math.max(((timeToMin(endTime) - timeToMin(startTime)) / 60) * HOUR_PX - 4, 16);
  return (
    <div
      role="note"
      aria-label={`スキマ時間 ${startTime}から${endTime} ${formatGapDuration(durationMin)}`}
      style={{ top: `${top}px`, height: `${height}px`, left: '52px', right: '4px' }}
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

export function ReadOnlyTimeline({ blocks, customers, variant = 'all' }: Props) {
  const filtered = blocks.filter(b => {
    if (variant === 'planned') return b.isPlanned;
    if (variant === 'actual') return b.isActual;
    return true;
  });
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
              customer={item.block.customerId ? customers.find(c => c.id === item.block.customerId) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
