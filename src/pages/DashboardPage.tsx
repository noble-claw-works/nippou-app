// =====================================================
// DashboardPage — 統合ダッシュボード（個人/チームタブ）
// =====================================================
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { SalesDashboardPage } from './SalesDashboardPage';
import { TeamDashboardPage } from './TeamDashboardPage';

type Tab = 'personal' | 'team';

export function DashboardPage() {
  const currentRole = useAppStore(s => s.currentRole);
  const [searchParams, setSearchParams] = useSearchParams();
  const canSeeTeam = currentRole !== 'general';

  const raw = searchParams.get('tab');
  const tab: Tab = (raw === 'team' && canSeeTeam) ? 'team' : 'personal';

  const setTab = (t: Tab) =>
    setSearchParams(p => {
      const n = new URLSearchParams(p);
      n.set('tab', t);
      return n;
    });

  return (
    <div>
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-lg font-bold text-gray-900">📊 ダッシュボード</h1>
        </div>
        {canSeeTeam && (
          <div className="inline-flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTab('personal')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                tab === 'personal'
                  ? 'bg-white text-blue-700 font-medium shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              個人
            </button>
            <button
              onClick={() => setTab('team')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                tab === 'team'
                  ? 'bg-white text-blue-700 font-medium shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              チーム
            </button>
          </div>
        )}
      </div>
      {tab === 'personal' ? <SalesDashboardPage /> : <TeamDashboardPage />}
    </div>
  );
}
