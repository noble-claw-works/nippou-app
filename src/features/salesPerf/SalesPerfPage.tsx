// =====================================================
// SalesPerfPage.tsx — 営業実績ダッシュボード v1 ルート
// T0-5: プレースホルダ実装 (7画面サブナビの器 + GlobalFilterBar 枠)
// =====================================================
import { useState } from 'react';
import { TrendingUp, BarChart2, Activity, Share2, Building2, Heart, FileText } from 'lucide-react';

// ----------------------------------------
// サブ画面定義
// ----------------------------------------
const SCREENS = [
  { id: 's1', label: 'サマリー',      icon: TrendingUp  },
  { id: 's2', label: '予算・目標',    icon: BarChart2   },
  { id: 's3', label: 'プロセス',      icon: Activity    },
  { id: 's4', label: 'チャネル',      icon: Share2      },
  { id: 's5', label: '保険会社・種目', icon: Building2  },
  { id: 's6', label: 'ライフプラン',  icon: Heart       },
  { id: 's7', label: '契約明細',      icon: FileText    },
] as const;

type ScreenId = typeof SCREENS[number]['id'];

// ----------------------------------------
// GlobalFilterBar プレースホルダ
// ----------------------------------------
function GlobalFilterBar() {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600">
      <span className="font-medium text-gray-700">🔍 グローバルフィルタ</span>
      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">商品ライン: 両方</span>
      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">FY2025</span>
      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">通年</span>
      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">確定＋S＋A</span>
      <span className="ml-auto text-xs text-gray-400">※ P1 フィルタ実装予定</span>
    </div>
  );
}

// ----------------------------------------
// DataQualityBadge プレースホルダ
// ----------------------------------------
function DataQualityBadge() {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">集計 320件</span>
      <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded border border-yellow-200">
        ⚠ 要確認 15件
      </span>
    </div>
  );
}

// ----------------------------------------
// 画面プレースホルダ
// ----------------------------------------
function ScreenPlaceholder({ screenId, label }: { screenId: ScreenId; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
      <div className="text-5xl mb-4">📊</div>
      <div className="text-lg font-medium text-gray-500 mb-2">{label} 画面</div>
      <div className="text-sm">{screenId.toUpperCase()} — P1 フェーズで実装予定</div>
    </div>
  );
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
          <DataQualityBadge />
        </div>
        {/* グローバルフィルタ */}
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
      <div className="flex-1 overflow-auto p-4">
        {SCREENS.map(({ id, label }) =>
          activeScreen === id ? (
            <ScreenPlaceholder key={id} screenId={id} label={label} />
          ) : null,
        )}
      </div>
    </div>
  );
}
