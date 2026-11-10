// PersonsPane.tsx — ②構成員ペイン（追加フォーム含む・工程D）
// 400行以内・追加のみ実装（編集・削除はMVP対象外）

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useAppStore } from '../../store';
import { PersonInlineAddForm } from '../../components/household/PersonInlineAddForm';
import { RELATION_LABELS, calcAge } from '../HouseholdDetailPage/helpers';

interface PersonsPaneProps {
  householdId: string | null;
  householdName?: string;
  selectedPersonId?: string;
  onSelectPerson?: (id: string) => void;
  /** 表示専用モード（カルテタブ）: 追加フォーム・追加ボタンを隠す */
  readOnly?: boolean;
}

export function PersonsPane({
  householdId,
  householdName,
  selectedPersonId = 'all',
  onSelectPerson,
  readOnly = false,
}: PersonsPaneProps) {
  const { persons } = useAppStore();
  const [showForm, setShowForm] = useState(false);

  const hPersons = householdId
    ? persons.filter(p => p.householdId === householdId)
    : [];

  if (!householdId) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-gray-400">
        <p className="text-sm">← 世帯を選択してください</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">
            👪 構成員
          </h2>
          {householdName && (
            <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[160px]">{householdName}</p>
          )}
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UserPlus className="w-3 h-3" />
            {showForm ? '閉じる' : '追加'}
          </button>
        )}
      </div>

      {/* 追加フォーム */}
      {!readOnly && showForm && householdId && (
        <PersonInlineAddForm householdId={householdId} onDone={() => setShowForm(false)} />
      )}

      {/* 構成員リスト */}
      <div className="flex-1 overflow-y-auto">
        {hPersons.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 py-8">
            <p className="text-sm">構成員が登録されていません</p>
            {!readOnly && (
              <button
                onClick={() => setShowForm(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                + 構成員を追加
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {/* 「すべて」行 */}
            <li
              className={`px-3 py-2.5 cursor-pointer transition-colors ${
                selectedPersonId === 'all'
                  ? 'bg-blue-50 border-l-2 border-blue-500'
                  : 'hover:bg-gray-50 border-l-2 border-transparent'
              }`}
              onClick={() => onSelectPerson?.('all')}
            >
              <div className="flex items-center gap-2">
                <span className={`font-medium text-sm ${
                  selectedPersonId === 'all' ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  👥 すべて
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                  全構成員
                </span>
              </div>
            </li>
            {hPersons.map(person => {
              const isSelected = selectedPersonId === person.id;
              return (
                <li
                  key={person.id}
                  className={`px-3 py-2.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border-l-2 border-blue-500'
                      : 'hover:bg-gray-50 border-l-2 border-transparent'
                  }`}
                  onClick={() => onSelectPerson?.(person.id)}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-medium text-sm ${
                      isSelected ? 'text-blue-700' : 'text-gray-900'
                    }`}>
                      {person.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                      {RELATION_LABELS[person.relation]}
                    </span>
                    {person.relation === 'head' && (
                      <span className="text-xs text-yellow-600">👑</span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 flex gap-2 flex-wrap">
                    {person.birthDate && (
                      <span>{person.birthDate}（{calcAge(person.birthDate)}）</span>
                    )}
                    {person.occupation && <span>職業: {person.occupation}</span>}
                    {person.annualIncome !== undefined && (
                      <span className="text-green-700">
                        年収: {person.annualIncome.toLocaleString()}万円
                      </span>
                    )}
                    {person.smoker && (
                      <span className="px-1 py-0.5 bg-orange-50 text-orange-700 rounded">🚬 喫煙</span>
                    )}
                  </div>
                  {person.memo && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{person.memo}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 合計人数フッタ */}
      {hPersons.length > 0 && (
        <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50">
          <p className="text-[10px] text-gray-500">
            {hPersons.length}名登録済み
            {hPersons.some(p => p.annualIncome !== undefined) && (
              <span className="ml-2">
                世帯収入合計:{' '}
                {hPersons
                  .reduce((sum, p) => sum + (p.annualIncome ?? 0), 0)
                  .toLocaleString()}万円
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
