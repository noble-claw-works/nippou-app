// HouseholdMembersBlock.tsx — ①ペイン下段の世帯員ブロック（11/08 指示書 design.md §1.4）
// 選択中世帯の世帯員一覧と、カルテと同じ追加フォーム（PersonInlineAddForm）。編集はカルテで行う。

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useAppStore } from '../../store';
import { PersonInlineAddForm } from '../../components/household/PersonInlineAddForm';
import { RELATION_LABELS, RELATION_ORDER, calcAge } from '../HouseholdDetailPage/helpers';

interface Props {
  householdId: string;
  /** 新規登録直後の世帯なら追加フォームを最初から開く */
  autoOpenAdd?: boolean;
}

export function HouseholdMembersBlock({ householdId, autoOpenAdd = false }: Props) {
  const { persons } = useAppStore();
  // 世帯が替わると親が key で作り直すので、開閉は初期値（新規登録直後だけ開く）に戻る
  const [showForm, setShowForm] = useState(autoOpenAdd);

  const members = persons
    .filter(p => p.householdId === householdId)
    .sort((a, b) => (RELATION_ORDER[a.relation] ?? 99) - (RELATION_ORDER[b.relation] ?? 99));
  const incomeTotal = members.reduce((sum, p) => sum + (p.annualIncome ?? 0), 0);

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">👥 世帯員</h3>
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <UserPlus className="w-3 h-3" />
          {showForm ? '閉じる' : '追加'}
        </button>
      </div>

      {showForm && (
        <PersonInlineAddForm
          householdId={householdId}
          title="世帯員を追加"
          defaultRelation="spouse"
          onDone={() => setShowForm(false)}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        {members.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-gray-400 py-6">
            <p className="text-sm">世帯員が登録されていません</p>
            <button type="button" onClick={() => setShowForm(true)} className="text-xs text-blue-600 hover:underline">
              + 世帯員を追加
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {members.map(p => (
              <li key={p.id} className="px-3 py-2 flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-900 truncate">{p.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded shrink-0">
                  {RELATION_LABELS[p.relation]}
                </span>
                {p.relation === 'head' && <span className="text-xs text-yellow-600">👑</span>}
                {p.birthDate && <span className="text-[10px] text-gray-500">{calcAge(p.birthDate)}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {members.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex justify-between">
          <span>{members.length}名登録済み</span>
          {incomeTotal > 0 && <span>世帯収入合計 {incomeTotal.toLocaleString()}万円</span>}
        </div>
      )}
    </div>
  );
}
