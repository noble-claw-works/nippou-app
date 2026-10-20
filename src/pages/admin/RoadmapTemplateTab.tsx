// =====================================================
// RoadmapTemplateTab — ロードマップ テンプレ項目エディタ（Doc5 T5-07 / §5）
// 管理者(manager=isAdmin)のみ編集・発行。①〜④は最大4件の可変リスト。
// 発行で版を切り、過去回答は当時の版で保持される（版管理）。
// =====================================================
import { useMemo, useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Send } from "lucide-react";
import { useAppStore } from "../../store";
import type { RenewalRoadmapItemDef } from "../../types";
import {
  MAX_ROADMAP_ITEMS,
  validateRoadmapItems,
  sortRoadmapItems,
} from "../../utils/roadmapTemplate";
import { buildSeedRoadmapTemplateV1 } from "../../utils/renewalMigration";

interface RoadmapTemplateTabProps {
  canEdit: boolean;
}

function emptyItem(order: number): RenewalRoadmapItemDef {
  return {
    id: `rm_custom_${Date.now()}_${order}`,
    order,
    label: "",
    active: true,
  };
}

export function RoadmapTemplateTab({ canEdit }: RoadmapTemplateTabProps) {
  const getCurrentRoadmapTemplate = useAppStore(
    (s) => s.getCurrentRoadmapTemplate,
  );
  const publishRoadmapTemplate = useAppStore((s) => s.publishRoadmapTemplate);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const versions = useAppStore((s) => s.roadmapTemplateVersions);

  const current = getCurrentRoadmapTemplate();
  const seed = current ?? buildSeedRoadmapTemplateV1();

  const [draft, setDraft] = useState<RenewalRoadmapItemDef[]>(() =>
    sortRoadmapItems(seed.items).map((i) => ({ ...i })),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const validation = useMemo(() => validateRoadmapItems(draft), [draft]);

  const updateItem = (
    idx: number,
    patch: Partial<RenewalRoadmapItemDef>,
  ) => {
    setDraft((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
    setMessage(null);
  };

  const move = (idx: number, dir: -1 | 1) => {
    setDraft((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      // order を並び順に再採番（1始まり）
      return next.map((it, i) => ({ ...it, order: i + 1 }));
    });
    setMessage(null);
  };

  const addItem = () => {
    setDraft((prev) => {
      if (prev.length >= MAX_ROADMAP_ITEMS) return prev;
      return [...prev, emptyItem(prev.length + 1)];
    });
    setMessage(null);
  };

  const removeItem = (idx: number) => {
    setDraft((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((it, i) => ({ ...it, order: i + 1 })),
    );
    setMessage(null);
  };

  const handlePublish = () => {
    const v = validateRoadmapItems(draft);
    setErrors(v.errors);
    if (!v.ok) return;
    try {
      const published = publishRoadmapTemplate(
        sortRoadmapItems(draft),
        currentUserId,
      );
      setMessage(`v${published.version} を発行しました`);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : String(e)]);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-800 mb-1">
          ロードマップ項目（最大{MAX_ROADMAP_ITEMS}件）
        </h2>
        <p className="text-xs text-gray-500">
          発行すると新しい版が作成され、過去の回答は当時の版のまま保持されます。
          {current ? ` 現在の最新版: v${current.version}` : " 未発行"}
        </p>
      </div>

      {!canEdit && (
        <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          編集・発行は管理者(マネージャー)のみ可能です。閲覧のみ表示しています。
        </div>
      )}

      <div className="space-y-2">
        {draft.map((it, idx) => (
          <div
            key={it.id}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-3"
          >
            <span className="text-xs text-gray-400 w-6 text-center">
              {["①", "②", "③", "④"][idx] ?? idx + 1}
            </span>
            <input
              type="text"
              value={it.label}
              disabled={!canEdit}
              onChange={(e) => updateItem(idx, { label: e.target.value })}
              placeholder="項目名"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50"
            />
            <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
              <input
                type="checkbox"
                checked={it.active}
                disabled={!canEdit}
                onChange={(e) => updateItem(idx, { active: e.target.checked })}
              />
              使う
            </label>
            {canEdit && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  aria-label="上へ"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === draft.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  aria-label="下へ"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="p-1 text-red-400 hover:text-red-600"
                  aria-label="削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={addItem}
            disabled={draft.length >= MAX_ROADMAP_ITEMS}
            className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            項目を追加
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={!validation.ok}
            className="flex items-center gap-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
            発行（版を切る）
          </button>
        </div>
      )}

      {errors.length > 0 && (
        <ul className="text-xs text-red-600 list-disc pl-5 space-y-0.5">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      {message && (
        <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {message}
        </div>
      )}

      {/* 版履歴 */}
      <div className="pt-2">
        <h3 className="text-xs font-semibold text-gray-700 mb-2">版履歴</h3>
        <div className="space-y-1">
          {[...versions]
            .sort((a, b) => b.version - a.version)
            .map((v) => (
              <div
                key={v.version}
                className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2"
              >
                <span className="font-medium">v{v.version}</span>
                <span>{v.items.filter((i) => i.active).length}項目（有効）</span>
                <span>{v.editedAt.slice(0, 10)}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
