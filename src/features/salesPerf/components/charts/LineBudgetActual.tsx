// =====================================================
// LineBudgetActual.tsx — 月次手数料 × 予算折線グラフ
// recharts 3.9.2 / React 19 対応
// =====================================================
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyPoint } from '../../types';
import { formatMillionYen } from '../../lib/format';
import { FISCAL_MONTH_LABELS } from '../../constants';

// ----------------------------------------
// 型
// ----------------------------------------
export interface LineBudgetActualProps {
  data: MonthlyPoint[];
  /** true=累計表示, false=月次表示 */
  showCumulative?: boolean;
  /** 年間予算合計 (目標線として表示) */
  annualBudget?: number;
  height?: number;
}

// ----------------------------------------
// カスタム Tooltip
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
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map(entry => (
        <div key={entry.name} className="flex items-center gap-2">
          <span style={{ color: entry.color }}>●</span>
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium text-gray-800">{formatMillionYen(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------
// LineBudgetActual
// ----------------------------------------
export function LineBudgetActual({
  data,
  showCumulative = false,
  annualBudget,
  height = 280,
}: LineBudgetActualProps) {
  // グラフ用データ変換
  const chartData = data.map(p => ({
    label: FISCAL_MONTH_LABELS[p.month],
    actual: showCumulative ? p.cumActual : p.actual,
    budget: showCumulative ? p.cumBudget : p.budget,
  }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
          />
          {/* 年間予算目標線 */}
          {showCumulative && annualBudget !== undefined && (
            <ReferenceLine
              y={annualBudget}
              stroke="#ef4444"
              strokeDasharray="6 3"
              label={{ value: '年間目標', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }}
            />
          )}
          {/* 予算ライン */}
          <Line
            type="monotone"
            dataKey="budget"
            name="予算"
            stroke="#93c5fd"
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 3"
          />
          {/* 実績ライン */}
          <Line
            type="monotone"
            dataKey="actual"
            name="確定手数料"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#2563eb' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
