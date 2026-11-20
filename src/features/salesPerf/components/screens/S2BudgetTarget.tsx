// =====================================================
// S2BudgetTarget.tsx — 予算・目標管理画面
// T1-3: budgetTable + CumulativeCombo + 差額バー
// =====================================================
import { useState } from 'react';
import { useAppStore } from '../../../../store/index';
import { useShallow } from 'zustand/shallow';
import { useSalesPerfStore } from '../../store';
import {
  budgetTable,
  cumulativeBudgetVsActual,
} from '../../lib/salesPerfMetrics';
import { formatAmount, formatPercent } from '../../lib/format';
import { CumulativeComboPanel } from '../charts/CumulativeCombo';
import { FISCAL_MONTH_LABELS } from '../../constants';

// ----------------------------------------
// 進捗率セルの色クラス
// ----------------------------------------
function progressCellClass(rate: number | null): string {
  if (rate === null) return 'text-gray-400';
  if (rate >= 100) return 'text-green-600 font-semibold';
  if (rate >= 80) return 'text-yellow-600';
  return 'text-red-600';
}

// ----------------------------------------
// 金額セルの色クラス (未達=赤/達成=緑)
// ----------------------------------------
function amountCellClass(actual: number, budget: number): string {
  if (budget === 0) return '';
  return actual >= budget ? 'text-green-700' : 'text-red-600';
}

// ----------------------------------------
// テーブルヘッダー列定義
// ----------------------------------------
const TABLE_COLS = [
  { key: 'label',       label: '月',            align: 'left'   as const },
  { key: 'actual',      label: '確定',          align: 'right'  as const },
  { key: 'actual_s',    label: '確定＋S',       align: 'right'  as const },
  { key: 'actual_s_a',  label: '確定＋S＋A',   align: 'right'  as const },
  { key: 'progressRate',label: '進捗率',        align: 'right'  as const },
  { key: 'budget',      label: '月次予算',      align: 'right'  as const },
  { key: 'cumBudget',   label: '予算積上げ',    align: 'right'  as const },
];

// ----------------------------------------
// 半期まとめ計算
// ----------------------------------------
interface HalfRow {
  label: string;
  actual: number;
  actual_s: number;
  actual_s_a: number;
  budget: number;
  cumBudget: number;
  progressRate: number | null;
}

function calcHalf(
  rows: ReturnType<typeof budgetTable>,
  monthRange: number[],
  cumBudgetAtEnd: number,
): HalfRow {
  const slice = rows.filter(r => monthRange.includes(r.month));
  const actual    = slice.reduce((s, r) => s + r.actual, 0);
  const actual_s  = slice.reduce((s, r) => s + r.actual_s, 0);
  const actual_s_a = slice.reduce((s, r) => s + r.actual_s_a, 0);
  const budget    = slice.reduce((s, r) => s + r.budget, 0);
  return {
    label: monthRange[0] <= 6 ? '上期計' : '下期計',
    actual, actual_s, actual_s_a,
    budget,
    cumBudget: cumBudgetAtEnd,
    progressRate: cumBudgetAtEnd > 0 ? (actual / cumBudgetAtEnd) * 100 : null,
  };
}

