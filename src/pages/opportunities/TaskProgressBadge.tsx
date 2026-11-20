import { CheckSquare } from "lucide-react";
import type { Task } from "../../types";

export function TaskProgressBadge({ tasks }: { tasks: Task[] }) {
  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="flex items-center gap-1.5">
      <CheckSquare className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      <span className="text-xs font-medium text-gray-500">
        {done}/{total}
      </span>
      {total > 0 && (
        <div className="flex-1 min-w-[40px] h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
