// =====================================================
// NippouPage — 日報＋カレンダー＋日報一覧 統合タブ (IA-2 + D3)
// - 「日報」(Today) / 「カレンダー」/ 「日報一覧」をタブで切替
// - /today, /calendar への直アクセスは初期タブ選択で吸収
// =====================================================
import { useSearchParams } from 'react-router-dom';
import { TodayPage } from './TodayPage';
import { CalendarPage } from './CalendarPage';
import { NippouListPage } from './NippouListPage';

type NippouTab = 'today' | 'calendar' | 'list';

export function NippouPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get('tab');
  const tab: NippouTab =
    raw === 'calendar' ? 'calendar' : raw === 'list' ? 'list' : 'today';

  const setTab = (t: NippouTab) =>
    setSearchParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (t === 'today') {
          n.delete('tab');
        } else {
          n.set('tab', t);
        }
        return n;
      },
      { replace: true },
    );

  return (
    <div className="flex flex-col h-full">
      {/* 上部タブバー */}
      <div className="bg-white border-b border-gray-200 px-4 flex-shrink-0">
        <nav className="flex gap-1">
          <button
            onClick={() => setTab('today')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'today'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            日報
          </button>
          <button
            onClick={() => setTab('calendar')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'calendar'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            カレンダー
          </button>
          <button
            onClick={() => setTab('list')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'list'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            日報一覧
          </button>
        </nav>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-auto">
        {tab === 'today' ? (
          <TodayPage />
        ) : tab === 'calendar' ? (
          <CalendarPage />
        ) : (
          <NippouListPage />
        )}
      </div>
    </div>
  );
}
