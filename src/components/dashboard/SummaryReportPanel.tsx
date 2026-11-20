// =====================================================
// SummaryReportPanel.tsx - MGR-6 週次・月次サマリーレポート
// =====================================================
import { useMemo, useState } from 'react';
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subWeeks, subMonths, isWeekend, eachDayOfInterval,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { BLOCK_LABELS } from '../../utils';
import type { DailyReport, User, BlockType } from '../../types';

type Period = 'week' | 'month';

interface Props {
  reports: DailyReport[];
  users: User[];
}

interface Summary {
  totalReports: number;
  submittedReports: number;
  confirmedReports: number;
  totalMembers: number;
  activeMembers: number;
  totalBlocks: number;
  totalTodos: number;
  doneTodos: number;
  uniqueCustomers: number;
  blockBreakdown: Record<BlockType, number>;
  topMembers: Array<{ user: User; count: number }>;
}

function calcSummary(reports: DailyReport[], users: User[], start: Date, end: Date): Summary {
  const ms = format(start, 'yyyy-MM-dd');
  const me = format(end, 'yyyy-MM-dd');
  const inRange = reports.filter(r => r.date >= ms && r.date <= me);

  const businessDays = eachDayOfInterval({ start, end }).filter(d => !isWeekend(d)).length;
  const targetUsers = users.filter(u => ['general', 'manager'].includes(u.role) && u.status === 'active');
  const expectedTotal = businessDays * targetUsers.length;

  const submittedReports = inRange.filter(r => r.status === 'submitted' || r.status === 'confirmed').length;
  const confirmedReports = inRange.filter(r => r.status === 'confirmed').length;
  const activeMemberIds = new Set(inRange.map(r => r.userId));

  const totalBlocks = inRange.reduce((s, r) => s + r.blocks.length, 0);
  const totalTodos = inRange.reduce((s, r) => s + r.todos.length, 0);
  const doneTodos = inRange.reduce(
    (s, r) => s + r.todos.filter(t => t.status === 'done' || t.completed).length,
    0,
  );

  const uniqueCustomers = new Set<string>();
  inRange.forEach(r => r.blocks.forEach(b => { if (b.customerId) uniqueCustomers.add(b.customerId); }));

  const blockBreakdown: Record<BlockType, number> = {
    visit: 0, office: 0, phone: 0, travel: 0, break: 0, meeting: 0, lunch: 0,
  };
  inRange.forEach(r => r.blocks.forEach(b => { blockBreakdown[b.type] = (blockBreakdown[b.type] ?? 0) + 1; }));

  const counts = new Map<string, number>();
  inRange.forEach(r => counts.set(r.userId, (counts.get(r.userId) ?? 0) + 1));
  const topMembers = Array.from(counts.entries())
    .map(([uid, count]) => ({ user: users.find(u => u.id === uid)!, count }))
    .filter(x => x.user)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalReports: expectedTotal,
    submittedReports,
    confirmedReports,
    totalMembers: targetUsers.length,
    activeMembers: activeMemberIds.size,
    totalBlocks,
    totalTodos,
    doneTodos,
    uniqueCustomers: uniqueCustomers.size,
    blockBreakdown,
    topMembers,
  };
}

