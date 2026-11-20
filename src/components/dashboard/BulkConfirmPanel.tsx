// =====================================================
// BulkConfirmPanel.tsx - MGR-4 未確認日報の一括確認
// submitted ステータスの日報を選択し、bulkConfirmReports で確認済へ
// =====================================================
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { StatusBadge } from '../ui/StatusBadge';
import type { DailyReport, User } from '../../types';
import { useAppStore } from '../../store';

interface Props {
  reports: DailyReport[];
  users: User[];
}

export function BulkConfirmPanel({ reports, users }: Props) {
  const navigate = useNavigate();
  const { bulkConfirmReports, addToast } = useAppStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const pending = useMemo(
    () => reports.filter(r => r.status === 'submitted')
      .sort((a, b) => a.date.localeCompare(b.date)),
    [reports],
  );

  const allSelected = pending.length > 0 && pending.every(r => selected.has(r.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(pending.map(r => r.id)));
  };
  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const count = bulkConfirmReports(Array.from(selected));
    addToast({ type: 'success', message: `${count} 件の日報を一括確認しました` });
    setSelected(new Set());
    setConfirming(false);
  };

  if (pending.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">✅ 未確認日報の一括確認</h2>
        <p className="text-sm text-gray-400 py-4 text-center">未確認の日報はありません 🎉</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-gray-700">
          ✅ 未確認日報の一括確認 <span className="text-xs text-gray-500">({pending.length} 件)</span>
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleAll}
            className="px-2.5 py-1 text-xs text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {allSelected ? '全解除' : '全選択'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={selected.size === 0}
            className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            aria-label={`選択した ${selected.size} 件を確認済にする`}
          >
            ✓ {selected.size} 件を一括確認
          </button>
        </div>
      </div>
      <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
        {pending.map(r => {
          const user = users.find(u => u.id === r.userId);
          const isChecked = selected.has(r.id);
          return (
            <li key={r.id} className="flex items-center gap-3 py-2 hover:bg-blue-50/40 px-2 rounded">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleOne(r.id)}
                className="w-4 h-4 accent-green-600"
                aria-label={`${user?.name ?? '不明'} ${r.date} を選択`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800">{user?.name ?? '不明'}</span>
                  <span className="text-xs text-gray-500">{format(new Date(r.date), 'M月d日 (E)', { locale: ja })}</span>
                  <StatusBadge status={r.status} />
                  <span className="text-xs text-gray-400">{r.blocks.length} ブロック</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/reports/${r.date}?user=${r.userId}`)}
                className="text-xs text-blue-600 hover:underline flex-shrink-0"
              >
                開く →
              </button>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={handleConfirm}
        title={`${selected.size} 件の日報を一括確認しますか？`}
        message={<p>選択した {selected.size} 件の日報をすべて「確認済」に変更します。</p>}
        confirmLabel="一括確認する"
      />
    </div>
  );
}
