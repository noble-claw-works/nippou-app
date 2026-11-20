import { buildTimelineWithGaps } from "../../../utils";
import { DAY_END, minuteToY } from "../../timeline/DragAndChip";
import type { Customer, TimeBlock } from "../../../types";
import { TimeGrid } from "./TimeGrid";
import { BlockBar } from "./BlockBar";
import { GapBar } from "./GapBar";

interface ColumnProps {
  blocks: TimeBlock[];
  customers: Customer[];
  kind: "planned" | "actual";
  onSelectBlock: (block: TimeBlock) => void;
}

export function ReadOnlyTimelineColumn({
  blocks,
  customers,
  kind,
  onSelectBlock,
}: ColumnProps) {
  const filtered = blocks.filter((b) =>
    kind === "planned" ? b.isPlanned : b.isActual,
  );
  const items = buildTimelineWithGaps(filtered);
  const totalHeight = minuteToY(DAY_END) + 16;

  const bgClass = kind === "planned" ? "bg-indigo-50/20" : "bg-emerald-50/20";

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
      {items.map((item) => {
        if (item.kind === "gap") {
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
            customerName={
              item.block.customerId
                ? (customers.find((c) => c.id === item.block.customerId)
                    ?.name ?? "不明")
                : undefined
            }
            onSelect={onSelectBlock}
          />
        );
      })}
    </div>
  );
}
