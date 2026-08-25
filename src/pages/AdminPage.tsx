import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { useAppStore } from "../store";
import { ForbiddenState } from "../components/ui/EmptyState";
import { UsersTab } from "../components/admin/UsersTab";
import { TeamsTab } from "../components/admin/TeamsTab";
import type {
  TaskTemplate,
  TaskTriggerType,
  TaskScope,
  TaskPriority,
  OpportunityStage,
} from "../types";
import { LIFE_CATEGORIES, NONLIFE_CATEGORIES } from "../types";

// =============================
// Audit Log Tab
// =============================
function AuditLogTab() {
  const { auditLogs, users } = useAppStore();
  const sorted = [...auditLogs].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  return (
    <div>
      <div className="space-y-2">
        {sorted.map((log) => {
          const user = users.find((u) => u.id === log.userId);
          return (
            <div
              key={log.id}
              className="p-3 bg-white rounded-xl border border-gray-200"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs flex-shrink-0">
                  {user?.avatarInitials ?? "?"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">
                      {user?.name ?? log.userId}
                    </span>
                    <span className="text-sm text-gray-700">{log.action}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${log.result === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                      {log.result === "success" ? "成功" : "失敗"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {log.createdAt.slice(0, 16).replace("T", " ")} · IP:{" "}
                    {log.ip}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================
// タスク初期値タブ (ADR-TASK-MASTER T4)
// =============================
const TRIGGER_LABELS: Record<TaskTriggerType, string> = {
  household_created: "世帯作成時",
  opportunity_created: "案件作成時",
  product_added: "商品追加時",
  stage_reached: "ステージ到達時",
};
const SCOPE_LABELS: Record<TaskScope, string> = {
  household: "世帯",
  opportunity: "案件",
  product: "商品",
};
const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};
const STAGE_OPTIONS: { value: OpportunityStage; label: string }[] = [
  { value: "approach", label: "アプローチ" },
  { value: "fact_finding", label: "ヒアリング" },
  { value: "needs_analysis", label: "ニーズ分析" },
  { value: "proposal", label: "提案" },
  { value: "negotiation", label: "交渉" },
  { value: "application", label: "申込" },
  { value: "underwriting", label: "引受査定" },
  { value: "issued", label: "契約成立" },
  { value: "lost", label: "失注" },
];

const BLANK_TMPL: Omit<TaskTemplate, "id" | "createdAt" | "updatedAt"> = {
  title: "",
  scope: "opportunity",
  trigger: "opportunity_created",
  productCategories: null,
  triggerStage: undefined,
  defaultDueOffsetDays: undefined,
  defaultPriority: "medium",
  defaultMemo: undefined,
  order: 99,
  isActive: true,
};

type ProductCategorySet = "all" | "life" | "nonlife" | "none";

function getCategorySet(
  cats: TaskTemplate["productCategories"],
): ProductCategorySet {
  if (cats === null) return "all";
  if (cats.length === 0) return "none";
  if (
    LIFE_CATEGORIES.every((c) => cats.includes(c)) &&
    cats.length === LIFE_CATEGORIES.length
  )
    return "life";
  if (
    NONLIFE_CATEGORIES.every((c) => cats.includes(c)) &&
    cats.length === NONLIFE_CATEGORIES.length
  )
    return "nonlife";
  return "none";
}

function categorySetToValue(
  set: ProductCategorySet,
): TaskTemplate["productCategories"] {
  if (set === "all") return null;
  if (set === "life") return LIFE_CATEGORIES;
  if (set === "nonlife") return NONLIFE_CATEGORIES;
  return [];
}

function TaskTemplateForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Omit<TaskTemplate, "id" | "createdAt" | "updatedAt">;
  onSave: (v: Omit<TaskTemplate, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}) {
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

function TaskTemplatesTab({ canEdit }: { canEdit: boolean }) {
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

// =============================
// Main Admin Page
// =============================
export function AdminPage() {
  const { currentRole } = useAppStore();
  const [searchParams] = useSearchParams();
  // 設定画面等から ?tab=task_templates で直接「タスク初期値」タブを開けるようにする（導線改善）。
  const _initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<
    "users" | "teams" | "audit" | "task_templates"
  >(
    _initialTab === "task_templates" ||
      _initialTab === "teams" ||
      _initialTab === "audit"
      ? _initialTab
      : "users",
  );

  // admin: 読み書き / executive: 読取専用 / それ以外: Forbidden
  if (!["admin", "executive"].includes(currentRole)) {
    return (
      <div className="px-4 py-8">
        <ForbiddenState />
      </div>
    );
  }

  const canEdit = currentRole === "admin";

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <h1 className="text-lg font-bold text-gray-900 mb-4">管理</h1>
      {currentRole === "executive" && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          経営者ロールでは閲覧のみ可能です。編集・招待・削除は管理者が行ってください。
        </div>
      )}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-4 w-fit flex-wrap">
        {(
          [
            ["users", "👥 ユーザー"],
            ["teams", "🏢 チーム"],
            ["audit", "📜 監査ログ"],
            ["task_templates", "☑️ タスク初期値"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${activeTab === id ? "bg-white shadow font-medium text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="bg-gray-50 rounded-xl p-4">
        {activeTab === "users" && <UsersTab canEdit={canEdit} />}
        {activeTab === "teams" && <TeamsTab canEdit={canEdit} />}
        {activeTab === "audit" && <AuditLogTab />}
        {activeTab === "task_templates" && (
          <TaskTemplatesTab canEdit={canEdit} />
        )}
      </div>
    </div>
  );
}
