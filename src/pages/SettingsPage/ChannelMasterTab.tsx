// =====================================================
// ChannelMasterTab.tsx — チャネルマスタCRUD (工程B-1 2026-10-07)
// SalesChannel (親子2階層) の一覧・追加・編集・有効/無効切替
// 400行以内制約遵守
// =====================================================
import { useState } from "react";
import { Plus, Edit2, ChevronUp, ChevronDown, ToggleLeft, ToggleRight } from "lucide-react";
import { useAppStore } from "../../store";
import type { SalesChannel } from "../../types";

interface FormState {
  name: string;
  parentId: string | null;
  isActive: boolean;
  order: number;
  memo: string;
}

const BLANK_FORM: FormState = {
  name: "",
  parentId: null,
  isActive: true,
  order: 99,
  memo: "",
};

function ChannelForm({
  initial,
  parents,
  onSave,
  onCancel,
}: {
  initial: FormState;
  parents: SalesChannel[];
  onSave: (v: FormState) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const isValid = draft.name.trim().length > 0;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          チャネル名 *
        </label>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
          placeholder="例: ABC代理店 新宿支店"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          分類（親チャネル）
        </label>
        <select
          value={draft.parentId ?? ""}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              parentId: e.target.value || null,
            }))
          }
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">─ 最上位分類（親）として追加</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-0.5">
          親を選ぶと詳細（子）チャネルになります
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
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
        <div className="flex items-end pb-0.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) =>
                setDraft((d) => ({ ...d, isActive: e.target.checked }))
              }
              className="w-4 h-4 accent-blue-500"
            />
            <span className="text-sm text-gray-700">有効</span>
          </label>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          メモ（任意）
        </label>
        <input
          type="text"
          value={draft.memo}
          onChange={(e) => setDraft((d) => ({ ...d, memo: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          placeholder="例: 代理店経由の案件"
        />
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

export function ChannelMasterTab() {
  const { salesChannels, addSalesChannel, updateSalesChannel } = useAppStore();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const parents = salesChannels
    .filter((c) => c.parentId === null)
    .sort((a, b) => a.order - b.order);

  const childrenOf = (parentId: string) =>
    salesChannels
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => a.order - b.order);

  const handleAdd = (draft: FormState) => {
    addSalesChannel({
      name: draft.name.trim(),
      parentId: draft.parentId,
      isActive: draft.isActive,
      order: draft.order,
      memo: draft.memo.trim() || undefined,
    });
    setAdding(false);
  };

  const handleUpdate = (id: string, draft: FormState) => {
    updateSalesChannel(id, {
      name: draft.name.trim(),
      parentId: draft.parentId,
      isActive: draft.isActive,
      order: draft.order,
      memo: draft.memo.trim() || undefined,
    });
    setEditingId(null);
  };

  const toggleActive = (ch: SalesChannel) => {
    updateSalesChannel(ch.id, { isActive: !ch.isActive });
  };

  const renderChannel = (ch: SalesChannel, indent = false) => {
    if (editingId === ch.id) {
      return (
        <div key={ch.id} className={indent ? "ml-6" : ""}>
          <ChannelForm
            initial={{
              name: ch.name,
              parentId: ch.parentId,
              isActive: ch.isActive,
              order: ch.order,
              memo: ch.memo ?? "",
            }}
            parents={parents}
            onSave={(draft) => handleUpdate(ch.id, draft)}
            onCancel={() => setEditingId(null)}
          />
        </div>
      );
    }
    return (
      <div
        key={ch.id}
        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${
          ch.isActive
            ? "bg-white border-gray-200"
            : "bg-gray-50 border-gray-100 opacity-60"
        } ${indent ? "ml-6" : ""}`}
      >
        <span className={`flex-1 text-sm ${indent ? "text-gray-600" : "font-medium text-gray-800"}`}>
          {indent && <span className="text-gray-300 mr-1">└</span>}
          {ch.name}
          {!ch.isActive && (
            <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              無効
            </span>
          )}
          {ch.memo && (
            <span className="ml-2 text-xs text-gray-400">{ch.memo}</span>
          )}
        </span>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => updateSalesChannel(ch.id, { order: Math.max(0, ch.order - 1) })}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
            title="順序を上げる"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => updateSalesChannel(ch.id, { order: ch.order + 1 })}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
            title="順序を下げる"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => toggleActive(ch)}
            className="p-1.5 rounded"
            title={ch.isActive ? "無効にする" : "有効にする"}
          >
            {ch.isActive ? (
              <ToggleRight className="w-4 h-4 text-green-500" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <button
            onClick={() => { setEditingId(ch.id); setAdding(false); }}
            className="p-1.5 text-gray-400 hover:text-blue-500 rounded"
            title="編集"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { setAdding(true); setEditingId(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <Plus className="w-4 h-4" />
          チャネル追加
        </button>
      </div>
      {adding && (
        <ChannelForm
          initial={BLANK_FORM}
          parents={parents}
          onSave={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}
      {salesChannels.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          チャネルマスタがありません
        </p>
      ) : (
        <div className="space-y-1.5">
          {parents.map((parent) => (
            <div key={parent.id} className="space-y-1">
              {renderChannel(parent, false)}
              {childrenOf(parent.id).map((child) =>
                renderChannel(child, true),
              )}
            </div>
          ))}
          {/* parentId に対応する親が見つからない孤立子チャネルも表示 */}
          {salesChannels
            .filter(
              (c) =>
                c.parentId !== null &&
                !salesChannels.find((p) => p.id === c.parentId),
            )
            .sort((a, b) => a.order - b.order)
            .map((orphan) => renderChannel(orphan, true))}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-2">
        ※ 削除は有効/無効の切替で代替します。案件で参照中のチャネルは履歴が保持されます。
      </p>
    </div>
  );
}
