import { useState } from "react";
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { useAppStore } from "../../store";
import type { TaskTemplate } from "../../types";
import {
  TRIGGER_LABELS,
  SCOPE_LABELS,
  PRIORITY_LABELS,
  STAGE_OPTIONS,
  BLANK_TMPL,
} from "./constants";
import { TaskTemplateForm } from "./TaskTemplateForm";

export function TaskTemplatesTab({ canEdit }: { canEdit: boolean }) {
  const {
    taskTemplates,
    addTaskTemplate,
    updateTaskTemplate,
    removeTaskTemplate,
  } = useAppStore();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const sorted = [...taskTemplates].sort((a, b) => {
    if (a.trigger !== b.trigger) return a.trigger.localeCompare(b.trigger);
    return a.order - b.order;
  });

  const handleAdd = (
    draft: Omit<TaskTemplate, "id" | "createdAt" | "updatedAt">,
  ) => {
    addTaskTemplate(draft);
    setAdding(false);
  };

  const handleUpdate = (
    id: string,
    draft: Omit<TaskTemplate, "id" | "createdAt" | "updatedAt">,
  ) => {
    updateTaskTemplate(id, draft);
    setEditingId(null);
  };

  const handleRemove = (id: string) => {
    if (!confirm("このタスク初期値マスタを削除しますか？")) return;
    removeTaskTemplate(id);
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            マスタ追加
          </button>
        </div>
      )}
      {adding && canEdit && (
        <TaskTemplateForm
          initial={BLANK_TMPL}
          onSave={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          タスク初期値マスタがありません
        </p>
      ) : (
        <div className="space-y-2">
          {sorted.map((tmpl) => {
            if (editingId === tmpl.id && canEdit) {
              return (
                <div key={tmpl.id}>
                  <TaskTemplateForm
                    initial={{
                      title: tmpl.title,
                      scope: tmpl.scope,
                      trigger: tmpl.trigger,
                      productCategories: tmpl.productCategories,
                      triggerStage: tmpl.triggerStage,
                      defaultDueOffsetDays: tmpl.defaultDueOffsetDays,
                      defaultPriority: tmpl.defaultPriority,
                      defaultMemo: tmpl.defaultMemo,
                      order: tmpl.order,
                      isActive: tmpl.isActive,
                    }}
                    onSave={(draft) => handleUpdate(tmpl.id, draft)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              );
            }
            return (
              <div
                key={tmpl.id}
                className={`p-4 bg-white rounded-xl border ${tmpl.isActive ? "border-gray-200" : "border-gray-100 opacity-60"}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">
                        {tmpl.title}
                      </span>
                      {!tmpl.isActive && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          無効
                        </span>
                      )}
                      <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        {SCOPE_LABELS[tmpl.scope]}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {TRIGGER_LABELS[tmpl.trigger]}
                      </span>
                      {tmpl.triggerStage && (
                        <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                          {STAGE_OPTIONS.find(
                            (s) => s.value === tmpl.triggerStage,
                          )?.label ?? tmpl.triggerStage}
                        </span>
                      )}
                      <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                        優先度: {PRIORITY_LABELS[tmpl.defaultPriority]}
                      </span>
                      {tmpl.defaultDueOffsetDays != null && (
                        <span className="text-xs text-gray-500">
                          期限+{tmpl.defaultDueOffsetDays}日
                        </span>
                      )}
                    </div>
                    {tmpl.productCategories !== null && (
                      <p className="text-xs text-gray-400 mt-1">
                        対象カテゴリ:{" "}
                        {tmpl.productCategories.length === 0
                          ? "なし"
                          : tmpl.productCategories.join(", ")}
                      </p>
                    )}
                    {tmpl.defaultMemo && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        メモ: {tmpl.defaultMemo}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() =>
                          updateTaskTemplate(tmpl.id, {
                            order: Math.max(0, tmpl.order - 1),
                          })
                        }
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                        title="順序を上げる"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          updateTaskTemplate(tmpl.id, { order: tmpl.order + 1 })
                        }
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                        title="順序を下げる"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(tmpl.id);
                          setAdding(false);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-500 rounded"
                        title="編集"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemove(tmpl.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
