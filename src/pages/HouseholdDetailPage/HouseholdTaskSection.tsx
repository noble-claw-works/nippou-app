import { useState } from "react";
import { Plus, Edit } from "lucide-react";
import type { Customer, Task } from "../../types";

interface HouseholdTaskSectionProps {
  customer: Customer;
  onAddTask: (
    customerId: string,
    task: Omit<Task, "id" | "createdAt" | "updatedAt">,
  ) => void;
  onUpdateTask: (
    customerId: string,
    taskId: string,
    patch: Partial<Task>,
  ) => void;
  onRemoveTask: (customerId: string, taskId: string) => void;
  onToggleDone: (customerId: string, taskId: string, done: boolean) => void;
}

export function HouseholdTaskSection({
  customer,
  onAddTask,
  onUpdateTask,
  onRemoveTask,
  onToggleDone,
}: HouseholdTaskSectionProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{
    title: string;
    dueDate: string;
    priority: Task["priority"];
    memo: string;
  }>({ title: "", dueDate: "", priority: "medium", memo: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Task>>({});

  const tasks = customer.tasks ?? [];

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">
          ☑️ 世帯タスク ({tasks.filter((t) => t.done).length}/{tasks.length})
        </h2>
        <button
          onClick={() => {
            setAdding(true);
            setEditingId(null);
          }}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
        >
          <Plus className="w-3.5 h-3.5" />
          タスク追加
        </button>
      </div>

      {adding && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 space-y-2">
          <input
            type="text"
            placeholder="タスク名"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={draft.dueDate}
              onChange={(e) =>
                setDraft((d) => ({ ...d, dueDate: e.target.value }))
              }
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-sm"
            />
            <select
              value={draft.priority}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  priority: e.target.value as Task["priority"],
                }))
              }
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setAdding(false)}
              className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
            >
              キャンセル
            </button>
            <button
              onClick={() => {
                if (!draft.title.trim()) return;
                onAddTask(customer.id, {
                  title: draft.title.trim(),
                  done: false,
                  priority: draft.priority,
                  rolledOver: false,
                  scope: "household",
                  householdId: customer.id,
                  dueDate: draft.dueDate || undefined,
                  ownerId: customer.primaryUserId,
                });
                setDraft({
                  title: "",
                  dueDate: "",
                  priority: "medium",
                  memo: "",
                });
                setAdding(false);
              }}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              追加
            </button>
          </div>
        </div>
      )}

      {tasks.length === 0 && !adding ? (
        <p className="text-sm text-gray-400 text-center py-3">
          世帯タスクはありません
        </p>
      ) : (
        <div className="space-y-1">
          {tasks.map((task) => {
            if (editingId === task.id) {
              return (
                <div
                  key={task.id}
                  className="bg-gray-50 rounded-lg p-3 space-y-2"
                >
                  <input
                    type="text"
                    value={editDraft.title ?? ""}
                    onChange={(e) =>
                      setEditDraft((d) => ({ ...d, title: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={editDraft.dueDate ?? ""}
                      onChange={(e) =>
                        setEditDraft((d) => ({
                          ...d,
                          dueDate: e.target.value || undefined,
                        }))
                      }
                      className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-sm"
                    />
                    <select
                      value={editDraft.priority ?? "medium"}
                      onChange={(e) =>
                        setEditDraft((d) => ({
                          ...d,
                          priority: e.target.value as Task["priority"],
                        }))
                      }
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                    >
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditDraft({});
                      }}
                      className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => {
                        onUpdateTask(customer.id, task.id, editDraft);
                        setEditingId(null);
                        setEditDraft({});
                      }}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      保存
                    </button>
                  </div>
                </div>
              );
            }
            const isAutoGenerated = task.sourceMasterId !== undefined;
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-gray-50 group"
              >
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={(e) =>
                    onToggleDone(customer.id, task.id, e.target.checked)
                  }
                  className="w-4 h-4 accent-blue-500 rounded flex-shrink-0"
                />
                <span className="flex-1 min-w-0">
                  <span
                    className={`text-sm ${task.done ? "line-through text-gray-400" : "text-gray-800"}`}
                  >
                    {task.title}
                  </span>
                  {isAutoGenerated && (
                    <span className="ml-1.5 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      自動
                    </span>
                  )}
                  {task.dueDate && (
                    <span className="ml-1.5 text-xs text-gray-500">
                      期限: {task.dueDate}
                    </span>
                  )}
                  {task.done && task.doneDate && (
                    <span className="ml-1.5 text-xs text-green-600">
                      完了: {task.doneDate}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingId(task.id);
                      setEditDraft({
                        title: task.title,
                        dueDate: task.dueDate,
                        priority: task.priority,
                      });
                    }}
                    className="p-1.5 text-gray-400 hover:text-blue-500 rounded"
                    title="編集"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  {!isAutoGenerated && (
                    <button
                      onClick={() => onRemoveTask(customer.id, task.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                      title="削除"
                    >
                      <Plus className="w-3.5 h-3.5 rotate-45" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
