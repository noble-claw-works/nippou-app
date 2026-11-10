// =====================================================
// RankingBar.tsx — 担当者進捗ランキング横棒グラフ
// recharts 3.9.2 / layout="vertical"
// =====================================================
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import type { OwnerRankRow } from '../../types';
import { formatMillionYen, formatPercent } from '../../lib/format';

// ----------------------------------------
// 型
// ----------------------------------------
export interface RankingBarProps {
  data: OwnerRankRow[];
  height?: number;
}

// ----------------------------------------
// カスタム Tooltip
// ----------------------------------------
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface TooltipPayload {
  value: number;
}

interface TooltipEntry {
  payload: {
    commission: number;
    budget: number;
    progressRate: number | null;
    ownerName: string;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      <div className="flex flex-col gap-0.5">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">確定手数料</span>
          <span className="font-medium">{formatMillionYen(d.commission)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">予算</span>
          <span className="font-medium">{formatMillionYen(d.budget)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">進捗率</span>
          <span className={`font-bold ${
            d.progressRate === null
              ? 'text-gray-400'
              : d.progressRate >= 100
                ? 'text-green-600'
                : 'text-red-600'
          }`}>
            {d.progressRate === null ? '−' : formatPercent(d.progressRate)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------
// RankingBar
// ----------------------------------------
export function RankingBar({ data, height }: RankingBarProps) {
  const dynamicHeight = height ?? Math.max(200, data.length * 48 + 40);

  const chartData = data.map(row => ({
    ownerName: row.ownerName,
    commission: row.commission,
    budget: row.budget,
    progressRate: row.progressRate,
    // バーは progressRate (%) を表示。null → 0
    rate: row.progressRate ?? 0,
  }));

  return (
    <div className="w-full" style={{ height: dynamicHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 4, right: 60, bottom: 4, left: 0 }}
          barCategoryGap="25%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 'auto']}
            tickFormatter={v => `${v.toFixed(0)}%`}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            type="category"
            dataKey="ownerName"
            tick={{ fontSize: 12, fill: '#374151' }}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="rate" name="進捗率" radius={[0, 3, 3, 0]} maxBarSize={24}>
            {chartData.map((entry, idx) => (
              <Cell
                key={`cell-${idx}`}
                fill={
                  entry.progressRate === null
                    ? '#d1d5db'
                    : entry.progressRate >= 100
                      ? '#16a34a'
                      : entry.progressRate >= 70
                        ? '#2563eb'
                        : '#dc2626'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
