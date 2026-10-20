import { useState } from "react";
import { Plus, Edit } from "lucide-react";
import type { Customer, Task, User } from "../../types";

interface HouseholdTaskSectionProps {
  customer: Customer;
  /** ② 担当者名解決用ユーザーリスト（省略時は世帯担当者名をフォールバック表示） */
  users?: User[];
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
  users,
  onAddTask,
  onUpdateTask,
  onRemoveTask,
  onToggleDone,
}: HouseholdTaskSectionProps) {
  // ② 担当者名解決:
  //   1. task.ownerId があればユーザーリストから名前解決
  //   2. ownerId 解決不可 or 未設定の場合は世帯の primaryUserId で解決
  //   3. それも不可なら「世帯担当者」と表示
  function resolveAssigneeName(task: Task): string {
    const uid = task.ownerId ?? customer.primaryUserId;
    if (!uid) return "世帯担当者";
    if (users) {
      const found = users.find((u) => u.id === uid);
      if (found) return found.name;
    }
    // users 未渡し or 解決失敗 → 世帯担当者 (primaryUserId) を返す
    return uid === customer.primaryUserId ? "世帯担当者" : uid;
  }
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{
    title: string;
    dueDate: string;
    priority: Task["priority"];
    memo: string;
    ownerId: string;
  }>({ title: "", dueDate: "", priority: "medium", memo: "", ownerId: customer.primaryUserId ?? "" });
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
          {users && users.length > 0 && (
            <select
              value={draft.ownerId}
              onChange={(e) =>
                setDraft((d) => ({ ...d, ownerId: e.target.value }))
              }
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm"
            >
              <option value="">担当者を選択</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
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
                  ownerId: draft.ownerId || customer.primaryUserId,
                });
                setDraft({
                  title: "",
                  dueDate: "",
                  priority: "medium",
                  memo: "",
                  ownerId: customer.primaryUserId ?? "",
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
                  {users && users.length > 0 && (
                    <select
                      value={editDraft.ownerId ?? ""}
                      onChange={(e) =>
                        setEditDraft((d) => ({ ...d, ownerId: e.target.value || undefined }))
                      }
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm"
                    >
                      <option value="">担当者を選択</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  )}
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
                  {/* ② 担当者名表示（task.ownerId → users → 世帯担当者 primaryUserId の順で解決） */}
                  <span className="ml-1.5 text-xs text-indigo-500">
                    👤 {resolveAssigneeName(task)}
                  </span>
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
