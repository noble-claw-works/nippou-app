import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { ForbiddenState } from '../components/ui/EmptyState';
import { MOOD_EMOJIS, formatDate } from '../utils';
import { format, subDays } from 'date-fns';

export function DashboardPage() {
  const { currentRole, reports, users, addToast } = useAppStore();
  const navigate = useNavigate();

  if (currentRole !== 'manager' && currentRole !== 'executive') {
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
      <h1 className="text-lg font-bold text-gray-900 mb-4">📊 ダッシュボード</h1>

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
    </div>
  );
}
