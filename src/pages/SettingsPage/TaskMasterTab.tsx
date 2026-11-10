// =====================================================
// TaskMasterTab.tsx — タスクマスタCRUD (工程B-2 2026-10-07)
// 設定画面内で完結する TaskTemplate CRUD UI
// フォームは TaskMasterForm.tsx に切り出し済み
// 400行以内制約遵守
// =====================================================
import { useState } from "react";
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { useAppStore } from "../../store";
import type { TaskTemplate } from "../../types";
import { TaskMasterForm } from "./TaskMasterForm";
import {
  BLANK_TASK_MASTER,
  TIMING_LABELS,
  BASE_DATE_LABELS,
  type DraftTemplate,
} from "./taskMasterConstants";

function TimingBadge({ tmpl }: { tmpl: TaskTemplate }) {
  if (!tmpl.timingType || tmpl.timingType === "on_opportunity_created") {
    return (
      <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
        {TIMING_LABELS["on_opportunity_created"]}
      </span>
    );
  }
  const base = tmpl.baseDateType
    ? BASE_DATE_LABELS[tmpl.baseDateType]
    : "基準日";
  const days = tmpl.offsetDays ?? 0;
  const offsetLabel =
    days === 0 ? "当日" : days > 0 ? `${days}日後` : `${Math.abs(days)}日前`;
  return (
    <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
      {base} {offsetLabel}
    </span>
  );
}

export function TaskMasterTab() {
  const {
    taskTemplates,
    addTaskTemplate,
    updateTaskTemplate,
    removeTaskTemplate,
  } = useAppStore();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const sorted = [...taskTemplates].sort((a, b) => a.order - b.order);

  const handleAdd = (draft: DraftTemplate) => {
    addTaskTemplate(draft);
    setAdding(false);
  };

  const handleUpdate = (id: string, draft: DraftTemplate) => {
    updateTaskTemplate(id, draft);
    setEditingId(null);
  };

  const handleRemove = (id: string) => {
    if (!confirm("このタスクマスタを削除しますか？")) return;
    removeTaskTemplate(id);
  };

  return (
    <div className="space-y-4">
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

      {adding && (
        <TaskMasterForm
          initial={BLANK_TASK_MASTER}
          onSave={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          タスクマスタがありません
        </p>
      ) : (
        <div className="space-y-2">
          {sorted.map((tmpl) => {
            if (editingId === tmpl.id) {
              return (
                <div key={tmpl.id}>
                  <TaskMasterForm
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
                      timingType: tmpl.timingType,
                      baseDateType: tmpl.baseDateType,
                      offsetDays: tmpl.offsetDays,
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
                className={`p-4 bg-white rounded-xl border ${
                  tmpl.isActive
                    ? "border-gray-200"
                    : "border-gray-100 opacity-60"
                }`}
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
                      <TimingBadge tmpl={tmpl} />
                      {tmpl.defaultDueOffsetDays != null && (
                        <span className="text-xs text-gray-500">
                          期限+{tmpl.defaultDueOffsetDays}日
                        </span>
                      )}
                    </div>
                    {tmpl.defaultMemo && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {tmpl.defaultMemo}
                      </p>
                    )}
                  </div>
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
