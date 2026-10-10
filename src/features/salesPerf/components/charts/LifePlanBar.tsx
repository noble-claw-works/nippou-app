// =====================================================
// LifePlanBar.tsx — S6専用: チャネル別LP実施件数 vs 目標線
// recharts 3.9.2 (BarChart + ReferenceLine)
// =====================================================
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { LifePlanRow } from '../../lib/salesPerfMetrics';
import { FISCAL_MONTH_LABELS } from '../../constants';

// ----------------------------------------
// 定数
// ----------------------------------------
const COLOR_ACHIEVED = '#22c55e'; // green-500
const COLOR_SHORT    = '#ef4444'; // red-500
const COLOR_TARGET   = '#f59e0b'; // amber-500

// ----------------------------------------
// 型
// ----------------------------------------
interface BarData {
  name: string;       // ラベル (月or担当者)
  actual: number;
  target: number;
  achieved: boolean;
}

interface LifePlanBarProps {
  /** lifePlanMetrics() の返り値をそのまま渡す */
  rows: LifePlanRow[];
  /**
   * 'byMonth'  → X軸=月次ラベル、凡例=チャネル別複数バー
   * 'byOwner'  → X軸=担当者、凡例=チャネル別
   * ★ デフォルト: 'byMonth' で単一チャネルを切替表示
   */
  viewMode: 'byMonth' | 'byChannel';
  /** byMonth モード時: 表示対象チャネル (未指定=全チャネル合算) */
  selectedChannel?: string;
  /** ターゲット値 (月7件) */
  target: number;
}

// ----------------------------------------
// ツールチップ
// ----------------------------------------
interface LpTooltipEntry {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: LpTooltipEntry[];
  label?: string;
  target: number;
}

function CustomTooltip({ active, payload, label, target }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-gray-700 mb-2 border-b border-gray-100 pb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4 py-0.5">
          <span style={{ color: p.color }} className="font-medium">{p.name}</span>
          <span className="font-bold tabular-nums text-gray-800">{p.value}件</span>
        </div>
      ))}
      <div className="mt-2 pt-1 border-t border-gray-100 flex justify-between text-gray-400">
        <span>目標</span>
        <span className="tabular-nums">{target}件</span>
      </div>
    </div>
  );
}

// ----------------------------------------
// メインコンポーネント
// ----------------------------------------
export function LifePlanBar({ rows, viewMode, selectedChannel, target }: LifePlanBarProps) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        データがありません
      </div>
    );
  }

  if (viewMode === 'byMonth') {
    // ── byMonth: X軸=月次、特定チャネルまたは全合算を棒で表示 ──
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    const chartData: BarData[] = months.map(m => {
      const monthRows = rows.filter(r => r.month === m);
      const actual = selectedChannel
        ? (monthRows.find(r => r.channel === selectedChannel)?.actual ?? 0)
        : monthRows.reduce((s, r) => s + r.actual, 0);
      return {
        name: FISCAL_MONTH_LABELS[m],
        actual,
        target,
        achieved: actual >= target,
      };
    });

    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={({ active, payload, label }) => (
              <CustomTooltip
                active={active}
                payload={payload as unknown as LpTooltipEntry[] | undefined}
                label={typeof label === 'string' ? label : undefined}
                target={target}
              />
            )}
          />
          <ReferenceLine
            y={target}
            stroke={COLOR_TARGET}
            strokeWidth={2}
            strokeDasharray="6 3"
            label={{
              value: `目標: ${target}件`,
              position: 'insideTopRight',
              fill: COLOR_TARGET,
              fontSize: 11,
              fontWeight: 600,
            }}
          />
          <Bar dataKey="actual" name="LP実施件数" radius={[3, 3, 0, 0]} maxBarSize={40}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.achieved ? COLOR_ACHIEVED : COLOR_SHORT}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ── byChannel: X軸=チャネル、各月の実績を表示 ──
  const channels = [...new Set(rows.map(r => r.channel))].sort();
  const months   = [...new Set(rows.map(r => r.month))].sort((a, b) => a - b);

  // チャネル×月の合計(複数オーナー対応)
  const chartData = channels.map(ch => {
    const entry: Record<string, number | string> = { name: ch };
    let total = 0;
    for (const m of months) {
      const val = rows.filter(r => r.channel === ch && r.month === m).reduce((s, r) => s + r.actual, 0);
      entry[FISCAL_MONTH_LABELS[m]] = val;
      total += val;
    }
    entry._total = total;
    return entry;
  });

  // 月ごとに色を徐々に変化させる
  const MONTH_COLORS = [
    '#3b82f6','#6366f1','#8b5cf6','#a855f7','#ec4899','#f43f5e',
    '#ef4444','#f97316','#f59e0b','#84cc16','#22c55e','#14b8a6',
  ];

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={{ stroke: '#e2e8f0' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          content={({ active, payload, label }) => (
            <CustomTooltip
              active={active}
              payload={payload as unknown as LpTooltipEntry[] | undefined}
              label={typeof label === 'string' ? label : undefined}
              target={target}
            />
          )}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine
          y={target}
          stroke={COLOR_TARGET}
          strokeWidth={2}
          strokeDasharray="6 3"
          label={{
            value: `目標: ${target}件`,
            position: 'insideTopRight',
            fill: COLOR_TARGET,
            fontSize: 11,
            fontWeight: 600,
          }}
        />
        {months.map((m, i) => (
          <Bar
            key={m}
            dataKey={FISCAL_MONTH_LABELS[m]}
            stackId="lp"
            fill={MONTH_COLORS[i % MONTH_COLORS.length]}
            radius={i === months.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
            maxBarSize={50}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
