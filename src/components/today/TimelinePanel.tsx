import { useRef, useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import {
  BLOCK_COLORS, BLOCK_EMOJIS, BLOCK_LABELS,
  timeToMinutes, minutesToTime,
} from '../../utils';
import type { DailyReport, Customer, TimeBlock } from '../../types';
import {
  ChipPopover,
  DAY_START, DAY_END, HOUR_PX, minuteToY,
} from '../timeline/DragAndChip';
import type { DragState, UseDragAndChipResult } from '../timeline/DragAndChip';
import type { BlockDragState } from '../timeline/useBlockDrag';

// ─── Props ────────────────────────────────────────────────────────────────────
export interface TimelinePanelProps {
  report: DailyReport;
  customers: Customer[];
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
  onOpenBlock: (block?: TimeBlock, col?: 'planned' | 'actual') => void;
  onActualize: (block: TimeBlock) => void;
  // chip handlers (for popover)
  onPlannedChipSelected: (type: import('../../types').BlockType) => void;
  onPlannedDragWithoutType: () => void;
  onActualChipSelected: (type: import('../../types').BlockType) => void;
  onActualDragWithoutType: () => void;
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

// ─── BlockCard ────────────────────────────────────────────────────────────────
interface BlockCardProps {
  block: TimeBlock;
  isDragging: boolean;
  startMin: number;
  endMin: number;
  origStart: number;
  origEnd: number;
  col: 'planned' | 'actual';
  showActualizeBtn: boolean;
  onDragStart: (e: React.MouseEvent, mode: 'move' | 'resizeTop' | 'resizeBottom') => void;
  onClick: (e: React.MouseEvent) => void;
  onActualize: (e: React.MouseEvent) => void;
}

function BlockCard({
  block, isDragging, startMin, endMin,
  origStart, origEnd, col, showActualizeBtn,
  onDragStart, onClick, onActualize,
}: BlockCardProps) {
  const top = minuteToY(startMin) + 8;
  const height = Math.max(((endMin - startMin) / 60) * HOUR_PX - 4, 24);
  const colorClass = BLOCK_COLORS[block.type];
  const borderStyle = col === 'planned' ? 'border-dashed' : 'border-solid';

  return (
    <div
      key={block.id}
      data-block="true"
      style={{
        top: `${top}px`, height: `${height}px`,
        left: '4px', right: '4px',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.85 : 1,
        zIndex: isDragging ? 20 : 10,
        transition: isDragging ? 'none' : 'box-shadow 0.15s',
      }}
      className={`absolute rounded-lg px-2 py-1 select-none group hover:shadow-md border ${borderStyle} ${colorClass}`}
      onMouseDown={e => onDragStart(e, 'move')}
      onClick={onClick}
    >
      {/* resize top handle */}
      <div
        className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize z-10"
        onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'resizeTop'); }}
      />
      <div className="flex items-center gap-1 text-xs font-medium truncate pointer-events-none">
        <span>{BLOCK_EMOJIS[block.type]}</span>
        <span className="truncate">{block.title || BLOCK_LABELS[block.type]}</span>
      </div>
      <div className="text-[10px] text-current opacity-70 pointer-events-none">
        {minutesToTime(startMin)}–{minutesToTime(endMin)}
      </div>
      {/* visit result badges */}
      {block.type === 'visit' && (block.collected || block.nextAppointment) && height >= 44 && (
        <div className="flex flex-wrap gap-0.5 mt-0.5 pointer-events-none">
          {block.collected && (
            <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded">✓集金済</span>
          )}
          {block.nextAppointment && (
            <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded">
              AP:{block.nextAppointment.slice(5)}
            </span>
          )}
        </div>
      )}
      {/* actualize button */}
      {showActualizeBtn && height >= 32 && (
        <button
          className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-md shadow hover:bg-emerald-600 transition-all z-20"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onActualize(e); }}
          title="実績ブロックを生成"
        >
          ✅ 実績化
        </button>
      )}
      {/* resize bottom handle */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-10"
        onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'resizeBottom'); }}
      />
    </div>
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
  report, customers, blockDragState, startDrag,
  plannedDnC, actualDnC, isMobile,
  onOpenBlock, onActualize,
  onPlannedChipSelected, onPlannedDragWithoutType,
  onActualChipSelected, onActualDragWithoutType,
}: TimelinePanelProps) {
  const timelineRef  = useRef<HTMLDivElement>(null);
  const actualColRef = useRef<HTMLDivElement>(null);

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

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Panel header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-gray-700">📅 タイムライン</span>
            <span className="ml-2 text-xs text-gray-400">← 空白をドラッグして素早く入力</span>
          </div>
        </div>

        {/* Column headers */}
        <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: '40px 1fr 1px 1fr' }}>
          <div />
          <div className="px-2 py-1.5 flex items-center justify-between bg-indigo-50">
            <span className="text-xs font-semibold text-indigo-600">📋 予定</span>
            <button
              onClick={() => onOpenBlock(undefined, 'planned')}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-indigo-600 hover:bg-indigo-100 rounded"
            >
              <Plus className="w-3 h-3" /> 追加
            </button>
          </div>
          <div className="bg-gray-200" />
          <div className="px-2 py-1.5 flex items-center justify-between bg-emerald-50">
            <span className="text-xs font-semibold text-emerald-600">✅ 実績</span>
            <button
              onClick={() => onOpenBlock(undefined, 'actual')}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-emerald-600 hover:bg-emerald-100 rounded"
            >
              <Plus className="w-3 h-3" /> 追加
            </button>
          </div>
        </div>

        {/* Timeline body */}
        <div className="flex" style={{ height: `${totalHeight}px` }}>
          {/* Hour axis */}
          <div className="relative flex-shrink-0" style={{ width: '40px' }}>
            {Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }).map((_, i) => {
              const min = DAY_START + i * 60;
              const h = Math.floor(min / 60);
              const m = min % 60;
              return (
                <div
                  key={i}
                  style={{ top: `${minuteToY(min) + 8}px` }}
                  className="absolute right-1 text-[10px] text-gray-400 leading-none pointer-events-none"
                >
                  {h}:{String(m).padStart(2, '0')}
                </div>
              );
            })}
          </div>

          {/* Planned column */}
          <div
            ref={el => {
              (timelineRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
              // also expose to DnC hook via ref
              if (el) {
                Object.assign(plannedDnC, { _containerEl: el });
              }
            }}
            className="relative flex-1 border-r border-gray-100 select-none bg-indigo-50/20"
            style={{ cursor: plannedDnC.dragState?.active ? 'ns-resize' : 'crosshair' }}
            onMouseDown={plannedDnC.onTimelineMouseDown}
            onTouchStart={plannedDnC.onTimelineTouchStart}
          >
            <TimeGrid />
            {report.blocks.filter(b => b.isPlanned).map(block => {
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
                  col="planned"
                  showActualizeBtn={block.isPlanned && !block.isActual}
                  onDragStart={(e, mode) => startDrag(e, block.id, mode, origStart, origEnd)}
                  onClick={e => { if (isDragging) { e.stopPropagation(); return; } onOpenBlock(block, 'planned'); }}
                  onActualize={() => onActualize(block)}
                />
              );
            })}
            {plannedDnC.dragState?.active && (
              <DragGhost dragState={plannedDnC.dragState} col="planned" />
            )}
            {/* 現時刻マーカー（予定列）*/}
            {nowTop !== null && (
              <div className="absolute left-0 right-0 pointer-events-none z-30" style={{ top: `${nowTop}px` }}>
                <div className="relative flex items-center">
                  <span className="absolute -top-3.5 left-0 text-[9px] font-bold text-red-600 bg-white/90 px-0.5 rounded leading-none whitespace-nowrap">
                    {String(Math.floor(nowMin / 60)).padStart(2,'0')}:{String(nowMin % 60).padStart(2,'0')}
                  </span>
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 shadow-sm" />
                  <div className="flex-1 border-t-2 border-red-400 opacity-80" />
                </div>
              </div>
            )}
          </div>

          {/* Actual column */}
          <div
            ref={el => {
              (actualColRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            }}
            className="relative flex-1 select-none bg-emerald-50/20"
            style={{ cursor: actualDnC.dragState?.active ? 'ns-resize' : 'crosshair' }}
            onMouseDown={actualDnC.onTimelineMouseDown}
            onTouchStart={actualDnC.onTimelineTouchStart}
          >
            <TimeGrid />
            {report.blocks.filter(b => b.isActual).map(block => {
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
                  col="actual"
                  showActualizeBtn={false}
                  onDragStart={(e, mode) => startDrag(e, block.id, mode, origStart, origEnd, 'actual')}
                  onClick={e => { if (isDragging) { e.stopPropagation(); return; } onOpenBlock(block, 'actual'); }}
                  onActualize={() => {}} // no-op for actual
                />
              );
            })}
            {actualDnC.dragState?.active && (
              <DragGhost dragState={actualDnC.dragState} col="actual" />
            )}
            {/* 現時刻マーカー（実績列）*/}
            {nowTop !== null && (
              <div className="absolute left-0 right-0 pointer-events-none z-30" style={{ top: `${nowTop}px` }}>
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 shadow-sm" />
                  <div className="flex-1 border-t-2 border-red-400 opacity-80" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ChipPopovers (rendered outside the timeline box, fixed position) */}
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
