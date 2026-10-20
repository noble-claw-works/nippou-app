import { useState } from "react";
import { Plus } from "lucide-react";
import type { Opportunity, Task, User } from "../../types";
import { TaskRow } from "./TaskRow";

interface TasksTabProps {
  opp: Opportunity;
  users?: User[];
  onToggle: (taskId: string, done: boolean) => void;
  onAdd: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => void;
  onUpdate: (taskId: string, patch: Partial<Task>) => void;
  onRemove: (taskId: string) => void;
}

export function TasksTab({
  opp,
  users,
  onToggle,
  onAdd,
  onUpdate,
  onRemove,
}: TasksTabProps) {
  const [addingTask, setAddingTask] = useState(false);
  const [taskDraft, setTaskDraft] = useState<{
    title: string;
    dueDate: string;
    priority: Task["priority"];
    memo: string;
    ownerId: string;
  }>({ title: "", dueDate: "", priority: "medium", memo: "", ownerId: opp.ownerId ?? "" });
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskEditDraft, setTaskEditDraft] = useState<Partial<Task>>({});

  const oppTasks = opp.tasks ?? [];
  const doneCount = oppTasks.filter((t) => t.done).length;

  const handleAddTask = () => {
    if (!taskDraft.title.trim()) return;
    onAdd({
      title: taskDraft.title.trim(),
      done: false,
      priority: taskDraft.priority,
      rolledOver: false,
      scope: "opportunity",
      dueDate: taskDraft.dueDate || undefined,
      memo: taskDraft.memo || undefined,
      ownerId: taskDraft.ownerId || opp.ownerId,
    });
    setTaskDraft({ title: "", dueDate: "", priority: "medium", memo: "", ownerId: opp.ownerId ?? "" });
    setAddingTask(false);
  };

  const handleSaveTaskEdit = (taskId: string) => {
    onUpdate(taskId, taskEditDraft);
    setEditingTaskId(null);
    setTaskEditDraft({});
  };

  const taskRowCommon = {
    editingTaskId,
    taskEditDraft,
    onToggle,
    onStartEdit: (t: Task) => {
      setEditingTaskId(t.id);
      setTaskEditDraft({
        title: t.title,
        dueDate: t.dueDate,
        priority: t.priority,
        memo: t.memo,
      });
    },
    onSaveEdit: handleSaveTaskEdit,
    onCancelEdit: () => {
      setEditingTaskId(null);
      setTaskEditDraft({});
    },
    onEditDraftChange: setTaskEditDraft,
    onRemove,
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">
          タスク管理 ({doneCount}/{oppTasks.length})
        </h2>
        <button
          onClick={() => {
            setAddingTask(true);
            setEditingTaskId(null);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <Plus className="w-4 h-4" /> タスク追加
        </button>
      </div>

      {addingTask && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 space-y-2">
          <input
            type="text"
            placeholder="タスク名"
            value={taskDraft.title}
            onChange={(e) =>
              setTaskDraft((d) => ({ ...d, title: e.target.value }))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
            autoFocus
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={taskDraft.dueDate}
              onChange={(e) =>
                setTaskDraft((d) => ({ ...d, dueDate: e.target.value }))
              }
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            />
            <select
              value={taskDraft.priority}
              onChange={(e) =>
                setTaskDraft((d) => ({
                  ...d,
                  priority: e.target.value as Task["priority"],
                }))
              }
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
          {users && users.length > 0 && (
            <select
              value={taskDraft.ownerId}
              onChange={(e) =>
                setTaskDraft((d) => ({ ...d, ownerId: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">担当者を選択</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            placeholder="メモ（任意）"
            value={taskDraft.memo}
            onChange={(e) =>
              setTaskDraft((d) => ({ ...d, memo: e.target.value }))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setAddingTask(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              キャンセル
            </button>
            <button
              onClick={handleAddTask}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              追加
            </button>
          </div>
        </div>
      )}

      {(() => {
        const oppScopeTasks = oppTasks.filter((t) => t.scope === "opportunity");
        return oppScopeTasks.length === 0 && !addingTask ? (
          <p className="text-sm text-gray-400 text-center py-4">
            タスクがありません。「タスク追加」から自由に追加できます。
          </p>
        ) : (
          <div className="space-y-1">
            {oppScopeTasks.map((task) => (
              <TaskRow key={task.id} task={task} {...taskRowCommon} />
            ))}
          </div>
        );
      })()}
    </div>
  );
}
