import { BLOCK_COLORS, BLOCK_EMOJIS, BLOCK_LABELS, minutesToTime } from '../../utils';
import type { TimeBlock } from '../../types';
import { HOUR_PX, minuteToY } from '../timeline/DragAndChip';

// ─── BlockCard Props ─────────────────────────────────────────────────────────
export interface BlockCardProps {
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

// ─── BlockCard Component ──────────────────────────────────────────────────────
export function BlockCard({
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
      {/* notes display */}
      {block.memo && height >= 40 && (
        <div className="text-xs text-gray-500 line-clamp-2 mt-1 pointer-events-none leading-tight">
          📝 {block.memo}
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
