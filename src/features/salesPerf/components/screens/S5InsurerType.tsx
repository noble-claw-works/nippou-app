// =====================================================
// S5InsurerType.tsx — 保険会社・種目分析
// T3-2: insurerTypeBreakdown (手数料/件数トグル)
// =====================================================
import { useState } from 'react';
import { useAppStore } from '../../../../store/index';
import { useSalesPerfStore } from '../../store';
import { insurerTypeBreakdown } from '../../lib/salesPerfMetrics';
import { formatMillionYen, formatYen, formatCount } from '../../lib/format';
import { InsurerTypeBar, InsurerTypeStackedBar } from '../charts/InsurerTypeBar';
import type { DisplayMode } from '../charts/InsurerTypeBar';
import type { InsurerTypeCrossRow } from '../../lib/salesPerfMetrics';

// ----------------------------------------
// 表示モードトグルボタン
// ----------------------------------------
interface ModeToggleProps {
  mode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}

function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-gray-200 overflow-hidden text-sm">
      <button
        type="button"
        onClick={() => onChange('commission')}
        className={`px-3 py-1.5 font-medium transition-colors ${
          mode === 'commission'
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        手数料
      </button>
      <button
        type="button"
        onClick={() => onChange('count')}
        className={`px-3 py-1.5 font-medium transition-colors border-l border-gray-200 ${
          mode === 'count'
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        件数
      </button>
    </div>
  );
}

// ----------------------------------------
// チャートビュートグル
// ----------------------------------------
type ChartView = 'simple' | 'stacked';

interface ChartViewToggleProps {
  view: ChartView;
  onChange: (v: ChartView) => void;
}

function ChartViewToggle({ view, onChange }: ChartViewToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-gray-200 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => onChange('simple')}
        className={`px-2.5 py-1 font-medium transition-colors ${
          view === 'simple'
            ? 'bg-gray-700 text-white'
            : 'bg-white text-gray-500 hover:bg-gray-50'
        }`}
      >
        保険会社別
      </button>
      <button
        type="button"
        onClick={() => onChange('stacked')}
        className={`px-2.5 py-1 font-medium transition-colors border-l border-gray-200 ${
          view === 'stacked'
            ? 'bg-gray-700 text-white'
            : 'bg-white text-gray-500 hover:bg-gray-50'
        }`}
      >
        種目別積上
      </button>
    </div>
  );
}

// ----------------------------------------
// 種目クロステーブル (保険会社 × 種目)
// ----------------------------------------
interface CrossTableProps {
  data: InsurerTypeCrossRow[];
  mode: DisplayMode;
}

function CrossTable({ data, mode }: CrossTableProps) {
  // 全種目を収集
  const allProductTypes = Array.from(
    new Set(data.flatMap(r => r.productTypes.map(pt => pt.key))),
  ).sort();

  const formatCell = (v: number) =>
    mode === 'commission' ? formatYen(v) : formatCount(v);

  const totalCommission = data.reduce((s, r) => s + r.commission, 0);
  const totalCount = data.reduce((s, r) => s + r.count, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 pr-3 pl-1 font-semibold text-gray-600 whitespace-nowrap sticky left-0 bg-gray-50">
              保険会社
            </th>
            {allProductTypes.map(pt => (
              <th
                key={pt}
                className="py-2 px-2 font-semibold text-gray-500 whitespace-nowrap text-right"
              >
                {pt}
              </th>
            ))}
            <th className="py-2 pl-3 pr-1 font-semibold text-gray-700 whitespace-nowrap text-right border-l border-gray-200">
              合計
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr
              key={row.insurer}
              className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                ri % 2 === 0 ? '' : 'bg-gray-50/50'
              }`}
            >
              <td className="py-2 pr-3 pl-1 font-medium text-gray-700 whitespace-nowrap sticky left-0">
                {row.insurer}
              </td>
              {allProductTypes.map(pt => {
                const found = row.productTypes.find(p => p.key === pt);
                const v = found
                  ? mode === 'commission'
                    ? found.commission
                    : found.count
                  : 0;
                return (
                  <td
                    key={pt}
                    className={`py-2 px-2 text-right tabular-nums ${
                      v === 0 ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    {v === 0 ? '−' : formatCell(v)}
                  </td>
                );
              })}
              <td className="py-2 pl-3 pr-1 text-right tabular-nums font-semibold text-gray-800 border-l border-gray-200">
                {mode === 'commission'
                  ? formatYen(row.commission)
                  : formatCount(row.count)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300 bg-gray-50">
            <td className="py-2 pr-3 pl-1 font-bold text-gray-700 sticky left-0 bg-gray-50">
              合計
            </td>
            {allProductTypes.map(pt => {
              const total = data.reduce((s, r) => {
                const found = r.productTypes.find(p => p.key === pt);
                return s + (found ? (mode === 'commission' ? found.commission : found.count) : 0);
              }, 0);
              return (
                <td
                  key={pt}
                  className="py-2 px-2 text-right tabular-nums font-semibold text-gray-700"
                >
                  {total === 0 ? '−' : formatCell(total)}
                </td>
              );
            })}
            <td className="py-2 pl-3 pr-1 text-right tabular-nums font-bold text-blue-700 border-l border-gray-200">
              {mode === 'commission'
                ? formatYen(totalCommission)
                : formatCount(totalCount)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ----------------------------------------
// 保険会社別サマリーカード
// ----------------------------------------
interface InsurerCardProps {
  row: InsurerTypeCrossRow;
  mode: DisplayMode;
  totalCommission: number;
  totalCount: number;
  color: string;
}

function InsurerCard({ row, mode, totalCommission, totalCount, color }: InsurerCardProps) {
  const share =
    mode === 'commission' && totalCommission > 0
      ? ((row.commission / totalCommission) * 100).toFixed(1)
      : mode === 'count' && totalCount > 0
        ? ((row.count / totalCount) * 100).toFixed(1)
        : null;

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm min-w-0">
      <div
        className="w-2 h-10 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-semibold text-gray-700 truncate">{row.insurer}</span>
        <span className="text-sm font-bold text-gray-900 tabular-nums">
          {mode === 'commission'
            ? formatMillionYen(row.commission)
            : formatCount(row.count)}
        </span>
        {share !== null && (
          <span className="text-[10px] text-gray-400">シェア {share}%</span>
        )}
      </div>
    </div>
  );
}

const PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#f97316', '#6366f1', '#84cc16', '#ec4899', '#14b8a6',
];

