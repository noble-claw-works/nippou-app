// =====================================================
// ChannelChart.tsx — S4専用: チャネル構成比チャート
// recharts 3.9.2
// 1. 100%積上げ棒グラフ (channel別構成比 - 月次)
// 2. ドーナツグラフ (channel別手数料構成比)
// =====================================================
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import type { ChannelRow } from '../../lib/salesPerfMetrics';
import { formatPercent } from '../../lib/format';

// ----------------------------------------
// カラーパレット
// ----------------------------------------
const CHANNEL_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
  '#ec4899', // pink-500
  '#6b7280', // gray-500
];

function getColor(index: number): string {
  return CHANNEL_COLORS[index % CHANNEL_COLORS.length];
}

// ----------------------------------------
// カスタムツールチップ (ドーナツ)
// ----------------------------------------
interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: ChannelRow }>;
}

function PieCustomTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{d.channel}</p>
      <p className="text-gray-600">
        構成比: <span className="font-medium text-blue-600">{d.share !== null ? formatPercent(d.share) : '−'}</span>
      </p>
      <p className="text-gray-600">
        手数料: <span className="font-medium">{d.commission.toLocaleString('ja-JP')}円</span>
      </p>
      <p className="text-gray-600">
        件数: <span className="font-medium">{d.count}件</span>
      </p>
    </div>
  );
}

// ----------------------------------------
// ドーナツグラフ (チャネル別手数料構成比)
// ----------------------------------------
interface ChannelDonutProps {
  data: ChannelRow[];
  height?: number;
}

export function ChannelDonut({ data, height = 280 }: ChannelDonutProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        データがありません
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="commission"
          nameKey="channel"
          cx="50%"
          cy="50%"
          outerRadius={100}
          innerRadius={55}
          paddingAngle={2}
          label={(props) => {
            // recharts spreads data fields into PieLabelRenderProps via payload
            const d = (props as unknown as { payload: ChannelRow }).payload;
            if (!d || d.share == null || d.share < 5) return '';
            return `${d.channel} ${d.share.toFixed(0)}%`;
          }}
          labelLine={false}
        >
          {data.map((_, idx) => (
            <Cell key={idx} fill={getColor(idx)} />
          ))}
        </Pie>
        <Tooltip content={<PieCustomTooltip />} />
        <Legend
          formatter={(value: string) => (
            <span className="text-xs text-gray-600">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ----------------------------------------
// 100%積上げ棒グラフ (月別 x チャネル件数構成比)
// ----------------------------------------
export interface MonthlyChannelPoint {
  label: string; // '4月' 等
  [channel: string]: number | string;
}

interface ChannelStackedBarProps {
  data: MonthlyChannelPoint[];
  channels: string[];
  height?: number;
}

interface BarTooltipPayload {
  dataKey: string;
  value: number;
  color: string;
}

interface BarTooltipProps {
  active?: boolean;
  label?: string;
  payload?: BarTooltipPayload[];
}

function BarCustomTooltip({ active, label, payload }: BarTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="bg-white border border-gray-200 rounded shadow-sm px-3 py-2 text-xs min-w-[140px]">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {[...payload].reverse().map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-gray-600">{p.dataKey}</span>
          </span>
          <span className="font-medium tabular-nums">
            {p.value}件 ({total > 0 ? ((p.value / total) * 100).toFixed(0) : 0}%)
          </span>
        </div>
      ))}
      <div className="mt-1 pt-1 border-t border-gray-100 flex justify-between">
        <span className="text-gray-500">合計</span>
        <span className="font-semibold">{total}件</span>
      </div>
    </div>
  );
}

export function ChannelStackedBar({ data, channels, height = 280 }: ChannelStackedBarProps) {
  if (data.length === 0 || channels.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        データがありません
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          tickFormatter={(v: number) => `${v}%`}
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip content={<BarCustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
          formatter={(value: string) => (
            <span className="text-xs text-gray-600">{value}</span>
          )}
        />
        {channels.map((ch, idx) => (
          <Bar
            key={ch}
            dataKey={ch}
            stackId="channel"
            fill={getColor(idx)}
            radius={idx === channels.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
