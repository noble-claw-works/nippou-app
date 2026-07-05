import { useState } from 'react';
import { X } from 'lucide-react';
import type { HouseholdType } from '../../types';
import { useAppStore } from '../../store';

// =====================================================
// QuickHouseholdModal — 日報から呼べる世帯クイック作成モーダル
// QuickOpportunityModal の流儀を踏襲
// =====================================================

const TYPE_LABELS: Record<HouseholdType, string> = {
  individual: '個人',
  corporate: '法人',
  prospect: '見込み',
};

export interface QuickHouseholdModalProps {
  onCreated: (customerId: string, opts: { continueToOpportunity: boolean }) => void;
  onClose: () => void;
}

export function QuickHouseholdModal({ onCreated, onClose }: QuickHouseholdModalProps) {
  const { addCustomer, addPerson, updateCustomer, currentUserId, users } = useAppStore();

  const [name, setName] = useState('');
  const [type, setType] = useState<HouseholdType>('individual');
  const [area, setArea] = useState('');
  const [primaryUserId, setPrimaryUserId] = useState(currentUserId);
  const [repName, setRepName] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');

  const activeUsers = users.filter(u => u.status === 'active');

  const handleSubmit = (continueToOpportunity: boolean) => {
    if (!name.trim()) {
      setError('世帯名は必須です');
      return;
    }

    // 世帯を作成
    const newCustomer = addCustomer({
      name: name.trim(),
      type,
      area: area.trim(),
      primaryUserId: primaryUserId || currentUserId,
      familyMemo: '',
      tags: [],
      memo: memo.trim(),
      status: 'active',
    });

    // 代表者名が入力されていれば Person を同時登録して headPersonId を設定
    if (repName.trim()) {
      const head = addPerson(newCustomer.id, {
        name: repName.trim(),
        relation: 'head',
        memo: '',
      });
      updateCustomer(newCustomer.id, { headPersonId: head.id });
    }

    onCreated(newCustomer.id, { continueToOpportunity });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">🏠 新規世帯を作成</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* 世帯名 — 必須 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              世帯名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="例: 田中家、ABC商事"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              autoFocus
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          {/* 区分 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">区分</label>
            <div className="flex gap-2">
              {(['individual', 'corporate', 'prospect'] as HouseholdType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    type === t
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* エリア */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">エリア</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: 渋谷区、新宿エリア"
              value={area}
              onChange={e => setArea(e.target.value)}
            />
          </div>

          {/* 主担当 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">主担当</label>
            <select
              value={primaryUserId}
              onChange={e => setPrimaryUserId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {activeUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* 代表者名 — 任意 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              代表者名 <span className="text-gray-400 text-xs">(任意)</span>
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: 田中 太郎"
              value={repName}
              onChange={e => setRepName(e.target.value)}
            />
          </div>

          {/* メモ — 任意 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メモ <span className="text-gray-400 text-xs">(任意)</span>
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              placeholder="特記事項など"
              value={memo}
              onChange={e => setMemo(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-5 pb-4 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            className="px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg"
          >
            作成して選択
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            className="px-4 py-2 text-sm text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg"
          >
            作成して続けて商談
          </button>
        </div>
      </div>
    </div>
  );
}
