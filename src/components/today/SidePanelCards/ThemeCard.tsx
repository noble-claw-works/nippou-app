import type { SidePanelCardsProps } from "../SidePanelCards";

type ThemeCardProps = Pick<SidePanelCardsProps, "report" | "onUpdateReport">;

export function ThemeCard({ report, onUpdateReport }: ThemeCardProps) {
  const done = !!(
    report.mainTheme?.trim() ||
    report.dailyTheme?.trim() ||
    report.monthlyTheme?.trim()
  );
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">🎯 テーマ</span>
        {done ? (
          <span className="text-xs bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">
            ✓ 入力済
          </span>
        ) : (
          <span className="text-xs bg-gray-100 text-gray-400 rounded-full px-1.5 py-0.5">
            未入力
          </span>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            📌 メインテーマ（中長期）
          </label>
          <input
            type="text"
            value={report.mainTheme ?? ""}
            onChange={(e) => onUpdateReport({ mainTheme: e.target.value })}
            placeholder="中長期的なテーマを入力"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            今日のテーマ
          </label>
          <input
            type="text"
            value={report.dailyTheme ?? ""}
            onChange={(e) => onUpdateReport({ dailyTheme: e.target.value })}
            placeholder="今日取り組むテーマを入力"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            今月のテーマ
          </label>
          <input
            type="text"
            value={report.monthlyTheme ?? ""}
            onChange={(e) => onUpdateReport({ monthlyTheme: e.target.value })}
            placeholder="今月の目標テーマを入力"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
