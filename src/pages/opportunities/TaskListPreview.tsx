import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Task } from "../../types";
import type { User } from "../../types";

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  high: "高",
  medium: "中",
  low: "低",
};

interface TaskListPreviewProps {
  tasks: Task[];
  users?: User[];
  onNavigate: () => void;
  onToggle?: (taskId: string, done: boolean) => void;
}

export function TaskListPreview({
  tasks,
  users,
  onNavigate,
  onToggle,
}: TaskListPreviewProps) {
  const [showDone, setShowDone] = useState(false);
  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const previewPending = pending.slice(0, 5);

  function resolveUserName(userId?: string): string {
    if (!userId || !users) return "";
    return users.find((u) => u.id === userId)?.name ?? "";
  }

  if (tasks.length === 0) {
    return (
      <div className="px-4 py-2 bg-gray-50 text-xs text-gray-400 border-t border-gray-100">
        タスクなし
      </div>
    );
  }

  return (
    <div
      className="bg-gray-50 border-t border-gray-100"
      onClick={(e) => e.stopPropagation()}
    >
      {previewPending.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2 px-8 py-1.5 text-xs border-b border-gray-100 last:border-b-0"
        >
          <button
            type="button"
            aria-label={`タスク完了: ${t.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.(t.id, true);
            }}
            className="w-3.5 h-3.5 rounded border border-gray-300 flex-shrink-0 hover:border-blue-400 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <span className="flex-1 text-gray-700 truncate">{t.title}</span>
          {t.dueDate && (
            <span className="text-gray-400 whitespace-nowrap">{t.dueDate}</span>
          )}
          <span className="text-gray-400 text-[10px]">
            {PRIORITY_LABEL[t.priority]}
          </span>
        </div>
      ))}
      {pending.length > 5 && (
        <div className="px-8 py-1 text-xs text-gray-400">
          他 {pending.length - 5} 件の未完了タスク
        </div>
      )}
      {done.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-1 px-8 py-1.5 text-xs text-gray-500 hover:text-gray-700 w-full text-left border-t border-gray-100"
          >
            <ChevronDown
              className={`w-3 h-3 transition-transform ${showDone ? "rotate-180" : ""}`}
            />
            完了 {done.length} 件
          </button>
          {showDone &&
            done.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 px-8 py-1.5 text-xs border-b border-gray-100 last:border-b-0"
              >
                <button
                  type="button"
                  aria-label={`タスク未完了に戻す: ${t.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle?.(t.id, false);
                  }}
                  className="w-3.5 h-3.5 rounded border border-blue-400 bg-blue-400 flex-shrink-0 flex items-center justify-center text-white text-[8px] hover:bg-blue-300 hover:border-blue-300 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  ✓
                </button>
                <span className="flex-1 text-gray-400 line-through truncate">
                  {t.title}
                </span>
                {(t.doneDate || t.doneBy) && (
                  <span className="text-gray-400 text-[10px] whitespace-nowrap">
                    {t.doneDate && <span>{t.doneDate}</span>}
                    {t.doneBy && resolveUserName(t.doneBy) && (
                      <span className="ml-1">{resolveUserName(t.doneBy)}</span>
                    )}
                  </span>
                )}
              </div>
            ))}
        </>
      )}
      <div className="px-8 py-1.5 border-t border-gray-100">
        <button
          type="button"
          onClick={onNavigate}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          案件詳細でタスク管理 →
        </button>
      </div>
    </div>
  );
}
