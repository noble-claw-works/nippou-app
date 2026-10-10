// =====================================================
// InsurerTypeBar.tsx — S5専用: 保険会社別棒グラフ
// recharts 3.9.2 / BarChart (layout="vertical")
// mode='commission' → 手数料合計 / mode='count' → 件数
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
  Legend,
} from 'recharts';
import type { InsurerTypeCrossRow } from '../../lib/salesPerfMetrics';
import { formatMillionYen, formatYen, formatCount } from '../../lib/format';

// ----------------------------------------
// 色パレット (保険会社 index 順に循環)
// ----------------------------------------
const PALETTE = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
  '#84cc16', // lime-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
];

function getColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

// ----------------------------------------
// 型
// ----------------------------------------
export type DisplayMode = 'commission' | 'count';

export interface InsurerTypeBarProps {
  data: InsurerTypeCrossRow[];
  mode: DisplayMode;
  height?: number;
}

// ----------------------------------------
// カスタム Tooltip
// ----------------------------------------
interface TooltipEntry {
  payload: InsurerTypeCrossRow & { index: number; value: number; label: string };
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
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs max-w-56">
      <p className="font-semibold text-gray-700 mb-1.5 border-b border-gray-100 pb-1">{label}</p>
      <div className="flex flex-col gap-0.5 mb-2">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">手数料合計</span>
          <span className="font-medium tabular-nums">{formatMillionYen(d.commission)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">件数</span>
          <span className="font-medium tabular-nums">{formatCount(d.count)}</span>
        </div>
      </div>
      {d.productTypes.length > 0 && (
        <>
          <p className="text-gray-400 text-[10px] mb-1">種目内訳</p>
          <div className="flex flex-col gap-0.5">
            {d.productTypes.slice(0, 5).map(pt => (
              <div key={pt.key} className="flex justify-between gap-3">
                <span className="text-gray-500 truncate max-w-24">{pt.key}</span>
                <span className="font-medium tabular-nums text-gray-700">
                  {formatCount(pt.count)}
                </span>
              </div>
            ))}
            {d.productTypes.length > 5 && (
              <p className="text-gray-400 text-[10px]">他 {d.productTypes.length - 5} 種目…</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ----------------------------------------
// 保険会社別棒グラフ (単純横棒)
// ----------------------------------------
export function InsurerTypeBar({ data, mode, height = 320 }: InsurerTypeBarProps) {
  const chartData = data.map((row, i) => ({
    ...row,
    index: i,
    value: mode === 'commission' ? row.commission : row.count,
    label:
      row.insurer.length > 10 ? row.insurer.slice(0, 10) + '…' : row.insurer,
  }));

  const formatXTick = (v: number) =>
    mode === 'commission'
      ? `${(v / 1_000_000).toFixed(1)}M`
      : `${v}件`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 80, bottom: 4, left: 90 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
        <XAxis
          type="number"
          tickFormatter={formatXTick}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={88}
          tick={{ fontSize: 12, fill: '#374151' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {chartData.map((entry) => (
            <Cell key={entry.insurer} fill={getColor(entry.index)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ----------------------------------------
// 種目別積上げ棒グラフ (保険会社×種目クロス)
// ----------------------------------------
export interface InsurerTypeStackedBarProps {
  data: InsurerTypeCrossRow[];
  mode: DisplayMode;
  height?: number;
}

export function InsurerTypeStackedBar({ data, mode, height = 320 }: InsurerTypeStackedBarProps) {
  // 全種目を収集 (ソート済み)
  const allProductTypes = Array.from(
    new Set(data.flatMap(row => row.productTypes.map(pt => pt.key))),
  ).sort();

  // recharts 用データ: 保険会社ごとの行
  const chartData = data.map(row => {
    const entry: Record<string, string | number> = {
      insurer: row.insurer.length > 10 ? row.insurer.slice(0, 10) + '…' : row.insurer,
    };
    for (const pt of allProductTypes) {
      const found = row.productTypes.find(p => p.key === pt);
      entry[pt] = found
        ? mode === 'commission'
          ? found.commission
          : found.count
        : 0;
    }
    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 24, bottom: 4, left: 90 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
        <XAxis
          type="number"
          tickFormatter={(v: number) =>
            mode === 'commission'
              ? `${(v / 1_000_000).toFixed(1)}M`
              : `${v}件`
          }
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="insurer"
          width={88}
          tick={{ fontSize: 12, fill: '#374151' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={((value: unknown, name: unknown) => [
            mode === 'commission'
              ? formatYen(typeof value === 'number' ? value : 0)
              : formatCount(typeof value === 'number' ? value : 0),
            name as string,
          ]) as (value: unknown) => [string, string]}
          cursor={{ fill: '#f9fafb' }}
        />
        <Legend
          iconType="square"
          iconSize={10}
          wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
        />
        {allProductTypes.map((pt, i) => (
          <Bar key={pt} dataKey={pt} stackId="a" fill={getColor(i)} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
