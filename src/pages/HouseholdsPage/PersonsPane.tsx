// PersonsPane.tsx — ②構成員ペイン（追加フォーム含む・工程D）
// 400行以内・追加のみ実装（編集・削除はMVP対象外）

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useAppStore } from '../../store';
import type { PersonRelation } from '../../types';
import { RELATION_LABELS, calcAge } from '../HouseholdDetailPage/helpers';

const RELATION_OPTIONS: { value: PersonRelation; label: string }[] = [
  { value: 'head', label: '世帯主' },
  { value: 'spouse', label: '配偶者' },
  { value: 'child', label: '子' },
  { value: 'parent', label: '親' },
  { value: 'sibling', label: '兄弟姉妹' },
  { value: 'other', label: 'その他' },
];

interface AddPersonForm {
  name: string;
  relation: PersonRelation;
  annualIncome: string; // 入力欄は文字列、保存時に数値変換
}

const DEFAULT_FORM: AddPersonForm = {
  name: '',
  relation: 'spouse',
  annualIncome: '',
};

interface PersonsPaneProps {
  householdId: string | null;
  householdName?: string;
  selectedPersonId?: string;
  onSelectPerson?: (id: string) => void;
}

export function PersonsPane({
  householdId,
  householdName,
  selectedPersonId = 'all',
  onSelectPerson,
}: PersonsPaneProps) {
  const { persons, addPerson, addToast } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddPersonForm>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const hPersons = householdId
    ? persons.filter(p => p.householdId === householdId)
    : [];

  const handleAdd = () => {
    if (!householdId) return;
    if (!form.name.trim()) {
      addToast({ type: 'error', message: '名前を入力してください' });
      return;
    }
    setSubmitting(true);
    try {
      const incomeNum = form.annualIncome ? Number(form.annualIncome) : undefined;
      addPerson(householdId, {
        name: form.name.trim(),
        relation: form.relation,
        annualIncome: incomeNum && !isNaN(incomeNum) ? incomeNum : undefined,
        memo: '',
      });
      addToast({ type: 'success', message: `${form.name.trim()} を追加しました` });
      setForm(DEFAULT_FORM);
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

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
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <UserPlus className="w-3 h-3" />
          {showForm ? '閉じる' : '追加'}
        </button>
      </div>

      {/* 追加フォーム */}
      {showForm && (
        <div className="px-3 py-3 border-b border-blue-100 bg-blue-50">
          <p className="text-xs font-semibold text-blue-700 mb-2">構成員を追加</p>
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">
                名前 <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="例: 山田 花子"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">続柄</label>
              <div className="flex flex-wrap gap-1">
                {RELATION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, relation: opt.value }))}
                    className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                      form.relation === opt.value
                        ? 'bg-blue-100 border-blue-400 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">
                年収（万円）
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={form.annualIncome}
                  onChange={e => setForm(f => ({ ...f, annualIncome: e.target.value }))}
                  placeholder="例: 500"
                  min={0}
                  className="w-32 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <span className="text-xs text-gray-500">万円</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(DEFAULT_FORM); }}
                className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!form.name.trim() || submitting}
                className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                追加する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 構成員リスト */}
      <div className="flex-1 overflow-y-auto">
        {hPersons.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 py-8">
            <p className="text-sm">構成員が登録されていません</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-xs text-blue-600 hover:underline"
            >
              + 構成員を追加
            </button>
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
