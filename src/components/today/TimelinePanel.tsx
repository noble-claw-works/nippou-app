import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import {
  BLOCK_COLORS, BLOCK_EMOJIS, BLOCK_LABELS,
  timeToMinutes, minutesToTime,
} from '../../utils';
import type { DailyReport, TimeBlock } from '../../types';
import {
  ChipPopover,
  DAY_START, DAY_END, HOUR_PX, minuteToY,
} from '../timeline/DragAndChip';
import type { DragState, UseDragAndChipResult } from '../timeline/DragAndChip';
import type { BlockDragState } from '../timeline/useBlockDrag';
import { BlockCard } from './BlockCard';

// ─── Props ────────────────────────────────────────────────────────────────────
export interface TimelinePanelProps {
  report: DailyReport;
  blockDragState: BlockDragState | null;
  startDrag: (
    e: React.MouseEvent,
    blockId: string,
    mode: 'move' | 'resizeTop' | 'resizeBottom',
    origStart: number,
    origEnd: number,
    col?: 'planned' | 'actual',
  ) => void;
  plannedDnC: UseDragAndChipResult;
  actualDnC: UseDragAndChipResult;
  isMobile: boolean;
  /** TodayPage から渡す DOM ref（useDragAndChip が参照する実体） */
  plannedRef: React.RefObject<HTMLDivElement | null>;
  actualRef: React.RefObject<HTMLDivElement | null>;
  onOpenBlock: (block?: TimeBlock, col?: 'planned' | 'actual') => void;
  onActualize: (block: TimeBlock) => void;
  // chip handlers (for popover)
  onPlannedChipSelected: (type: import('../../types').BlockType) => void;
  onPlannedDragWithoutType: () => void;
  onActualChipSelected: (type: import('../../types').BlockType) => void;
  onActualDragWithoutType: () => void;
  /** false = 予定未確定のため実績入力を無効化 */
  isActualEnabled: boolean;
}

// ─── TimeGrid (shared hour lines) ─────────────────────────────────────────────
function TimeGrid() {
  return (
    <>
      {Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }).map((_, i) => (
        <div
          key={i}
          style={{ top: `${minuteToY(DAY_START + i * 60) + 8}px` }}
          className="absolute left-0 right-0 border-t border-gray-100 pointer-events-none"
        />
      ))}
    </>
  );
}



// ─── DragGhost ────────────────────────────────────────────────────────────────
function DragGhost({ dragState, col }: { dragState: DragState; col: 'planned' | 'actual' }) {
  const colorClass = col === 'planned'
    ? 'border-blue-400 bg-blue-50/60 text-blue-600'
    : 'border-emerald-400 bg-emerald-50/60 text-emerald-600';
  const dur = dragState.endMin - dragState.startMin;
  const h = Math.floor(dur / 60);
  const m = dur % 60;
  const durStr = h > 0 && m > 0 ? `${h}h${m}m` : h > 0 ? `${h}h` : `${m}m`;

  return (
    <div
      style={{
        top: `${minuteToY(dragState.startMin) + 8}px`,
        height: `${Math.max(((dragState.endMin - dragState.startMin) / 60) * HOUR_PX - 4, 20)}px`,
        left: '4px', right: '4px',
      }}
      className={`absolute rounded-lg border-2 border-dashed pointer-events-none z-10 flex items-start px-2 py-1 ${colorClass}`}
    >
      <span className="text-xs font-medium mt-0.5 truncate">
        {`${minutesToTime(dragState.startMin)} - ${minutesToTime(dragState.endMin)} ⏱${durStr}`}
      </span>
    </div>
  );
}

