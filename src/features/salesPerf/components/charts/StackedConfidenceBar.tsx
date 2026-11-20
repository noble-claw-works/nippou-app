// =====================================================
// StackedConfidenceBar.tsx — 確度別積上げ棒グラフ
// recharts 3.9.2
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
} from 'recharts';
import type { ConfidenceStackPoint } from '../../types';
import { formatMillionYen } from '../../lib/format';
import { FISCAL_MONTH_LABELS } from '../../constants';

// ----------------------------------------
// 確度の色マップ
// ----------------------------------------
const CONFIDENCE_COLORS: Record<string, string> = {
  fixed: '#16a34a',  // 緑: 確定
  S:     '#2563eb',  // 青: S
  A:     '#7c3aed',  // 紫: A
  B:     '#d97706',  // 琥珀: B
  C:     '#dc2626',  // 赤: C
  D:     '#6b7280',  // 灰: D
  first: '#0891b2',  // シアン: 初見
};

const CONFIDENCE_LABELS: Record<string, string> = {
  fixed: '確定',
  S: 'S',
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  first: '初見',
};

// ----------------------------------------
// 型
// ----------------------------------------
export interface StackedConfidenceBarProps {
  data: ConfidenceStackPoint[];
  /** 表示する確度コード (フィルタ後の確度シナリオに応じて絞る) */
  visibleCodes?: string[];
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
  const total = payload.reduce((s, e) => s + (e.value ?? 0), 0);
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {[...payload].reverse().map(entry => (
        entry.value > 0 && (
          <div key={entry.name} className="flex items-center gap-2">
            <span style={{ color: entry.color }}>■</span>
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-medium text-gray-800">{formatMillionYen(entry.value)}</span>
          </div>
        )
      ))}
      <div className="border-t border-gray-100 mt-1 pt-1 flex justify-between">
        <span className="text-gray-500">合計</span>
        <span className="font-medium text-gray-800">{formatMillionYen(total)}</span>
      </div>
    </div>
  );
}

// ----------------------------------------
// StackedConfidenceBar
// ----------------------------------------
export function StackedConfidenceBar({
  data,
  visibleCodes = ['fixed', 'S', 'A', 'B', 'C', 'D', 'first'],
  height = 280,
}: StackedConfidenceBarProps) {
  const chartData = data.map(p => ({
    label: FISCAL_MONTH_LABELS[p.month],
    ...Object.fromEntries(
      visibleCodes.map(code => [code, (p as unknown as Record<string, number>)[code] ?? 0]),
    ),
  }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
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
            iconType="square"
            iconSize={8}
            wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
          />
          {/* 確度別積上げバー (下から: fixed → S → A → ...) */}
          {visibleCodes.map(code => (
            <Bar
              key={code}
              dataKey={code}
              name={CONFIDENCE_LABELS[code] ?? code}
              stackId="confidence"
              fill={CONFIDENCE_COLORS[code] ?? '#9ca3af'}
              radius={code === visibleCodes[visibleCodes.length - 1] ? [2, 2, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