// ----------------------------------------
// メインコンポーネント
// ----------------------------------------
export function S5InsurerType() {
  const [mode, setMode] = useState<DisplayMode>('commission');
  const [chartView, setChartView] = useState<ChartView>('simple');

  const currentRole   = useAppStore(s => s.currentRole) as 'general' | 'manager' | 'admin' | 'executive';
  const currentUserId = useAppStore(s => s.currentUserId);

  const { filter, contracts, masters } = useSalesPerfStore(s => ({
    filter:    s.filter,
    contracts: s.contracts,
    masters:   s.masters,
  }));

  // ----------------------------------------
  // 集計 (mode でソートと表示値が変わる)
  // ----------------------------------------
  const crossData = insurerTypeBreakdown(
    contracts,
    filter,
    masters,
    currentRole,
    currentUserId,
    mode,
  );

  const totalCommission = crossData.reduce((s, r) => s + r.commission, 0);
  const totalCount      = crossData.reduce((s, r) => s + r.count, 0);
  const hasData         = crossData.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* ヘッダー */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">保険会社・種目分析</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            保険会社×種目のクロス集計。確度シナリオ・フィルタ連動。分母0は「−」
          </p>
        </div>
        {/* 手数料/件数トグル */}
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      {/* データなし */}
      {!hasData && (
        <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <p className="text-sm text-gray-400">対象データがありません</p>
        </div>
      )}

      {hasData && (
        <>
          {/* サマリーカード行 */}
          <div className="flex flex-wrap gap-2">
            {crossData.slice(0, 6).map((row, i) => (
              <InsurerCard
                key={row.insurer}
                row={row}
                mode={mode}
                totalCommission={totalCommission}
                totalCount={totalCount}
                color={PALETTE[i % PALETTE.length]}
              />
            ))}
          </div>

          {/* チャートビュー切替 + グラフ */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h3 className="text-sm font-semibold text-gray-700">
                {mode === 'commission' ? '手数料合計' : '件数'}
                {chartView === 'simple' ? ' — 保険会社別' : ' — 保険会社×種目 積上げ'}
              </h3>
              <ChartViewToggle view={chartView} onChange={setChartView} />
            </div>

            {chartView === 'simple' ? (
              <InsurerTypeBar
                data={crossData}
                mode={mode}
                height={Math.max(240, crossData.length * 36 + 40)}
              />
            ) : (
              <InsurerTypeStackedBar
                data={crossData}
                mode={mode}
                height={Math.max(240, crossData.length * 36 + 80)}
              />
            )}
          </div>

          {/* クロステーブル */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                保険会社 × 種目 クロス集計
              </h3>
              <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">
                {mode === 'commission' ? '手数料' : '件数'}
              </span>
            </div>
            <CrossTable data={crossData} mode={mode} />
          </div>

          {/* 注記 */}
          <div className="text-xs text-gray-400 space-y-1">
            <p>確度シナリオはグローバルフィルタに連動（上部トグルで選択中のシナリオのみ集計）</p>
            <p>
              合計手数料:{' '}
              <span className="font-semibold text-gray-600">
                {formatMillionYen(totalCommission)}
              </span>
              {'　'}
              合計件数:{' '}
              <span className="font-semibold text-gray-600">{formatCount(totalCount)}</span>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