export function SummaryReportPanel({ reports, users }: Props) {
  const [period, setPeriod] = useState<Period>('week');
  const [offset, setOffset] = useState(0);

  const { start, end, label } = useMemo(() => {
    const now = new Date();
    if (period === 'week') {
      const base = subWeeks(now, offset);
      const s = startOfWeek(base, { weekStartsOn: 1 });
      const e = endOfWeek(base, { weekStartsOn: 1 });
      return { start: s, end: e, label: `${format(s, 'M/d')} – ${format(e, 'M/d')}` };
    }
    const base = subMonths(now, offset);
    const s = startOfMonth(base);
    const e = endOfMonth(base);
    return { start: s, end: e, label: format(s, 'yyyy年M月', { locale: ja }) };
  }, [period, offset]);

  const sum = useMemo(() => calcSummary(reports, users, start, end), [reports, users, start, end]);

  const submitRate = sum.totalReports > 0 ? Math.round((sum.submittedReports / sum.totalReports) * 100) : 0;
  const confirmRate = sum.submittedReports > 0 ? Math.round((sum.confirmedReports / sum.submittedReports) * 100) : 0;
  const todoCompletionRate = sum.totalTodos > 0 ? Math.round((sum.doneTodos / sum.totalTodos) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-gray-700">📈 サマリーレポート ({label})</h2>
        <div className="flex gap-2 items-center">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(['week', 'month'] as Period[]).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => { setPeriod(p); setOffset(0); }}
                className={`px-3 py-1 text-xs rounded ${period === p ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500'}`}
                aria-pressed={period === p}
              >
                {p === 'week' ? '週次' : '月次'}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={() => setOffset(o => o + 1)}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
              aria-label={period === 'week' ? '前週' : '前月'}>
              ←
            </button>
            <button type="button" onClick={() => setOffset(0)}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">
              今
            </button>
            <button type="button" onClick={() => setOffset(o => Math.max(0, o - 1))}
              disabled={offset === 0}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
              aria-label={period === 'week' ? '翌週' : '翌月'}>
              →
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <Metric label="提出率" value={`${submitRate}%`} sub={`${sum.submittedReports}/${sum.totalReports} 件`} tone={submitRate >= 80 ? 'good' : submitRate >= 50 ? 'mid' : 'bad'} />
        <Metric label="確認率" value={`${confirmRate}%`} sub={`${sum.confirmedReports}/${sum.submittedReports} 件`} tone={confirmRate >= 80 ? 'good' : confirmRate >= 50 ? 'mid' : 'bad'} />
        <Metric label="活動メンバー" value={`${sum.activeMembers}`} sub={`/ ${sum.totalMembers} 名`} tone="neutral" />
        <Metric label="TODO 完了率" value={`${todoCompletionRate}%`} sub={`${sum.doneTodos}/${sum.totalTodos} 件`} tone={todoCompletionRate >= 70 ? 'good' : todoCompletionRate >= 40 ? 'mid' : 'bad'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">📊 アクティビティ分布</p>
          <div className="space-y-1.5">
            {(Object.keys(sum.blockBreakdown) as BlockType[])
              .filter(t => sum.blockBreakdown[t] > 0)
              .sort((a, b) => sum.blockBreakdown[b] - sum.blockBreakdown[a])
              .map(t => {
                const pct = sum.totalBlocks > 0 ? Math.round((sum.blockBreakdown[t] / sum.totalBlocks) * 100) : 0;
                return (
                  <div key={t} className="flex items-center gap-2 text-xs">
                    <span className="w-16 text-gray-700">{BLOCK_LABELS[t]}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-12 text-right tabular-nums text-gray-600">{sum.blockBreakdown[t]} ({pct}%)</span>
                  </div>
                );
              })}
            {sum.totalBlocks === 0 && <p className="text-xs text-gray-400">記録なし</p>}
          </div>
          <p className="mt-2 text-xs text-gray-500">訪問顧客数: <span className="font-medium text-gray-800">{sum.uniqueCustomers} 社</span></p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">🏆 提出件数 TOP 5</p>
          <ol className="space-y-1.5">
            {sum.topMembers.map((m, i) => (
              <li key={m.user.id} className="flex items-center gap-2 text-xs">
                <span className="w-5 text-center font-bold text-gray-500">{i + 1}</span>
                <span className="flex-1 text-gray-800">{m.user.name}</span>
                <span className="tabular-nums text-gray-600">{m.count} 件</span>
              </li>
            ))}
            {sum.topMembers.length === 0 && <li className="text-xs text-gray-400">記録なし</li>}
          </ol>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'good' | 'mid' | 'bad' | 'neutral' }) {
  const cls = tone === 'good' ? 'bg-green-50 border-green-200 text-green-800' :
    tone === 'mid' ? 'bg-amber-50 border-amber-200 text-amber-800' :
      tone === 'bad' ? 'bg-red-50 border-red-200 text-red-800' :
        'bg-gray-50 border-gray-200 text-gray-800';
  return (
    <div className={`border rounded-lg px-3 py-2 ${cls}`}>
      <p className="text-[10px] font-medium opacity-80">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-[10px] opacity-70 tabular-nums">{sub}</p>
    </div>
  );
}
