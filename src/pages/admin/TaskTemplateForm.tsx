import { useState } from "react";
import type {
  TaskTemplate,
  TaskScope,
  TaskTriggerType,
  TaskPriority,
  OpportunityStage,
} from "../../types";
import { STAGE_OPTIONS, type ProductCategorySet } from "./constants";
import { getCategorySet, categorySetToValue } from "./helpers";

interface TaskTemplateFormProps {
  initial: Omit<TaskTemplate, "id" | "createdAt" | "updatedAt">;
  onSave: (v: Omit<TaskTemplate, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}

export function TaskTemplateForm({
  initial,
  onSave,
  onCancel,
}: TaskTemplateFormProps) {
  const [draft, setDraft] = useState(initial);
  const [catSet, setCatSet] = useState<ProductCategorySet>(
    getCategorySet(initial.productCategories),
  );

  const handleCatSet = (v: ProductCategorySet) => {
    setCatSet(v);
    setDraft((d) => ({ ...d, productCategories: categorySetToValue(v) }));
  };

  const isValid = draft.title.trim().length > 0;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          タスク名 *
        </label>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
          placeholder="例: 告知書取得"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            スコープ
          </label>
          <select
            value={draft.scope}
            onChange={(e) =>
              setDraft((d) => ({ ...d, scope: e.target.value as TaskScope }))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="household">世帯</option>
            <option value="opportunity">案件</option>
            <option value="product">商品</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            トリガー
          </label>
          <select
            value={draft.trigger}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                trigger: e.target.value as TaskTriggerType,
                triggerStage: undefined,
              }))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="household_created">世帯作成時</option>
            <option value="opportunity_created">案件作成時</option>
            <option value="product_added">商品追加時</option>
            <option value="stage_reached">ステージ到達時</option>
          </select>
        </div>
      </div>
      {draft.trigger === "stage_reached" && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            到達ステージ
          </label>
          <select
            value={draft.triggerStage ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                triggerStage: (e.target.value as OpportunityStage) || undefined,
              }))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">選択してください</option>
            {STAGE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {draft.trigger === "product_added" && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            商品カテゴリ条件
          </label>
          <div className="flex gap-2">
            {(["all", "life", "nonlife", "none"] as ProductCategorySet[]).map(
              (v) => (
                <button
                  key={v}
                  onClick={() => handleCatSet(v)}
                  className={`px-3 py-1 text-xs rounded-full border ${catSet === v ? "bg-blue-500 text-white border-blue-500" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                >
                  {v === "all"
                    ? "全商品"
                    : v === "life"
                      ? "生保系"
                      : v === "nonlife"
                        ? "損保系"
                        : "カスタム"}
                </button>
              ),
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            優先度
          </label>
          <select
            value={draft.defaultPriority}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                defaultPriority: e.target.value as TaskPriority,
              }))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            期限オフセット (日)
          </label>
          <input
            type="number"
            min={0}
            value={draft.defaultDueOffsetDays ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                defaultDueOffsetDays: e.target.value
                  ? parseInt(e.target.value)
                  : undefined,
              }))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            placeholder="例: 7"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            表示順
          </label>
          <input
            type="number"
            value={draft.order}
            onChange={(e) =>
              setDraft((d) => ({ ...d, order: parseInt(e.target.value) || 99 }))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          既定メモ（任意）
        </label>
        <input
          type="text"
          value={draft.defaultMemo ?? ""}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              defaultMemo: e.target.value || undefined,
            }))
          }
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          checked={draft.isActive}
          onChange={(e) =>
            setDraft((d) => ({ ...d, isActive: e.target.checked }))
          }
          className="w-4 h-4 accent-blue-500"
        />
        <label htmlFor="isActive" className="text-sm text-gray-700">
          有効（無効にすると生成に使われなくなります）
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          キャンセル
        </button>
        <button
          onClick={() => isValid && onSave(draft)}
          disabled={!isValid}
          className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          保存
        </button>
      </div>
    </div>
  );
}
