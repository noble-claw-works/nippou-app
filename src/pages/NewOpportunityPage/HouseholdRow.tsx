// HouseholdRow.tsx — 新規案件作成①ペインの世帯 1 行（11/08 指示書 design.md §1.3）
// 世帯名＋区分バッジ、2 行目に人数・エリア・担当。選択中は青の左線で強調する。

import type { Customer } from '../../types';

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  individual: { label: '個人', cls: 'bg-gray-100 text-gray-600' },
  corporate: { label: '法人', cls: 'bg-purple-100 text-purple-700' },
};

interface Props {
  household: Customer;
  memberCount: number;
  ownerName: string;
  selected: boolean;
  onClick: () => void;
}

export function HouseholdRow({ household, memberCount, ownerName, selected, onClick }: Props) {
  const badge = TYPE_BADGE[household.type] ?? TYPE_BADGE.individual;
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-household-id={household.id}
      onClick={onClick}
      className={`w-full text-left px-3 py-2 border-l-2 transition-colors ${
        selected ? 'bg-blue-50 border-blue-500' : 'border-transparent hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-semibold text-gray-900 truncate">{household.name}</span>
        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
      </div>
      <p className="text-xs text-gray-500 mt-0.5 truncate">
        👪 {memberCount}名 · {household.area || 'エリア未設定'} · 担当 {ownerName || '—'}
      </p>
    </button>
  );
}
