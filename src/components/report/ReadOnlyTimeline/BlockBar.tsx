import { BLOCK_COLORS, BLOCK_EMOJIS, BLOCK_LABELS } from "../../../utils";
import { HOUR_PX, minuteToY } from "../../timeline/DragAndChip";
import type { TimeBlock } from "../../../types";
import { timeToMin } from "./helpers";

interface BlockBarProps {
  block: TimeBlock;
  customerName?: string;
  onSelect: (block: TimeBlock) => void;
}

export function BlockBar({ block, customerName, onSelect }: BlockBarProps) {
  const startMin = timeToMin(block.startTime);
  const endMin = timeToMin(block.endTime);
  const top = minuteToY(startMin) + 8;
  const height = Math.max(((endMin - startMin) / 60) * HOUR_PX - 4, 24);
  const color = BLOCK_COLORS[block.type] ?? "bg-gray-100 border-gray-200";

  return (
    <button
      type="button"
      role="button"
      aria-label={`${block.startTime}から${block.endTime} ${BLOCK_LABELS[block.type]} ${block.title || ""} — クリックで詳細`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: "4px",
        right: "4px",
      }}
      className={`absolute rounded-lg border ${color} px-2 py-1 overflow-hidden shadow-sm text-left cursor-pointer hover:ring-2 hover:ring-blue-400 hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500`}
      onClick={() => onSelect(block)}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-sm flex-shrink-0" aria-hidden="true">
          {BLOCK_EMOJIS[block.type]}
        </span>
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
        <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5 whitespace-pre-wrap">
          {block.memo}
        </p>
      )}
    </button>
  );
}
