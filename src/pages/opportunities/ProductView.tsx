import type { Opportunity, ProductCategory } from "../../types";
import { effectiveExpectedCloseDate } from "../../utils/opportunityStage";
import { useNavigate } from "react-router-dom";
import { TaskProgressBadge } from "./TaskProgressBadge";
import { TaskListPreview } from "./TaskListPreview";
export interface ProductGroup {
  category: ProductCategory;
  label: string;
  items: Opportunity[];
}

interface ProductViewProps {
  groups: ProductGroup[];
  getContractorName: (id: string | undefined) => string;
}

export function ProductView({ groups, getContractorName }: ProductViewProps) {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      {groups.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">
          該当する案件がありません
        </div>
      )}
      {groups.map((group) => (
        <div
          key={group.category}
          className="bg-white border border-gray-200 rounded-xl overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {group.label}
            </span>
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-600">
              {group.items.length}
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {group.items.map((opp) => {
              const tasks = opp.tasks ?? [];
              return (
                <div key={opp.id}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/opportunities/${opp.id}`)}
                  >
                    <div className="w-24 text-xs text-gray-600 whitespace-nowrap flex-shrink-0">
                      {getContractorName(opp.contractorPersonId) || (
                        <span className="text-gray-300">未設定</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-800 truncate">
                        {opp.title}
                      </div>
                      {opp.nextAction && (
                        <div className="text-xs text-gray-400 truncate mt-0.5">
                          {opp.nextAction}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <TaskProgressBadge tasks={tasks} />
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 hidden md:block">
                      {effectiveExpectedCloseDate(opp) ?? "—"}
                    </div>
                    <div className="text-xs text-gray-600 whitespace-nowrap flex-shrink-0 hidden lg:block">
                      {opp.totalMonthlyPremium
                        ? `¥${opp.totalMonthlyPremium.toLocaleString()}`
                        : "—"}
                    </div>
                  </div>
                  <TaskListPreview
                    tasks={tasks}
                    onNavigate={() => navigate(`/opportunities/${opp.id}`)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