// ─── TimelinePanel ────────────────────────────────────────────────────────────
export function TimelinePanel({
  report, blockDragState, startDrag,
  plannedDnC, actualDnC, isMobile,
  plannedRef, actualRef,
  onOpenBlock, onActualize,
  onPlannedChipSelected, onPlannedDragWithoutType,
  onActualChipSelected, onActualDragWithoutType,
  isActualEnabled,
}: TimelinePanelProps) {
  // DOM ref は TodayPage から渡されたものを使う（useDragAndChip が同じ ref を参照）
  const timelineRef  = plannedRef as React.MutableRefObject<HTMLDivElement | null>;
  const actualColRef = actualRef  as React.MutableRefObject<HTMLDivElement | null>;

  const totalHeight = ((DAY_END - DAY_START) / 60) * HOUR_PX + 32;

  // 現時刻マーカー（1分ごと更新）
  const [nowMin, setNowMin] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    const iv = setInterval(() => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    }, 60_000);
    return () => clearInterval(iv);
  }, []);
  const nowInRange = nowMin >= DAY_START && nowMin <= DAY_END;
  const nowTop = nowInRange ? minuteToY(nowMin) + 8 : null;


  // ── 凡例表示トグル ──────────────────────────────────────────────
  const [showLegend, setShowLegend] = useState(false);

  // ── 列レンダー共通関数 ─────────────────────────────────────────
  const renderColumn = (col: 'planned' | 'actual') => {
    const isPlanned = col === 'planned';
    const ref       = isPlanned ? timelineRef : actualColRef;
    const dnC       = isPlanned ? plannedDnC  : actualDnC;
    const blocks    = report.blocks.filter(b => isPlanned ? b.isPlanned : b.isActual);
    const bgClass   = isPlanned ? 'bg-indigo-50/20' : 'bg-emerald-50/20';
    const headerBg  = isPlanned ? 'bg-indigo-50'    : 'bg-emerald-50';
    const textCol   = isPlanned ? 'text-indigo-700'  : 'text-emerald-700';
    const btnCol    = isPlanned ? 'text-indigo-600 hover:bg-indigo-100' : 'text-emerald-600 hover:bg-emerald-100';
    const label     = isPlanned ? '📋 予定（計画）' : '✅ 実績（結果）';
    const testId    = isPlanned ? 'add-planned'    : 'add-actual';

    // 実績列の入力可否
    const actualDisabled = !isPlanned && !isActualEnabled;

    return (
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 列ヘッダー */}
        <div className={`px-3 py-2 flex items-center justify-between border-b border-gray-100 ${headerBg}`}>
          <span className={`text-xs font-bold ${textCol}`}>{label}</span>
          <button
            onClick={() => onOpenBlock(undefined, col)}
            data-testid={testId}
            disabled={actualDisabled}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg min-h-[36px] sm:min-h-[28px] ${actualDisabled ? 'opacity-40 cursor-not-allowed' : btnCol}`}
            aria-label={isPlanned ? '予定を追加' : '実績を追加'}
          >
            <Plus className="w-3.5 h-3.5" /> 追加
          </button>
        </div>

        {/* 実績入力未解禁バナー */}
        {actualDisabled && (
          <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
            予定を確定すると実績を入力できます
          </div>
        )}

        {/* タイムライン本体 */}
        <div
          ref={ref}
          className={`relative select-none ${bgClass}${actualDisabled ? ' pointer-events-none opacity-60' : ''}`}
          style={{
            height: `${totalHeight}px`,
            cursor: actualDisabled ? 'not-allowed' : (dnC.dragState?.active ? 'ns-resize' : 'crosshair'),
          }}
          onMouseDown={actualDisabled ? undefined : dnC.onTimelineMouseDown}
          onTouchStart={actualDisabled ? undefined : dnC.onTimelineTouchStart}
        >
          <TimeGrid />
          {blocks.map(block => {
            const isDragging = blockDragState?.blockId === block.id;
            const startMin = isDragging ? blockDragState!.startMin : timeToMinutes(block.startTime);
            const endMin   = isDragging ? blockDragState!.endMin   : timeToMinutes(block.endTime);
            const origStart = timeToMinutes(block.startTime);
            const origEnd   = timeToMinutes(block.endTime);
            return (
              <BlockCard
                key={block.id}
                block={block}
                isDragging={isDragging}
                startMin={startMin}
                endMin={endMin}
                origStart={origStart}
                origEnd={origEnd}
                col={col}
                showActualizeBtn={isPlanned && !block.isActual}
                onDragStart={(e, mode) => startDrag(e, block.id, mode, origStart, origEnd, col)}
                onClick={e => { if (isDragging) { e.stopPropagation(); return; } onOpenBlock(block, col); }}
                onActualize={() => onActualize(block)}
              />
            );
          })}
          {dnC.dragState?.active && <DragGhost dragState={dnC.dragState} col={col} />}
          {/* 現時刻マーカー */}
          {nowTop !== null && (
            <div className="absolute left-0 right-0 pointer-events-none z-30" style={{ top: `${nowTop}px` }}>
              <div className="relative flex items-center">
                {isPlanned && (
                  <span data-testid="now-marker-label" className="absolute -top-3.5 left-0 text-[9px] font-bold text-red-600 bg-white/90 px-0.5 rounded leading-none whitespace-nowrap">
                    {String(Math.floor(nowMin / 60)).padStart(2,'0')}:{String(nowMin % 60).padStart(2,'0')}
                  </span>
                )}
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 shadow-sm" />
                <div className="flex-1 border-t-2 border-red-400 opacity-80" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        {/* パネルヘッダー */}
        <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-gray-700">📅 タイムライン</span>
            <span className="hidden sm:inline text-xs text-gray-400">← ドラッグまたは「追加」ボタンで入力</span>
          </div>
          <button
            onClick={() => setShowLegend(v => !v)}
            className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg min-h-[36px]"
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
            <span className="text-xs text-gray-400 self-center ml-2">点線=予定 / 実線=実績</span>
          </div>
        )}

        {/* 予定/実績 説明バー（P0-2） */}
        <div className="hidden sm:grid border-b border-gray-100 text-center" style={{ gridTemplateColumns: '40px 1fr 1px 1fr' }}>
          <div />
          <div className="py-1 bg-indigo-100/60 text-xs font-bold text-indigo-700">◀ 予定（計画したこと）</div>
          <div className="bg-gray-200" />
          <div className="py-1 bg-emerald-100/60 text-xs font-bold text-emerald-700">実績（実際にやったこと）▶</div>
        </div>

        {/* タイムライン本体 */}
        {isMobile ? (
          <div className="flex flex-col">
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
              {renderColumn('planned')}
            </div>
            <div className="border-t-2 border-dashed border-gray-200 my-1 mx-3" />
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
              {renderColumn('actual')}
            </div>
          </div>
        ) : (
          <div className="flex" style={{ height: `${totalHeight}px` }}>
            <div className="relative flex-shrink-0 bg-gray-50/50" style={{ width: '40px' }}>
              {Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }).map((_, i) => {
                const min = DAY_START + i * 60;
                const h = Math.floor(min / 60);
                const m = min % 60;
                return (
                  <div key={i} style={{ top: `${minuteToY(min) + 8}px` }}
                    className="absolute right-1 text-[10px] text-gray-400 leading-none pointer-events-none">
                    {h}:{String(m).padStart(2,'0')}
                  </div>
                );
              })}
            </div>
            {renderColumn('planned')}
            <div className="w-px bg-gray-200 flex-shrink-0" />
            {renderColumn('actual')}
          </div>
        )}
      </div>

      {plannedDnC.chipVisible && plannedDnC.dragState && (
        <ChipPopover
          dragState={plannedDnC.dragState}
          onSelectChip={onPlannedChipSelected}
          onOpenWithoutType={onPlannedDragWithoutType}
          onCancel={plannedDnC.cancelDrag}
          isMobile={isMobile}
        />
      )}
      {actualDnC.chipVisible && actualDnC.dragState && (
        <ChipPopover
          dragState={actualDnC.dragState}
          onSelectChip={onActualChipSelected}
          onOpenWithoutType={onActualDragWithoutType}
          onCancel={actualDnC.cancelDrag}
          isMobile={isMobile}
        />
      )}
    </>
  );
}
