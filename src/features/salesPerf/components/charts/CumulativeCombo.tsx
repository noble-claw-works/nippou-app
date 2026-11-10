// =====================================================
// CumulativeCombo.tsx — S2専用: 累計予算 vs 確定累計 + 月次差額バー
// recharts 3.9.2 (ComposedChart)
// =====================================================
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { CumulativeComboPoint } from '../../lib/salesPerfMetrics';
import { formatAmount, formatPercent } from '../../lib/format';

// ----------------------------------------
// 定数
// ----------------------------------------
const COLOR_CUM_BUDGET = '#94a3b8'; // slate-400
const COLOR_CUM_ACTUAL = '#3b82f6'; // blue-500
const COLOR_GAP_POS    = '#22c55e'; // green-500 (実績 > 予算)
const COLOR_GAP_NEG    = '#ef4444'; // red-500   (実績 < 予算)

// ----------------------------------------
// カスタムツールチップ
// ----------------------------------------
interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  showMillions: boolean;
}

function CustomTooltip({ active, payload, label, showMillions }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs min-w-[200px]">
      <p className="font-semibold text-gray-700 mb-2 border-b border-gray-100 pb-1">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex justify-between gap-4 mb-1">
          <span className="flex items-center gap-1 text-gray-600">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}
          </span>
          <span className="font-medium text-gray-800">
            {formatAmount(entry.value, showMillions)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------
// Props
// ----------------------------------------
interface CumulativeComboProps {
  data: CumulativeComboPoint[];
  showMillions?: boolean;
  /** px単位の高さ (デフォルト300) */
  height?: number;
}

// ----------------------------------------
// 金額軸フォーマッタ
// ----------------------------------------
function yFormatter(value: number, showMillions: boolean): string {
  if (showMillions) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  // 万円単位で省略
  if (Math.abs(value) >= 10_000) {
    return `${Math.round(value / 10_000)}万`;
  }
  return String(value);
}

// ----------------------------------------
// コンポーネント
// ----------------------------------------
export function CumulativeCombo({
  data,
  showMillions = false,
  height = 300,
}: CumulativeComboProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        データがありません
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          tickFormatter={(v) => yFormatter(v, showMillions)}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          width={60}
        />
        <Tooltip
          content={
            <CustomTooltip showMillions={showMillions} />
          }
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />

        {/* 月次差額バー (実績−予算, 正=緑/負=赤) */}
        <Bar
          dataKey="gap"
          name="月次差額"
          maxBarSize={20}
          radius={[2, 2, 0, 0]}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-gap-${index}`}
              fill={entry.gap >= 0 ? COLOR_GAP_POS : COLOR_GAP_NEG}
              fillOpacity={0.7}
            />
          ))}
        </Bar>

        {/* 累計予算ライン */}
        <Line
          type="monotone"
          dataKey="cumBudget"
          name="累計予算"
          stroke={COLOR_CUM_BUDGET}
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={false}
          activeDot={{ r: 4, fill: COLOR_CUM_BUDGET }}
        />

        {/* 確定累計ライン */}
        <Line
          type="monotone"
          dataKey="cumActual"
          name="確定累計"
          stroke={COLOR_CUM_ACTUAL}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: COLOR_CUM_ACTUAL }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ----------------------------------------
// 上期/下期 集計サマリー小コンポーネント
// ----------------------------------------
interface HalfYearSummaryProps {
  data: CumulativeComboPoint[];
  label: string;
  monthRange: number[]; // 会計月 1-12
  showMillions: boolean;
}

function HalfYearSummary({ data, label, monthRange, showMillions }: HalfYearSummaryProps) {
  const slice = data.filter(d => monthRange.includes(d.month));
  const totalActual = slice.reduce((s, d) => s + d.monthlyActual, 0);
  const totalBudget = slice.reduce((s, d) => s + d.monthlyBudget, 0);
  const progressRate =
    totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : null;
  const achieved = totalBudget > 0 && totalActual >= totalBudget;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${achieved ? 'text-green-600' : 'text-red-600'}`}>
        {formatAmount(totalActual, showMillions)}
      </span>
      <span className="text-xs text-gray-400">
        予算: {formatAmount(totalBudget, showMillions)}
        {progressRate !== null && (
          <span className={`ml-1 ${achieved ? 'text-green-600' : 'text-red-500'}`}>
            ({formatPercent(Number(progressRate))})
          </span>
        )}
      </span>
    </div>
  );
}

// ----------------------------------------
// CumulativeComboPanel: チャート + 上下期サマリー
// ----------------------------------------
interface CumulativeComboPanelProps {
  data: CumulativeComboPoint[];
  showMillions?: boolean;
  height?: number;
}

export function CumulativeComboPanel({
  data,
  showMillions = false,
  height = 300,
}: CumulativeComboPanelProps) {
  const h1Months = [1, 2, 3, 4, 5, 6];
  const h2Months = [7, 8, 9, 10, 11, 12];
  const allActual = data.reduce((s, d) => s + d.monthlyActual, 0);
  const allBudget = data.reduce((s, d) => s + d.monthlyBudget, 0);
  const annualProgress =
    allBudget > 0 ? ((allActual / allBudget) * 100).toFixed(1) : null;
  const annualAchieved = allBudget > 0 && allActual >= allBudget;

  return (
    <div className="flex flex-col gap-4">
      {/* チャート本体 */}
      <CumulativeCombo data={data} showMillions={showMillions} height={height} />

      {/* 上期/下期/年間 サマリーバー */}
      <div className="grid grid-cols-3 gap-3 px-1">
        <HalfYearSummary
          data={data}
          label="上期 (4〜9月)"
          monthRange={h1Months}
          showMillions={showMillions}
        />
        <HalfYearSummary
          data={data}
          label="下期 (10〜3月)"
          monthRange={h2Months}
          showMillions={showMillions}
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-500">年間合計</span>
          <span
            className={`text-sm font-semibold ${annualAchieved ? 'text-green-600' : 'text-red-600'}`}
          >
            {formatAmount(allActual, showMillions)}
          </span>
          <span className="text-xs text-gray-400">
            予算: {formatAmount(allBudget, showMillions)}
            {annualProgress !== null && (
              <span
                className={`ml-1 ${annualAchieved ? 'text-green-600' : 'text-red-500'}`}
              >
                ({annualProgress}%)
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
