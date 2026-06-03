// =====================================================
// SubmissionStatsTable.tsx - MGR-3 メンバー別 提出率・確認状況 集計テーブル
// 今月の提出/確認件数とそれぞれの率を表示
// =====================================================
import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import type { DailyReport, User } from '../../types';

interface Props {
  reports: DailyReport[];
  users: User[];
  monthDate?: Date;
  onOpenUser?: (userId: string) => void;
}

interface Row {
  user: User;
  submitted: number;
  confirmed: number;
  total: number;
  submitRate: number;
  confirmRate: number;
}

export function SubmissionStatsTable({ reports, users, monthDate, onOpenUser }: Props) {
  const base = monthDate ?? new Date();
  const targetUsers = users.filter(u => ['general', 'manager'].includes(u.role) && u.status === 'active');

  const businessDays = useMemo(() => {
    const days = eachDayOfInterval({ start: startOfMonth(base), end: endOfMonth(base) });
    const today = new Date();
    return days.filter(d => !isWeekend(d) && d <= today).length;
  }, [base]);

  const rows: Row[] = useMemo(() => {
    const ms = format(startOfMonth(base), 'yyyy-MM-dd');
    const me = format(endOfMonth(base), 'yyyy-MM-dd');
    return targetUsers.map(u => {
      const inMonth = reports.filter(r => r.userId === u.id && r.date >= ms && r.date <= me);
      const submitted = inMonth.filter(r => r.status === 'submitted' || r.status === 'confirmed').length;
      const confirmed = inMonth.filter(r => r.status === 'confirmed').length;
      const submitRate = businessDays > 0 ? Math.round((submitted / businessDays) * 100) : 0;
      const confirmRate = submitted > 0 ? Math.round((confirmed / submitted) * 100) : 0;
      return { user: u, submitted, confirmed, total: businessDays, submitRate, confirmRate };
    }).sort((a, b) => b.submitRate - a.submitRate);
  }, [reports, targetUsers, base, businessDays]);

  const teamAvgSubmit = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + r.submitRate, 0) / rows.length)
    : 0;
  const teamAvgConfirm = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + r.confirmRate, 0) / rows.length)
    : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-gray-700">📊 メンバー別 提出率・確認状況（{format(base, 'yyyy年M月')}）</h2>
        <span className="text-xs text-gray-500">営業日 {businessDays} 日基準</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-2 px-3 font-medium text-gray-600">メンバー</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">提出件数</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">提出率</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">確認件数</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">確認率</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const submitColor = r.submitRate >= 90 ? 'text-green-700 bg-green-50' :
                r.submitRate >= 70 ? 'text-blue-700 bg-blue-50' :
                  r.submitRate >= 50 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';
              const confirmColor = r.confirmRate >= 90 ? 'text-green-700 bg-green-50' :
                r.confirmRate >= 70 ? 'text-blue-700 bg-blue-50' :
                  r.confirmRate >= 50 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';
              return (
                <tr key={r.user.id} className="border-t border-gray-100 hover:bg-blue-50/40 transition-colors">
                  <td className="py-2 px-3 font-medium text-gray-800">
                    {onOpenUser ? (
                      <button type="button" onClick={() => onOpenUser(r.user.id)} className="hover:underline">
                        {r.user.name}
                      </button>
                    ) : r.user.name}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.submitted} / {r.total}</td>
                  <td className="py-2 px-3 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-md font-medium ${submitColor}`}>
                      {r.submitRate}%
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.confirmed} / {r.submitted}</td>
                  <td className="py-2 px-3 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-md font-medium ${confirmColor}`}>
                      {r.confirmRate}%
                    </span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-400">対象メンバーがいません</td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t-2 border-gray-200 bg-gray-50">
              <tr>
                <td className="py-2 px-3 font-bold text-gray-700">チーム平均</td>
                <td className="py-2 px-3"></td>
                <td className="py-2 px-3 text-right font-bold text-gray-800">{teamAvgSubmit}%</td>
                <td className="py-2 px-3"></td>
                <td className="py-2 px-3 text-right font-bold text-gray-800">{teamAvgConfirm}%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
