// =====================================================
// HeatTable.tsx — 担当者×プロセス指標ヒートテーブル
// 低い転換率を赤系で強調着色
// =====================================================
import type { OwnerFunnelRow } from '../lib/salesPerfMetrics';
import { formatPercent } from '../lib/format';

// ----------------------------------------
// 型定義
// ----------------------------------------
export interface HeatTableProps {
  rows: OwnerFunnelRow[];
  className?: string;
}

// ----------------------------------------
// ヒートカラー計算
// 0-100 のパーセント値を赤(低)→黄→緑(高)に変換
// null は gray
// ----------------------------------------
function heatBg(value: number | null, allValues: Array<number | null>): string {
  if (value === null) return 'bg-gray-50 text-gray-400';

  const nums = allValues.filter((v): v is number => v !== null);
  if (nums.length === 0) return 'bg-gray-50 text-gray-500';

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min;

  if (range === 0) return 'bg-blue-50 text-blue-700';

  // 0=最低(赤), 1=最高(緑)
  const ratio = (value - min) / range;

  if (ratio < 0.25) return 'bg-red-100 text-red-700 font-semibold';
  if (ratio < 0.5)  return 'bg-orange-50 text-orange-700';
  if (ratio < 0.75) return 'bg-yellow-50 text-yellow-700';
  return 'bg-green-50 text-green-700';
}

// ----------------------------------------
// 件数列のヒートカラー (高い方が良い)
// ----------------------------------------
function countHeatBg(value: number, allValues: number[]): string {
  if (allValues.length === 0) return '';
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min;
  if (range === 0) return 'bg-blue-50';
  const ratio = (value - min) / range;
  if (ratio < 0.25) return 'bg-red-50 text-red-700';
  if (ratio < 0.5)  return 'bg-orange-50 text-orange-600';
  if (ratio < 0.75) return 'bg-yellow-50 text-yellow-700';
  return 'bg-green-50 text-green-700';
}

// ----------------------------------------
// 列定義
// ----------------------------------------
const RATE_COLUMNS = [
  { key: 'lpRate',       label: 'LP率',     title: '(LP数 ÷ 商談数)' },
  { key: 'contractRate', label: '契約率',   title: '(契約世帯 ÷ 提案数)' },
] as const;

const COUNT_COLUMNS = [
  { key: 'meetings',  label: '商談' },
  { key: 'lifeplans', label: 'LP' },
  { key: 'proposals', label: '提案' },
  { key: 'contracts', label: '契約世帯' },
] as const;

// ----------------------------------------
// コンポーネント
// ----------------------------------------
export function HeatTable({ rows, className = '' }: HeatTableProps) {
  if (rows.length === 0) {
    return (
      <div className={`text-sm text-gray-400 py-4 text-center ${className}`}>
        データがありません
      </div>
    );
  }

  // 全担当の値を集めてヒート計算に使う
  const allLpRates       = rows.map(r => r.lpRate);
  const allContractRates = rows.map(r => r.contractRate);
  const allMeetings      = rows.map(r => r.meetings);
  const allLifeplans     = rows.map(r => r.lifeplans);
  const allProposals     = rows.map(r => r.proposals);
  const allContracts     = rows.map(r => r.contracts);

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse text-sm min-w-[520px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap w-24">
              担当者
            </th>
            {COUNT_COLUMNS.map(col => (
              <th
                key={col.key}
                className="px-3 py-2 text-right text-xs font-semibold text-gray-600 whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
            {RATE_COLUMNS.map(col => (
              <th
                key={col.key}
                className="px-3 py-2 text-right text-xs font-semibold text-gray-600 whitespace-nowrap"
                title={col.title}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.ownerId}
              className="border-t border-gray-100 hover:bg-gray-50"
            >
              {/* 担当者名 */}
              <td className="px-3 py-2 text-xs font-medium text-gray-700 whitespace-nowrap">
                {row.ownerName}
              </td>

              {/* 件数列 */}
              <td className={`px-3 py-2 text-right tabular-nums text-xs ${countHeatBg(row.meetings, allMeetings)}`}>
                {row.meetings}
              </td>
              <td className={`px-3 py-2 text-right tabular-nums text-xs ${countHeatBg(row.lifeplans, allLifeplans)}`}>
                {row.lifeplans}
              </td>
              <td className={`px-3 py-2 text-right tabular-nums text-xs ${countHeatBg(row.proposals, allProposals)}`}>
                {row.proposals}
              </td>
              <td className={`px-3 py-2 text-right tabular-nums text-xs ${countHeatBg(row.contracts, allContracts)}`}>
                {row.contracts}
              </td>

              {/* 転換率列 */}
              <td className={`px-3 py-2 text-right tabular-nums text-xs rounded-sm ${heatBg(row.lpRate, allLpRates)}`}>
                {row.lpRate !== null ? formatPercent(row.lpRate) : '−'}
              </td>
              <td className={`px-3 py-2 text-right tabular-nums text-xs rounded-sm ${heatBg(row.contractRate, allContractRates)}`}>
                {row.contractRate !== null ? formatPercent(row.contractRate) : '−'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 凡例 */}
      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
        <span>ヒート (転換率列):</span>
        <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">低</span>
        <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-600">↕</span>
        <span className="px-2 py-0.5 rounded bg-yellow-50 text-yellow-700">↕</span>
        <span className="px-2 py-0.5 rounded bg-green-50 text-green-700">高</span>
        <span className="ml-1">/ − = データなし</span>
      </div>
    </div>
  );
}
