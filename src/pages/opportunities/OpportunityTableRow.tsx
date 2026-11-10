import type { Opportunity, User } from "../../types";
import { effectiveExpectedCloseDate } from "../../utils/opportunityStage";
import { PRODUCT_CATEGORY_LABELS } from "./constants";
import { TaskProgressBadge } from "./TaskProgressBadge";
import { TaskListPreview } from "./TaskListPreview";

interface OpportunityTableRowProps {
  opp: Opportunity;
  users?: User[];
  getContractorName: (id: string | undefined) => string;
  onNavigate: (id: string) => void;
  onToggleTask?: (oppId: string, taskId: string, done: boolean) => void;
}

export function OpportunityTableRow({
  opp,
  users,
  getContractorName,
  onNavigate,
  onToggleTask,
}: OpportunityTableRowProps) {
  const tasks = opp.tasks ?? [];
  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer"
        onClick={() => onNavigate(opp.id)}
      >
        <td className="px-4 py-3 text-gray-700 whitespace-nowrap pl-8">
          {getContractorName(opp.contractorPersonId) || (
            <span className="text-gray-300">契約者未設定</span>
          )}
        </td>
        <td className="px-4 py-3">
          <span className="font-medium text-gray-800">{opp.title}</span>
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          <div className="flex flex-wrap gap-1">
            {opp.productCategories.map((cat) => (
              <span
                key={cat}
                className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
              >
                {PRODUCT_CATEGORY_LABELS[cat]}
              </span>
            ))}
          </div>
        </td>
        <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap hidden md:table-cell">
          {opp.totalMonthlyPremium
            ? `¥${opp.totalMonthlyPremium.toLocaleString()}`
            : "—"}
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">
          <TaskProgressBadge tasks={tasks} />
        </td>
        <td className="px-4 py-3 text-gray-600 hidden lg:table-cell max-w-[180px] truncate">
          {opp.nextAction ?? "—"}
        </td>
        <td className="px-4 py-3 text-gray-600 whitespace-nowrap hidden lg:table-cell">
          {effectiveExpectedCloseDate(opp) ?? "—"}
        </td>
      </tr>
      <tr key={`${opp.id}-tasks`}>
        <td colSpan={7} className="p-0">
          <TaskListPreview
            tasks={tasks}
            users={users}
            onNavigate={() => onNavigate(opp.id)}
            onToggle={
              onToggleTask
                ? (taskId, done) => onToggleTask(opp.id, taskId, done)
                : undefined
            }
          />
        </td>
      </tr>
    </>
  );
}
