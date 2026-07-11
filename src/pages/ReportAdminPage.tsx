import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { ForbiddenState } from '../components/ui/EmptyState';
import { MOOD_EMOJIS, formatDate } from '../utils';
import { format, subDays } from 'date-fns';
import { SubmissionStatsTable } from '../components/dashboard/SubmissionStatsTable';
import { BulkConfirmPanel } from '../components/dashboard/BulkConfirmPanel';
import { TodoProgressPanel } from '../components/dashboard/TodoProgressPanel';
import { SummaryReportPanel } from '../components/dashboard/SummaryReportPanel';

export function ReportAdminPage() {
  const { currentRole, reports, users, policies } = useAppStore();
  const navigate = useNavigate();

  if (currentRole !== 'manager' && currentRole !== 'executive' && currentRole !== 'admin') {
    return <div className="px-4 py-8"><ForbiddenState /></div>;
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const submittedToday = reports.filter(r => r.date === today && r.status === 'submitted').length;
  const unconfirmedCount = reports.filter(r => ['submitted'].includes(r.status)).length;
  const totalThisMonth = reports.filter(r => r.date.startsWith(format(new Date(), 'yyyy-MM'))).length;
  const confirmedThisMonth = reports.filter(r => r.date.startsWith(format(new Date(), 'yyyy-MM')) && r.status === 'confirmed').length;
  const submitRate = totalThisMonth > 0 ? Math.round((confirmedThisMonth / totalThisMonth) * 100) : 0;

  const teamUsers = users.filter(u => ['general', 'manager'].includes(u.role));

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">📋 日報管理</h1>
        {/* MGR-5: 上長自身も自分の日報を作れるよう導線を設ける */}
        <button
          onClick={() => navigate('/today?self=1')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          aria-label="自分の日報を書く"
        >
          ✍️ 自分の日報を書く
        </button>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-orange-200 p-4">
          <p className="text-xs text-orange-600 font-medium mb-1">⚠ 未確認</p>
          <p className="text-2xl font-bold text-orange-700">{unconfirmedCount} 件</p>
          <button onClick={() => navigate('/search?status=submitted&auto=1')}
            className="text-xs text-orange-600 hover:underline mt-1">一覧を開く →</button>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <p className="text-xs text-blue-600 font-medium mb-1">📊 本日提出済</p>
          <p className="text-2xl font-bold text-blue-700">{submittedToday} 件</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-600 font-medium mb-1">📈 今月確認率</p>
          <p className="text-2xl font-bold text-gray-700">{submitRate}%</p>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${submitRate}%` }} />
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">👥 メンバー別ヒートマップ（直近14日）</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left py-1 pr-3 text-gray-500 min-w-[100px]">メンバー</th>
                {Array.from({ length: 14 }).map((_, i) => {
                  const d = subDays(new Date(), 13 - i);
                  return (
                    <th key={i} className="px-1 py-1 text-center text-gray-400 min-w-[44px]">
                      {format(d, 'M/d')}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {teamUsers.map(user => (
                <tr key={user.id} className="border-t border-gray-50">
                  <td className="py-2 pr-3 font-medium text-gray-700">{user.name}</td>
                  {Array.from({ length: 14 }).map((_, i) => {
                    const d = subDays(new Date(), 13 - i);
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const report = reports.find(r => r.userId === user.id && r.date === dateStr);
                    const dow = d.getDay();
                    if (dow === 0 || dow === 6) {
                      return <td key={i} className="px-1 py-2 text-center text-gray-100">休</td>;
                    }
                    return (
                      <td key={i} className="px-1 py-2 text-center">
                        {report ? (
                          <button
                            type="button"
                            className="text-base cursor-pointer hover:bg-blue-50 rounded-full w-7 h-7 inline-flex items-center justify-center transition-colors"
                            title={`${formatDate(dateStr)} の日報を開く`}
                            aria-label={`${user.name} ${dateStr} の日報`}
                            onClick={() => navigate(`/reports/${dateStr}?user=${user.id}`)}
                          >
                            {report.eveningMood ? MOOD_EMOJIS[report.eveningMood] : '📄'}
                          </button>
                        ) : (
                          <span className="text-gray-200">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MGR-4: 未確認日報の一括確認 */}
      <BulkConfirmPanel reports={reports} users={users} />

      {/* MGR-3: メンバー別提出率・確認状況集計 */}
      <SubmissionStatsTable
        reports={reports}
        users={users}
        onOpenUser={(userId) => navigate(`/search?user=${userId}&auto=1`)}
      />

      {/* MGR-5 + DEAD-1: 部下別 TODO 進捗・期限切れ警告 */}
      <TodoProgressPanel
        reports={reports}
        users={users}
        onOpenUserReport={(userId, date) => navigate(`/reports/${date}?user=${userId}`)}
      />

      {/* MGR-6: 週次・月次サマリーレポート */}
      <SummaryReportPanel reports={reports} users={users} />

      {/* Phase 3: 契約統計 (executive/admin のみ) */}
      {(currentRole === 'executive' || currentRole === 'admin') ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {/* 契約ステータス分布 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">📜 契約ステータス分布</h2>
            {(['inforce', 'pending', 'paid_up', 'lapsed', 'surrendered', 'matured', 'reduced'] as const).map(status => {
              const count = policies.filter(p => p.status === status).length;
              const total = policies.length;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const labels: Record<string, string> = {
                inforce: '✅ 有効中', pending: '⏳ 申込中', paid_up: '💰 払済',
                lapsed: '⚠️ 失効', surrendered: '❌ 解約', matured: '🎉 満期', reduced: '📉 減額',
              };
              if (count === 0) return null;
              return (
                <div key={status} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-600 w-20 shrink-0">{labels[status]}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>

          {/* 保険会社別契約数 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">🏢 保険会社別契約数</h2>
            {(() => {
              const counts: Record<string, number> = {};
              for (const p of policies.filter(q => q.status === 'inforce')) {
                counts[p.insurer] = (counts[p.insurer] ?? 0) + 1;
              }
              const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
              const max = sorted[0]?.[1] ?? 1;
              return sorted.map(([insurer, count]) => (
                <div key={insurer} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-600 w-28 shrink-0 truncate">{insurer}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-green-400 h-2 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      ) : null}
    </div>
  );
}
