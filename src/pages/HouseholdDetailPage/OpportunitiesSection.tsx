import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Layers } from "lucide-react";
import type { Opportunity } from "../../types";
import { StageBadge } from "../../components/opportunity/StageBadge";

interface OpportunitiesSectionProps {
  opportunities: Opportunity[];
  onBatchEntry: () => void;
  onQuickAdd: () => void;
}

export function OpportunitiesSection({
  opportunities,
  onBatchEntry,
  onQuickAdd,
}: OpportunitiesSectionProps) {
  const [tab, setTab] = useState<"open" | "closed">("open");
  const open = opportunities.filter((o) => o.status === "open");
  const closed = opportunities.filter((o) => o.status !== "open");
  const visible = tab === "open" ? open : closed;

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">
          💼 商談 ({opportunities.length}件)
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBatchEntry}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Layers className="w-3 h-3" />
            まとめて入力/更新
          </button>
          <button
            type="button"
            onClick={onQuickAdd}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-3.5 h-3.5" />
            新規案件
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setTab("open")}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${tab === "open" ? "bg-blue-100 border-blue-300 text-blue-700" : "border-gray-200 text-gray-500"}`}
        >
          進行中 ({open.length})
        </button>
        <button
          onClick={() => setTab("closed")}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${tab === "closed" ? "bg-gray-100 border-gray-300 text-gray-700" : "border-gray-200 text-gray-500"}`}
        >
          完了 ({closed.length})
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          {tab === "open"
            ? "進行中の案件はありません"
            : "完了した案件はありません"}
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((opp) => (
            <Link
              key={opp.id}
              to={`/opportunities/${opp.id}`}
              className="flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-800 truncate">
                    {opp.title}
                  </span>
                  <StageBadge stage={opp.stage} size="sm" />
                </div>
                {opp.nextAction && (
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    次: {opp.nextAction}
                    {opp.nextActionDate ? ` (${opp.nextActionDate})` : ""}
                  </div>
                )}
              </div>
              {opp.totalMonthlyPremium && (
                <span className="text-xs text-gray-500 shrink-0">
                  ¥{opp.totalMonthlyPremium.toLocaleString()}/月
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
