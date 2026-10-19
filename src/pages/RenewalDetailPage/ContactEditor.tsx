// =====================================================
// ContactEditor — コンタクト履歴の実入力テーブル（1行=1接触）
//   列: 日付(date) / 結果(select 5種) / メモ(text) / 行削除
//   ＋「＋行を追加」ボタン。onChange で全量配列を返す（置換マージ設計）。
// =====================================================
import type { RenewalContactRecord } from "../../types/renewal";
import {
  RENEWAL_CONTACT_RESULT_OPTIONS,
} from "../../utils/renewalLabels";

/** 簡易ユニークID（contact 行用） */
function contactUid(): string {
  return `ct_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ContactEditor({
  contacts,
  onChange,
}: {
  contacts: RenewalContactRecord[];
  onChange: (next: RenewalContactRecord[]) => void;
}) {
  const update = (id: string, patch: Partial<RenewalContactRecord>) =>
    onChange(contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const remove = (id: string) =>
    onChange(contacts.filter((c) => c.id !== id));
  const add = () =>
    onChange([
      ...contacts,
      { id: contactUid(), date: todayStr(), result: "no_answer" },
    ]);

  return (
    <div>
      <div className="text-[11px] font-medium text-gray-500 mb-1.5">
        コンタクト履歴（実入力）
      </div>
      {contacts.length === 0 ? (
        <p className="text-xs text-gray-400 mb-2">
          接触記録はまだありません。「＋行を追加」で入力してください。
        </p>
      ) : (
        <div className="space-y-2 mb-2">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2"
            >
              <input
                type="date"
                value={c.date ?? ""}
                onChange={(e) => update(c.id, { date: e.target.value })}
                className="sm:w-40 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                aria-label="接触日"
              />
              <select
                value={c.result}
                onChange={(e) =>
                  update(c.id, {
                    result: e.target.value as RenewalContactRecord["result"],
                  })
                }
                className="sm:w-36 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                aria-label="結果"
              >
                {RENEWAL_CONTACT_RESULT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={c.memo ?? ""}
                onChange={(e) =>
                  update(c.id, { memo: e.target.value || undefined })
                }
                placeholder="メモ"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                aria-label="メモ"
              />
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="shrink-0 px-2 py-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                aria-label="行を削除"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={add}
        className="text-xs font-medium text-blue-600 hover:text-blue-800"
      >
        ＋行を追加
      </button>
    </div>
  );
}
