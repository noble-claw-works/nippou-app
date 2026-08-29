import { buildTimelineWithGaps, formatGapDuration } from "../../../utils";
import { DAY_END, minuteToY } from "../../timeline/DragAndChip";
import type { Customer, TimeBlock } from "../../../types";
import { TimeGrid } from "./TimeGrid";
import { BlockBar } from "./BlockBar";
import { GapBar } from "./GapBar";

interface SingleColumnTimelineProps {
  blocks: TimeBlock[];
  customers: Customer[];
  variant: "planned" | "actual";
  onSelectBlock: (block: TimeBlock) => void;
}

export function SingleColumnTimeline({
  blocks,
  customers,
  variant,
  onSelectBlock,
}: SingleColumnTimelineProps) {
  const filtered = blocks.filter((b) =>
    variant === "planned" ? b.isPlanned : b.isActual,
  );
  const items = buildTimelineWithGaps(filtered);
  const totalHeight = minuteToY(DAY_END) + 16;
  const totalGap = items.reduce(
    (s, i) => s + (i.kind === "gap" ? i.durationMin : 0),
    0,
  );

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-6 text-center">記録がありません</p>
    );
  }

  return (
    <div>
      {totalGap > 0 && (
        <p className="text-xs text-gray-500 mb-2 text-right">
          スキマ計{" "}
          <span className="font-medium text-amber-700">
            {formatGapDuration(totalGap)}
          </span>
        </p>
      )}
      <div
        className="relative bg-white rounded-lg border border-gray-100 overflow-hidden"
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
    </div>
  );
}
