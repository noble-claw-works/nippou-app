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
    <div className="flex flex-col h-full">
      {/* ヘッダ部（全幅） */}
      <div className="px-4 py-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-lg font-bold text-gray-900">📊 ダッシュボード</h1>
        </div>
        {canSeeTeam && (
          <div className="inline-flex gap-1 bg-gray-100 rounded-lg p-1">
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
      {/* コンテンツ（全幅） */}
      <div className="flex-1 overflow-auto">
        {tab === 'personal' ? <SalesDashboardPage /> : <TeamDashboardPage />}
      </div>
    </div>
  );
}
