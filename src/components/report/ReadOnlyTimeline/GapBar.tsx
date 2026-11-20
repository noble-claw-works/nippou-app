import { formatGapDuration } from "../../../utils";
import { HOUR_PX, minuteToY } from "../../timeline/DragAndChip";
import { timeToMin } from "./helpers";

interface GapBarProps {
  startTime: string;
  endTime: string;
  durationMin: number;
}

export function GapBar({ startTime, endTime, durationMin }: GapBarProps) {
  const top = minuteToY(timeToMin(startTime)) + 8;
  const height = Math.max(
    ((timeToMin(endTime) - timeToMin(startTime)) / 60) * HOUR_PX - 4,
    16,
  );
  return (
    <div
      role="note"
      aria-label={`スキマ時間 ${startTime}から${endTime} ${formatGapDuration(durationMin)}`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: "4px",
        right: "4px",
      }}
      className="absolute rounded-lg border border-dashed border-amber-300 bg-amber-50/40 flex items-center justify-center text-[10px] text-amber-700"
    >
      <span className="px-2 truncate">
        ⏳ スキマ {startTime}–{endTime} ({formatGapDuration(durationMin)})
      </span>
    </div>
  );
}
