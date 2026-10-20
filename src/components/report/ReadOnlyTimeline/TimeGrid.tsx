import { DAY_START, DAY_END, minuteToY } from "../../timeline/DragAndChip";

export function TimeGrid() {
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
              {String(hour).padStart(2, "0")}:00
            </span>
          </div>
        );
      })}
    </>
  );
}
