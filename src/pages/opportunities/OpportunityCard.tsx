import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Opportunity, User } from "../../types";
import { tabOf, TAB_META, effectiveExpectedCloseDate } from "../../utils/opportunityStage";
import { PRODUCT_CATEGORY_LABELS } from "./constants";
import { TaskListPreview } from "./TaskListPreview";

interface OpportunityCardProps {
  opp: Opportunity;
  users?: User[];
  getContractorName: (id: string | undefined) => string;
  onNavigate: (id: string) => void;
  onToggleTask?: (oppId: string, taskId: string, done: boolean) => void;
}

/** ステージタブキー → バッジ色クラス */
const STAGE_BADGE_COLORS: Record<string, string> = {
  first_consult: "bg-blue-100 text-blue-700",
  lifeplan: "bg-purple-100 text-purple-700",
  proposed: "bg-amber-100 text-amber-700",
  contract_pending: "bg-orange-100 text-orange-700",
  contract: "bg-green-100 text-green-700",
  issued: "bg-emerald-100 text-emerald-700",
  lost: "bg-gray-100 text-gray-500",
};

export function OpportunityCard({
  opp,
  users,
  getContractorName,
  onNavigate,
  onToggleTask,
}: OpportunityCardProps) {
  const [tasksOpen, setTasksOpen] = useState(false);

  const tasks = opp.tasks ?? [];
  const pendingCount = tasks.filter((t) => !t.done).length;

  // ステージバッジ
  const tabKey = tabOf(opp);
  const stageLabel = TAB_META.find((m) => m.key === tabKey)?.label ?? tabKey;
  const stageBadgeColor =
    STAGE_BADGE_COLORS[tabKey] ?? "bg-gray-100 text-gray-500";

  // 担当者名 (ownerId → users から引く)
  const ownerName =
    users?.find((u) => u.id === opp.ownerId)?.name ?? opp.ownerId ?? "—";

  // FC日: milestones.firstConsultDate (ContractMilestones)
  const fcDate = opp.milestones?.firstConsultDate;

  // 月払
  const monthlyPremium = opp.totalMonthlyPremium;

  // 次アクション
  const nextActionDate = opp.nextActionDate;
  const nextAction = opp.nextAction;

  // 期日 (effectiveExpectedCloseDate)
  const expectedClose = effectiveExpectedCloseDate(opp);

  // カテゴリラベル
  const catLabels = opp.productCategories
    .map((c) => PRODUCT_CATEGORY_LABELS[c] as string | undefined)
    .filter((v): v is string => Boolean(v));

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      {/* カード本体：クリックで詳細遷移 */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => onNavigate(opp.id)}
      >
        {/* 上部: ステージバッジ + カテゴリ + 案件名 + 月払金額 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${stageBadgeColor}`}
              >
                {stageLabel}
              </span>
              {catLabels.map((label) => (
                <span
                  key={label}
                  className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                >
                  {label}
                </span>
              ))}
            </div>
            <h3 className="mt-1.5 text-sm font-semibold text-gray-900 truncate">
              {opp.title}
            </h3>
          </div>
          {/* 月払金額 */}
          {monthlyPremium != null && (
            <div className="text-sm font-medium text-gray-700 whitespace-nowrap shrink-0">
              ¥{monthlyPremium.toLocaleString()}
              <span className="text-xs text-gray-400">/月</span>
            </div>
          )}
        </div>

        {/* 中部: メタ情報グリッド (担当者 / FC日 / 契約者 / 期日) */}
        <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
          {/* 担当者 */}
          <div className="flex items-center gap-1 truncate">
            <span className="text-gray-400 shrink-0">担当:</span>
            <span className="truncate text-gray-700">{ownerName}</span>
          </div>
          {/* FC日 */}
          <div className="flex items-center gap-1 truncate">
            <span className="text-gray-400 shrink-0">FC日:</span>
            <span className="truncate text-gray-700">
              {fcDate ?? "—"}
            </span>
          </div>
          {/* 契約者 */}
          <div className="flex items-center gap-1 truncate">
            <span className="text-gray-400 shrink-0">契約者:</span>
            <span className="truncate text-gray-700">
              {getContractorName(opp.contractorPersonId) || "—"}
            </span>
          </div>
          {/* 期日 */}
          <div className="flex items-center gap-1 truncate">
            <span className="text-gray-400 shrink-0">期日:</span>
            <span className="truncate text-gray-700">
              {expectedClose ?? "—"}
            </span>
          </div>
        </div>

        {/* 次アクション */}
        {(nextAction || nextActionDate) && (
          <div className="mt-2 text-xs text-gray-600 bg-blue-50 rounded-lg px-3 py-1.5 truncate">
            <span className="text-blue-500 font-medium">次: </span>
            {nextAction ?? ""}
            {nextActionDate && (
              <span className="text-gray-400 ml-1">({nextActionDate})</span>
            )}
          </div>
        )}

        {/* タスクバッジ + 展開ボタン */}
        {tasks.length > 0 && (
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              タスク:{" "}
              <span
                className={`font-medium ${
                  pendingCount > 0 ? "text-amber-600" : "text-green-600"
                }`}
              >
                {pendingCount}件未完了
              </span>
              {" / "}
              {tasks.length}件
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTasksOpen((v) => !v);
              }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-0.5 rounded"
            >
              {tasksOpen ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  タスクを閉じる
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  タスクを見る
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* タスクリスト（展開時） */}
      {tasksOpen && tasks.length > 0 && (
        <div className="border-t border-gray-100">
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
        </div>
      )}
    </div>
  );
}
