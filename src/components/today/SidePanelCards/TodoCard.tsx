import { useState } from "react";
import { Plus, X, ChevronDown } from "lucide-react";
import {
  isTodoReadOnly,
  getTodoReadOnlyReason,
} from "../../../utils/todoReadOnly";
import type { SidePanelCardsProps } from "../SidePanelCards";
import type { ReportStatus } from "../../../utils/todoReadOnly";

interface TodoInputState {
  text: string;
  priority: "high" | "medium" | "low";
  dueDate: string;
}

type TodoCardProps = Pick<
  SidePanelCardsProps,
  "report" | "onAddTodo" | "onToggleTodo" | "onDeleteTodo"
> & {
  isReadOnly: boolean;
};

export function TodoCard({
  report,
  isReadOnly,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
}: TodoCardProps) {
  const [input, setInput] = useState<TodoInputState>({
    text: "",
    priority: "medium",
    dueDate: "",
  });
  const [showInput, setShowInput] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  const handleAdd = () => {
    if (isReadOnly) return;
    const t = input.text.trim();
    if (!t) return;
    onAddTodo(t, input.priority);
    setInput({ text: "", priority: "medium", dueDate: "" });
    setShowInput(false);
  };

  const handleToggle = (todoId: string, todoReadOnly: boolean) => {
    if (isReadOnly || todoReadOnly) return;
    onToggleTodo(todoId);
  };

  const handleDelete = (todoId: string, todoReadOnly: boolean) => {
    if (isReadOnly || todoReadOnly) return;
    onDeleteTodo(todoId);
  };

  const pending = report.todos.filter((t) => t.status !== "done");
  const done = report.todos.filter((t) => t.status === "done");

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          ✅ TODO
          {pending.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">
              {pending.length}件
            </span>
          )}
          {report.todos.length > 0 && pending.length === 0 && (
            <span className="text-xs bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">
              ✓ 完了
            </span>
          )}
          {isReadOnly && (
            <span
              className="text-xs bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 inline-flex items-center gap-0.5"
              title="提出済み・確認済み日報の TODO は読み取り専用です"
            >
              🔒 読み取り専用
            </span>
          )}
        </span>
        {!isReadOnly && (
          <button
            onClick={() => setShowInput((v) => !v)}
            className="p-1 rounded hover:bg-gray-100"
            title="TODO を追加"
          >
            <Plus className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* インライン入力 */}
      {showInput && !isReadOnly && (
        <div className="space-y-2 mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
          <input
            autoFocus
            type="text"
            value={input.text}
            onChange={(e) => setInput({ ...input, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") {
                setShowInput(false);
                setInput({ text: "", priority: "medium", dueDate: "" });
              }
            }}
            placeholder="TODO を入力"
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                優先度
              </label>
              <select
                value={input.priority}
                onChange={(e) =>
                  setInput({
                    ...input,
                    priority: e.target.value as "high" | "medium" | "low",
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="high">🔥 高</option>
                <option value="medium">⭐ 中</option>
                <option value="low">💧 低</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                期限
              </label>
              <input
                type="date"
                value={input.dueDate}
                onChange={(e) =>
                  setInput({ ...input, dueDate: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="w-full px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
          >
            追加
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        {report.todos.length === 0 && !showInput && (
          <p className="text-xs text-gray-400">
            TODOがありません。＋ で追加できます
          </p>
        )}
        {/* todo / doing */}
        {pending.map((todo) => {
          const priorityEmoji =
            todo.priority === "high"
              ? "🔥"
              : todo.priority === "medium"
                ? "⭐"
                : "💧";
          const statusIcon =
            todo.status === "todo" ? "☐" : todo.status === "doing" ? "◐" : "☑";
          const isDueSoon = todo.dueDate && todo.dueDate === todayStr;
          const isOverdue = todo.dueDate && todo.dueDate < todayStr;
          const dueColor = isOverdue
            ? "text-red-600"
            : isDueSoon
              ? "text-amber-600"
              : "text-gray-500";
          const todoReadOnly = isTodoReadOnly(
            todo,
            report.status as ReportStatus,
            todayStr,
          );
          const isBtnDisabled = isReadOnly || todoReadOnly;
          const btnTitle =
            getTodoReadOnlyReason(
              todo,
              report.status as ReportStatus,
              todayStr,
            ) ?? "クリックで todo → doing → done を巡回";

          return (
            <div key={todo.id} className="flex items-center gap-2 group">
              <button
                onClick={() => handleToggle(todo.id, todoReadOnly)}
                disabled={isBtnDisabled}
                aria-disabled={isBtnDisabled}
                title={btnTitle}
                className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-sm ${isBtnDisabled ? "cursor-not-allowed opacity-50" : "hover:bg-blue-100"}`}
              >
                {statusIcon}
              </button>
              <span
                className={`flex-1 text-sm ${todo.status === "done" ? "line-through text-gray-400" : "text-gray-700"}`}
              >
                {todo.text}
              </span>
              <span className="text-xs flex-shrink-0">{priorityEmoji}</span>
              {todo.dueDate && (
                <span
                  className={`text-xs px-1.5 py-0.5 bg-gray-100 rounded flex-shrink-0 ${dueColor}`}
                >
                  〜{todo.dueDate.slice(5)}
                </span>
              )}
              {!isBtnDisabled && (
                <button
                  onClick={() => handleDelete(todo.id, todoReadOnly)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-100 rounded flex-shrink-0"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              )}
            </div>
          );
        })}
        {/* 完了済み（折りたたみ） */}
        {done.length > 0 && (
          <details className="mt-1">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 list-none flex items-center gap-1">
              <ChevronDown className="w-3 h-3" /> 完了済み {done.length}件
            </summary>
            <div className="mt-1 space-y-1">
              {done.map((todo) => {
                const todoDoneReadOnly = isTodoReadOnly(
                  todo,
                  report.status as ReportStatus,
                  todayStr,
                );
                const isDoneDisabled = isReadOnly || todoDoneReadOnly;
                const doneBtnTitle =
                  getTodoReadOnlyReason(
                    todo,
                    report.status as ReportStatus,
                    todayStr,
                  ) ?? "";
                return (
                  <div key={todo.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => handleToggle(todo.id, todoDoneReadOnly)}
                      disabled={isDoneDisabled}
                      aria-disabled={isDoneDisabled}
                      title={doneBtnTitle}
                      className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-sm ${isDoneDisabled ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      ☑️
                    </button>
                    <span className="flex-1 text-sm line-through text-gray-400">
                      {todo.text}
                    </span>
                    {!isDoneDisabled && (
                      <button
                        onClick={() => handleDelete(todo.id, todoDoneReadOnly)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-100 rounded flex-shrink-0"
                      >
                        <X className="w-3 h-3 text-gray-400" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
