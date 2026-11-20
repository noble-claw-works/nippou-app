// HouseholdPickPane.tsx — 新規案件作成①ペイン: 世帯の検索・選択・新規登録＋世帯員（11/08 指示書 design.md §1.3）
// 選んでも画面は切り替わらず、右の②③が入力可になる。上段=世帯リスト、下段=選択中世帯の世帯員。

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store';
import { HouseholdRow } from './HouseholdRow';
import { QuickHouseholdInlineForm } from './QuickHouseholdInlineForm';
import { HouseholdMembersBlock } from './HouseholdMembersBlock';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
  /** インライン新規世帯フォームで登録した直後 */
  onCreated: (id: string) => void;
  /** 直前に新規登録した世帯 id（世帯員フォームの自動オープン用） */
  justCreatedId?: string | null;
}

export function HouseholdPickPane({ selectedId, onSelect, onCreated, justCreatedId = null }: Props) {
  const { customers, persons, users, currentRole } = useAppStore();
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const q = search.trim();
  const active = customers.filter(c => c.status === 'active');
  const visible = active.filter(c => c.name.includes(q));
  const userName = (id: string) => users.find(u => u.id === id)?.name ?? '';
  const memberCount = (hid: string) => persons.filter(p => p.householdId === hid).length;

  // 選択中の行を見える位置へ（URL 初期選択・新規登録直後）
  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-household-id="${CSS.escape(selectedId)}"]`);
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [selectedId]);

  const handleCreated = (id: string) => {
    setShowNew(false);
    setSearch('');
    onCreated(id);
  };

  return (
    <div className="flex flex-col lg:h-full min-h-0">
      <div className="flex flex-col min-h-0 lg:flex-1 lg:basis-3/5">
        <div className="flex gap-2 px-3 py-2 border-b border-gray-200">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="世帯名で検索"
            aria-label="世帯名で検索"
            className="flex-1 min-w-0 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {currentRole !== undefined && (
            <button
              type="button"
              onClick={() => setShowNew(v => !v)}
              className="shrink-0 px-2 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {showNew ? '閉じる' : '＋ 新規世帯'}
            </button>
          )}
        </div>

        {showNew && (
          <QuickHouseholdInlineForm initialName={q} onCreated={handleCreated} onCancel={() => setShowNew(false)} />
        )}

        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto max-h-[40vh] lg:max-h-none">
          {visible.length === 0 ? (
            <p className="px-3 py-6 text-sm text-gray-400 text-center">
              {q ? '該当する世帯がありません。＋ 新規世帯 で登録できます' : '世帯が登録されていません'}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {visible.map(h => (
                <li key={h.id}>
                  <HouseholdRow
                    household={h}
                    memberCount={memberCount(h.id)}
                    ownerName={userName(h.primaryUserId)}
                    selected={h.id === selectedId}
                    onClick={() => onSelect(h.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {selectedId && (
        <div className="border-t border-gray-200 min-h-0 lg:basis-2/5 flex flex-col">
          <HouseholdMembersBlock key={selectedId} householdId={selectedId} autoOpenAdd={justCreatedId === selectedId} />
        </div>
      )}
    </div>
  );
}
