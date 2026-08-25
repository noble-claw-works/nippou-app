// =====================================================
// DashboardWithPerfPage — ダッシュボード＋営業実績 統合タブ (IA-1)
// - 上部タブ「ダッシュボード」/「営業実績」で切替
// - 全幅レイアウト（SalesPerfPage 準拠）
// - /sales-perf への直アクセスは tab=salesperf 初期選択で吸収
// =====================================================
import { useSearchParams, Navigate } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { SalesPerfPage } from '../features/salesPerf/SalesPerfPage';

type DashTab = 'dashboard' | 'salesperf';

export function DashboardWithPerfPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get('tab');
  const tab: DashTab = raw === 'salesperf' ? 'salesperf' : 'dashboard';

  const setTab = (t: DashTab) =>
    setSearchParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (t === 'dashboard') {
          n.delete('tab');
        } else {
          n.set('tab', t);
        }
        return n;
      },
      { replace: true },
    );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* 上部タブバー */}
      <div className="bg-white border-b border-gray-200 px-4 flex-shrink-0">
        <nav className="flex gap-1">
          <button
            onClick={() => setTab('dashboard')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'dashboard'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ダッシュボード
          </button>
          <button
            onClick={() => setTab('salesperf')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'salesperf'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            営業実績
          </button>
        </nav>
      </div>

      {/* コンテンツ（全幅） */}
      <div className="flex-1 overflow-auto">
        {tab === 'dashboard' ? <DashboardPage /> : <SalesPerfPage />}
      </div>
    </div>
  );
}

/**
 * /sales-perf への直アクセスを /dashboard?tab=salesperf へリダイレクト
 */
export function SalesPerfRedirect() {
  return <Navigate to="/dashboard?tab=salesperf" replace />;
}