// ----------------------------------------
// コンポーネント
// ----------------------------------------
export function S2BudgetTarget() {
  const currentRole    = useAppStore(s => s.currentRole) as 'general' | 'manager' | 'admin' | 'executive';
  const currentUserId  = useAppStore(s => s.currentUserId);

  const { filter, contracts, targets, masters } = useSalesPerfStore(useShallow(s => ({
    filter:    s.filter,
    contracts: s.contracts,
    targets:   s.targets,
    masters:   s.masters,
  })));

  const [showMillions, setShowMillions] = useState(true);

  // ----------------------------------------
  // 集計
  // ----------------------------------------
  const tableRows = budgetTable(contracts, targets, filter, masters, currentRole, currentUserId);
  const comboData  = cumulativeBudgetVsActual(contracts, targets, filter, masters, currentRole, currentUserId);

  // 上期 (会計月1-6 = 4-9月): 累計予算は6月末 = tableRows[5].cumBudget
  const h1Row = calcHalf(tableRows, [1,2,3,4,5,6], tableRows[5]?.cumBudget ?? 0);
  // 下期 (会計月7-12 = 10-3月): 累計予算は12月末 = tableRows[11].cumBudget
  const h2Row = calcHalf(tableRows, [7,8,9,10,11,12], tableRows[11]?.cumBudget ?? 0);
  // 年間
  const annualActual    = tableRows.reduce((s, r) => s + r.actual, 0);
  const annualActual_s  = tableRows.reduce((s, r) => s + r.actual_s, 0);
  const annualActual_sa = tableRows.reduce((s, r) => s + r.actual_s_a, 0);
  const annualBudget    = tableRows.reduce((s, r) => s + r.budget, 0);
  const annualCumBudget = tableRows[11]?.cumBudget ?? 0;
  const annualProgress  = annualCumBudget > 0 ? (annualActual / annualCumBudget) * 100 : null;

  // ----------------------------------------
  // テーブル行レンダー
  // ----------------------------------------
  function renderDataRow(
    key: string,
    label: string,
    row: {
      actual: number;
      actual_s: number;
      actual_s_a: number;
      progressRate: number | null;
      budget: number;
      cumBudget: number;
    },
    isSummary = false,
  ) {
    const cellBase = isSummary
      ? 'px-3 py-2 bg-gray-50 font-medium text-sm'
      : 'px-3 py-2 text-sm';

    return (
      <tr key={key} className={isSummary ? 'border-t-2 border-gray-300' : 'border-t border-gray-100 hover:bg-gray-50'}>
        <td className={`${cellBase} text-left whitespace-nowrap`}>{label}</td>
        <td className={`${cellBase} text-right tabular-nums ${amountCellClass(row.actual, row.budget)}`}>
          {formatAmount(row.actual, showMillions)}
        </td>
        <td className={`${cellBase} text-right tabular-nums`}>
          {formatAmount(row.actual_s, showMillions)}
        </td>
        <td className={`${cellBase} text-right tabular-nums`}>
          {formatAmount(row.actual_s_a, showMillions)}
        </td>
        <td className={`${cellBase} text-right tabular-nums ${progressCellClass(row.progressRate)}`}>
          {row.progressRate !== null ? formatPercent(row.progressRate) : '−'}
        </td>
        <td className={`${cellBase} text-right tabular-nums text-gray-600`}>
          {formatAmount(row.budget, showMillions)}
        </td>
        <td className={`${cellBase} text-right tabular-nums text-gray-600`}>
          {formatAmount(row.cumBudget, showMillions)}
        </td>
      </tr>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ヘッダー + 表示切替 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">予算・目標管理</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            進捗率 = 確定累計 ÷ 予算積上げ（当月末基準）／分母0は「−」
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">金額表示:</span>
          <button
            type="button"
            onClick={() => setShowMillions(v => !v)}
            className={`
              text-xs px-3 py-1 rounded-full border transition-colors
              ${showMillions
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}
            `}
          >
            {showMillions ? '百万円' : '円'}
          </button>
        </div>
      </div>

      {/* ─── 月×指標テーブル ─── */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full border-collapse text-left min-w-[700px]">
          <thead>
            <tr className="bg-gray-50">
              {TABLE_COLS.map(col => (
                <th
                  key={col.key}
                  className={`
                    px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap
                    border-b border-gray-200
                    ${col.align === 'right' ? 'text-right' : 'text-left'}
                  `}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 4〜9月 (上期) */}
            {tableRows
              .filter(r => r.month <= 6)
              .map(r =>
                renderDataRow(
                  `row-${r.month}`,
                  FISCAL_MONTH_LABELS[r.month],
                  r,
                ),
              )}

            {/* 上期計 */}
            {renderDataRow('h1', '上期計', h1Row, true)}

            {/* 10〜3月 (下期) */}
            {tableRows
              .filter(r => r.month >= 7)
              .map(r =>
                renderDataRow(
                  `row-${r.month}`,
                  FISCAL_MONTH_LABELS[r.month],
                  r,
                ),
              )}

            {/* 下期計 */}
            {renderDataRow('h2', '下期計', h2Row, true)}

            {/* 年間合計 */}
            {renderDataRow(
              'annual',
              '年間合計',
              {
                actual:       annualActual,
                actual_s:     annualActual_s,
                actual_s_a:   annualActual_sa,
                progressRate: annualProgress,
                budget:       annualBudget,
                cumBudget:    annualCumBudget,
              },
              true,
            )}
          </tbody>
        </table>
      </div>

      {/* ─── 累計コンボチャート ─── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">累計推移: 予算 vs 実績 + 月次差額</h3>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-6 h-0.5 bg-slate-400 border-dashed" />
              累計予算
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-6 h-0.5 bg-blue-500" />
              確定累計
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-green-500 opacity-70" />
              差額(＋)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-red-500 opacity-70" />
              差額(−)
            </span>
          </div>
        </div>
        <CumulativeComboPanel
          data={comboData}
          showMillions={showMillions}
          height={300}
        />
      </div>

      {/* ─── 凡例 & 注記 ─── */}
      <div className="text-xs text-gray-400 space-y-1">
        <p>
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />
          確定列: 緑=目標達成（確定 ≥ 月次予算）
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 mx-1 ml-3" />
          赤=未達
        </p>
        <p>
          <span className="font-medium text-gray-500">予算積上げ</span> = 4月〜当月の月次予算累計（当月末基準）
        </p>
        <p>確度シナリオはグローバルフィルタの「確度」設定に連動</p>
      </div>
    </div>
  );
}
