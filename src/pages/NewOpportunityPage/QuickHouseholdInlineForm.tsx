// QuickHouseholdInlineForm.tsx — ①ペイン内で新規世帯を 3 項目で登録する（11/08 指示書 A3・D1）
// 世帯名・区分・主担当だけ。登録と同時に世帯名の世帯主 1 名を作る（createHouseholdWithHead）。

import { useState } from 'react';
import { useAppStore } from '../../store';
import type { CustomerType } from '../../types/core';
import { createHouseholdWithHead } from '../../utils/createHouseholdWithHead';

interface Props {
  initialName: string;
  onCreated: (householdId: string) => void;
  onCancel: () => void;
}

const TYPE_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: 'individual', label: '個人' },
  { value: 'corporate', label: '法人' },
];

export function QuickHouseholdInlineForm({ initialName, onCreated, onCancel }: Props) {
  const { users, currentUserId, addCustomer, addPerson, updateCustomer, addToast } = useAppStore();
  const activeUsers = users.filter(u => u.status === 'active');
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<CustomerType>('individual');
  const [primaryUserId, setPrimaryUserId] = useState(currentUserId);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    const id = createHouseholdWithHead(
      { addCustomer, addPerson, updateCustomer },
      { name, type, primaryUserId },
    );
    setSubmitting(false);
    if (!id) {
      addToast({ type: 'error', message: '世帯の登録に失敗しました' });
      return;
    }
    addToast({ type: 'success', message: `${name.trim()} を登録しました（世帯主を自動登録）` });
    onCreated(id);
  };

  return (
    <div className="px-3 py-3 border-b border-blue-100 bg-blue-50 space-y-2">
      <p className="text-xs font-semibold text-blue-700">新規世帯を登録</p>
      <div>
        <label htmlFor="qh-name" className="block text-[10px] text-gray-500 mb-0.5">
          世帯名 <span className="text-red-500">*</span>
        </label>
        <input
          id="qh-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="例: 山田 太郎"
          className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          autoFocus
        />
      </div>
      <fieldset>
        <legend className="block text-[10px] text-gray-500 mb-0.5">区分</legend>
        <div className="flex gap-3">
          {TYPE_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-1 text-sm text-gray-700">
              <input
                type="radio"
                name="qh-type"
                value={opt.value}
                checked={type === opt.value}
                onChange={() => setType(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="qh-owner" className="block text-[10px] text-gray-500 mb-0.5">主担当</label>
        <select
          id="qh-owner"
          value={primaryUserId}
          onChange={e => setPrimaryUserId(e.target.value)}
          className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {activeUsers.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!name.trim() || submitting}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          登録して案件へ進む
        </button>
      </div>
    </div>
  );
}
