// =====================================================
// SalesPerfPage.tsx — 営業実績ダッシュボード v1 ルート
// T1-1/T1-2: GlobalFilterBar / DataQualityBadge 実装
// P4: S1〜S7 全画面結線完了
// =====================================================
import { useState } from 'react';
import { TrendingUp, BarChart2, Activity, Share2, Building2, Heart, FileText } from 'lucide-react';
import { GlobalFilterBar } from './components/GlobalFilterBar';
import { DataQualityBadge } from './components/DataQualityBadge';
import { S1Summary } from './pages/S1Summary';
import { S2BudgetTarget } from './components/screens/S2BudgetTarget';
import { S3Process } from './components/screens/S3Process';
import { S4Channel } from './components/screens/S4Channel';
import { S5InsurerType } from './components/screens/S5InsurerType';
import { S6LifePlan } from './components/screens/S6LifePlan';
import { S7ContractDetail } from './components/screens/S7ContractDetail';

// ----------------------------------------
// サブ画面定義
// ----------------------------------------
const SCREENS = [
  { id: 's1', label: 'サマリー',       icon: TrendingUp  },
  { id: 's2', label: '予算・目標',     icon: BarChart2   },
  { id: 's3', label: 'プロセス',       icon: Activity    },
  { id: 's4', label: 'チャネル',       icon: Share2      },
  { id: 's5', label: '保険会社・種目', icon: Building2   },
  { id: 's6', label: 'ライフプラン',   icon: Heart       },
  { id: 's7', label: '契約明細',       icon: FileText    },
] as const;

type ScreenId = typeof SCREENS[number]['id'];

// ----------------------------------------
// 画面レンダラー (S1〜S7 全結線済)
// ----------------------------------------
function renderScreen(screenId: ScreenId) {
  switch (screenId) {
    case 's1': return <S1Summary />;
    case 's2': return <S2BudgetTarget />;
    case 's3': return <S3Process />;
    case 's4': return <S4Channel />;
    case 's5': return <S5InsurerType />;
    case 's6': return <S6LifePlan />;
    case 's7': return <S7ContractDetail />;
    default: return null;
  }
}

// ----------------------------------------
// SalesPerfPage
// ----------------------------------------
export function SalesPerfPage() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('s1');

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* ページヘッダー */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            営業実績ダッシュボード
          </h1>
          {/* DataQualityBadge: フィルタ連動・常時表示 */}
          <DataQualityBadge />
        </div>
        {/* GlobalFilterBar: 全画面共通フィルタ */}
        <GlobalFilterBar />
      </div>

      {/* サブナビ */}
      <div className="bg-white border-b border-gray-200 px-4 flex-shrink-0 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {SCREENS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveScreen(id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeScreen === id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* コンテンツ */}
      {/* key=activeScreen: タブ切替でサブツリーを再マウントさせ、画面間のフック数不一致(React #185)を回避 */}
      <div className="flex-1 overflow-auto p-4">
        <div key={activeScreen}>{renderScreen(activeScreen)}</div>
      </div>
    </div>
  );
}
