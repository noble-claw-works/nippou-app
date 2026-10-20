import { Plus, Edit2, Trash2, CheckSquare, Square } from "lucide-react";
import type { Opportunity, Person, ProposalProduct } from "../../types";
import { PRODUCT_CATEGORY_LABELS } from "./constants";
import { ReflectionControl } from "../../components/policy/ReflectionControl";

interface ProductsTabProps {
  opp: Opportunity;
  persons: Person[];
  onAdd: () => void;
  onEdit: (product: ProposalProduct) => void;
  onDelete: (productId: string) => void;
  onToggleTask?: (taskId: string, done: boolean) => void;
}

export function ProductsTab({
  opp,
  persons,
  onAdd,
  onEdit,
  onDelete,
  onToggleTask,
}: ProductsTabProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">提案商品一覧</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <Plus className="w-4 h-4" />
          追加
        </button>
      </div>

      {opp.proposalProducts.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          提案商品が登録されていません
        </p>
      ) : (
        <div className="space-y-3">
          {opp.proposalProducts.map((pp) => {
            const person = persons.find((p) => p.id === pp.insuredPersonId);
            const productTasks = (opp.tasks ?? []).filter(
              (t) => t.scope === "product" && t.productId === pp.id,
            );

            return (
              <div
                key={pp.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                {/* カードヘッダー: 編集/削除アイコン */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {PRODUCT_CATEGORY_LABELS[pp.productCategory] ??
                        pp.productCategory}
                    </span>
                    <span className="font-medium text-gray-800">
                      {pp.productName}
                    </span>
                  </div>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button
                      onClick={() => onEdit(pp)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(pp.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2列レイアウト: 左=基本情報、右=付帯タスク */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 左列: 基本情報 + 反映方法 */}
                  <div className="space-y-1.5">
                    <div className="text-sm text-gray-500">
                      {pp.insurer}
                      {person && (
                        <span> / 被保険者: {person.name}</span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      月払: ¥{pp.monthlyPremium.toLocaleString()}
                      {pp.faceAmount && (
                        <span className="text-gray-500 font-normal">
                          {" "}
                          / 保険金額: ¥{pp.faceAmount.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {pp.memo && (
                      <div className="text-xs text-gray-400">{pp.memo}</div>
                    )}
                    {/* 反映方法select */}
                    <ReflectionControl opp={opp} pp={pp} />
                  </div>

                  {/* 右列: 商品付帯タスク */}
                  {productTasks.length > 0 ? (
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1.5">
                        商品付帯タスク
                      </div>
                      <div className="space-y-1">
                        {productTasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <button
                              onClick={() =>
                                onToggleTask?.(task.id, !task.done)
                              }
                              className="shrink-0 text-gray-400 hover:text-blue-500"
                            >
                              {task.done ? (
                                <CheckSquare className="w-4 h-4 text-green-500" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                            <span
                              className={`flex-1 ${
                                task.done
                                  ? "line-through text-gray-400"
                                  : "text-gray-700"
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.dueDate && (
                              <span className="text-xs text-gray-400">
                                {task.dueDate}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* タスクなし: 右列を空白にして右側を有効活用 */
                    <div className="hidden md:block" />
                  )}
                </div>
              </div>
            );
          })}
          {opp.totalMonthlyPremium && (
            <div className="border-t pt-3 text-sm font-medium text-gray-700 text-right">
              合計月払: ¥{opp.totalMonthlyPremium.toLocaleString()} / 月
            </div>
          )}
        </div>
      )}
    </div>
  );
}
