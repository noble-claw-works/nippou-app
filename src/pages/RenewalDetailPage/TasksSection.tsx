// TasksSection — タスク管理（更新案件スコープ）
import { useState } from "react";
import { CheckSquare, Plus, Trash2, Check } from "lucide-react";
import type { RenewalCase, Task } from "../../types";

interface TasksSectionProps {
  rc: RenewalCase;
  onAddTask: (task: Omit<Task, "id" | "createdAt">) => void;
  onToggleDone: (taskId: string, done: boolean) => void;
  onRemoveTask: (taskId: string) => void;
}

type Priority = Task["priority"];

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

const PRIORITY_COLOR: Record<Priority, string> = {
  high: "text-red-600",
  medium: "text-amber-600",
  low: "text-gray-400",
};

export function TasksSection({
  rc,
  onAddTask,
  onToggleDone,
  onRemoveTask,
}: TasksSectionProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{
    title: string;
    dueDate: string;
    priority: Priority;
  }>({ title: "", dueDate: "", priority: "medium" });

  const tasks = rc.tasks ?? [];
  const doneCount = tasks.filter((t) => t.done).length;

  const handleAdd = () => {
    if (!draft.title.trim()) return;
    onAddTask({
      title: draft.title.trim(),
      done: false,
      priority: draft.priority,
      rolledOver: false,
      scope: "renewal" as const,
      dueDate: draft.dueDate || undefined,
      ownerId: rc.ownerUserId,
    });
    setDraft({ title: "", dueDate: "", priority: "medium" });
    setAdding(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-blue-500" />
          タスク
          {tasks.length > 0 && (
            <span className="text-xs text-gray-400">
              {doneCount}/{tasks.length}
            </span>
          )}
        </h3>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          追加
        </button>
      </div>

      {/* 追加フォーム */}
      {adding && (
        <div className="mb-3 bg-blue-50/50 border border-blue-200 rounded-lg p-3 space-y-2">
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="タスク名"
            autoFocus
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={draft.dueDate}
              onChange={(e) =>
                setDraft((d) => ({ ...d, dueDate: e.target.value }))
              }
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <select
              value={draft.priority}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  priority: e.target.value as Priority,
                }))
              }
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="high">高優先</option>
              <option value="medium">中優先</option>
              <option value="low">低優先</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!draft.title.trim()}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              追加する
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setDraft({ title: "", dueDate: "", priority: "medium" });
              }}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* タスク一覧 */}
      {tasks.length === 0 && !adding ? (
        <p className="text-sm text-gray-400 text-center py-4">
          タスクはありません
        </p>
      ) : (
        <ul className="space-y-1">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-2 py-2 px-1 hover:bg-gray-50 rounded-lg group"
            >
              {/* 完了トグル */}
              <button
                onClick={() => onToggleDone(task.id, !task.done)}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  task.done
                    ? "border-green-500 bg-green-500"
                    : "border-gray-300 hover:border-blue-400"
                }`}
                aria-label={task.done ? "完了を解除" : "完了にする"}
              >
                {task.done && <Check className="w-3 h-3 text-white" />}
              </button>

              {/* タスク情報 */}
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm ${task.done ? "line-through text-gray-400" : "text-gray-800"}`}
                >
                  {task.title}
                </span>
                {task.dueDate && (
                  <span className="ml-2 text-[10px] text-gray-400">
                    {task.dueDate}
                  </span>
                )}
              </div>

              {/* 優先度バッジ */}
              <span
                className={`text-[10px] font-semibold flex-shrink-0 ${PRIORITY_COLOR[task.priority ?? "medium"]}`}
              >
                {PRIORITY_LABEL[task.priority ?? "medium"]}
              </span>

              {/* 削除ボタン */}
              <button
                onClick={() => onRemoveTask(task.id)}
                className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded hover:bg-red-50 transition-opacity"
                aria-label="タスク削除"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
