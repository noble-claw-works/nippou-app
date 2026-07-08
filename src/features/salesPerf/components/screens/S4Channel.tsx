// =====================================================
// S4Channel.tsx — S4チャネル分析
// T3-1: channelBreakdown + partnerMonthlyBreakdown
// 提携先別 月次件数テーブル + 構成比 (100%積上げ棒 / ドーナツ)
// =====================================================
import { useState } from 'react';
import { useAppStore } from '../../../../store/index';
import { useShallow } from 'zustand/shallow';
import { useSalesPerfStore } from '../../store';
import {
  channelBreakdown,
  partnerMonthlyBreakdown,
} from '../../lib/salesPerfMetrics';
import { formatPercent, formatAmount } from '../../lib/format';
import { FISCAL_MONTH_LABELS } from '../../constants';
import { ChannelDonut, ChannelStackedBar } from '../charts/ChannelChart';
import type { MonthlyChannelPoint } from '../charts/ChannelChart';

// ----------------------------------------
// 月リスト (会計月 1-12)
// ----------------------------------------
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

// ----------------------------------------
// チャートタイプ切替
// ----------------------------------------
type ChartMode = 'donut' | 'stacked';

// ----------------------------------------
// 構成比バー (テーブル内インライン表示)
// ----------------------------------------
interface ShareBarProps {
  share: number | null;
  color: string;
}
function ShareBar({ share, color }: ShareBarProps) {
  if (share === null) return <span className="text-gray-400">−</span>;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[48px]">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(share, 100)}%`, backgroundColor: color }}
        />
      </div>
      <span className="tabular-nums text-right w-12 flex-shrink-0">{formatPercent(share)}</span>
    </div>
  );
}

// ----------------------------------------
// チャネル別カラー (テーブルと同期)
// ----------------------------------------
const CHANNEL_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#f97316', '#84cc16',
  '#ec4899', '#6b7280',
];
function getColor(index: number): string {
  return CHANNEL_COLORS[index % CHANNEL_COLORS.length];
}

// ----------------------------------------
// メインコンポーネント
// ----------------------------------------
export function S4Channel() {
  const currentRole   = useAppStore(s => s.currentRole) as 'general' | 'manager' | 'admin' | 'executive';
  const currentUserId = useAppStore(s => s.currentUserId);

  const { filter, contracts, masters } = useSalesPerfStore(useShallow(s => ({
    filter:    s.filter,
    contracts: s.contracts,
    masters:   s.masters,
  })));

  const [chartMode, setChartMode] = useState<ChartMode>('donut');
  const [showMillions, setShowMillions] = useState(true);

  // ----------------------------------------
  // 集計
  // ----------------------------------------
  const channelRows = channelBreakdown(contracts, filter, masters, currentRole, currentUserId);
  const partnerRows = partnerMonthlyBreakdown(contracts, filter, masters, currentRole, currentUserId);

  // 100%積上げ棒グラフ用データ (月 x partner件数 → 構成比%)
  const partnerNames = partnerRows.map(r => r.partner);
  const stackedData: MonthlyChannelPoint[] = MONTHS.map(m => {
    const totalInMonth = partnerRows.reduce((s, r) => s + (r.monthly[m] ?? 0), 0);
    const point: MonthlyChannelPoint = { label: FISCAL_MONTH_LABELS[m] };
    for (const r of partnerRows) {
      const count = r.monthly[m] ?? 0;
      point[r.partner] = totalInMonth > 0
        ? Math.round((count / totalInMonth) * 100)
        : 0;
    }
    return point;
  });

  // ----------------------------------------
  // レンダー
  // ----------------------------------------
  return (
    <div className="flex flex-col gap-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">チャネル分析</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            提携先別 手数料構成比・件数 / 月次提携先件数テーブル
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* 金額表示切替 */}
          <span className="text-xs text-gray-500">金額:</span>
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
          {/* チャートモード切替 */}
          <span className="text-xs text-gray-500 ml-2">チャート:</span>
          <div className="flex rounded-full border border-gray-200 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setChartMode('donut')}
              className={`px-3 py-1 transition-colors ${chartMode === 'donut' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              ドーナツ
            </button>
            <button
              type="button"
              onClick={() => setChartMode('stacked')}
              className={`px-3 py-1 transition-colors ${chartMode === 'stacked' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              積上げ棒
            </button>
          </div>
        </div>
      </div>

      {/* ─── 上段: チャネル別サマリーテーブル + 構成比チャート ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* チャネル別サマリーテーブル */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">チャネル別 手数料・件数</h3>
          </div>
          {channelRows.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
              データがありません
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-left border-b border-gray-100">
                      チャネル
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-right border-b border-gray-100">
                      件数
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-right border-b border-gray-100">
                      手数料
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-left border-b border-gray-100 min-w-[140px]">
                      構成比
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {channelRows.map((row, idx) => (
                    <tr
                      key={row.channel}
                      className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 py-2 text-sm text-gray-800 font-medium">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getColor(idx) }}
                          />
                          {row.channel}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-right tabular-nums text-gray-700">
                        {row.count.toLocaleString('ja-JP')}件
                      </td>
                      <td className="px-3 py-2 text-sm text-right tabular-nums text-gray-700">
                        {formatAmount(row.commission, showMillions)}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        <ShareBar share={row.share} color={getColor(idx)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* 合計行 */}
                {channelRows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="px-3 py-2 text-xs font-semibold text-gray-600">合計</td>
                      <td className="px-3 py-2 text-xs font-semibold text-right tabular-nums text-gray-700">
                        {channelRows.reduce((s, r) => s + r.count, 0).toLocaleString('ja-JP')}件
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold text-right tabular-nums text-gray-700">
                        {formatAmount(channelRows.reduce((s, r) => s + r.commission, 0), showMillions)}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">100%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>

        {/* 構成比チャート */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            {chartMode === 'donut' ? 'チャネル別 手数料構成比' : '月別 提携先構成比（件数）'}
          </h3>
          {chartMode === 'donut' ? (
            <ChannelDonut data={channelRows} height={280} />
          ) : (
            <ChannelStackedBar
              data={stackedData}
              channels={partnerNames}
              height={280}
            />
          )}
        </div>
      </div>

      {/* ─── 下段: 提携先別 月次件数テーブル ─── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">提携先別 月次件数テーブル</h3>
          <p className="text-xs text-gray-500 mt-0.5">確度シナリオ連動 / 構成比はフィルタ期間内の総件数比</p>
        </div>
        {partnerRows.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
            データがありません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[900px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-left border-b border-gray-100 sticky left-0 bg-gray-50 z-10 min-w-[120px]">
                    提携先
                  </th>
                  {MONTHS.map(m => (
                    <th
                      key={m}
                      className="px-2 py-2 text-xs font-semibold text-gray-600 text-right border-b border-gray-100 whitespace-nowrap min-w-[44px]"
                    >
                      {FISCAL_MONTH_LABELS[m]}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-right border-b border-gray-100">
                    合計
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-right border-b border-gray-100 min-w-[80px]">
                    構成比
                  </th>
                </tr>
              </thead>
              <tbody>
                {partnerRows.map((row, idx) => (
                  <tr
                    key={row.partner}
                    className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-2 text-sm text-gray-800 font-medium sticky left-0 bg-white hover:bg-gray-50 z-10">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getColor(idx) }}
                        />
                        {row.partner}
                      </div>
                    </td>
                    {MONTHS.map(m => {
                      const count = row.monthly[m] ?? 0;
                      return (
                        <td
                          key={m}
                          className={`
                            px-2 py-2 text-sm text-right tabular-nums
                            ${count > 0 ? 'text-gray-800' : 'text-gray-300'}
                          `}
                        >
                          {count > 0 ? count : '−'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-sm text-right tabular-nums font-semibold text-gray-800">
                      {row.total}
                    </td>
                    <td className="px-3 py-2 text-sm text-right tabular-nums">
                      {row.share !== null
                        ? <span className="text-blue-600 font-medium">{formatPercent(row.share)}</span>
                        : <span className="text-gray-400">−</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* 月別合計行 */}
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="px-3 py-2 text-xs font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10">
                    月計
                  </td>
                  {MONTHS.map(m => {
                    const total = partnerRows.reduce((s, r) => s + (r.monthly[m] ?? 0), 0);
                    return (
                      <td
                        key={m}
                        className="px-2 py-2 text-xs font-semibold text-right tabular-nums text-gray-700"
                      >
                        {total > 0 ? total : '−'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-xs font-semibold text-right tabular-nums text-gray-700">
                    {partnerRows.reduce((s, r) => s + r.total, 0)}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 text-right">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* 注記 */}
      <div className="text-xs text-gray-400 space-y-1">
        <p>確度シナリオはグローバルフィルタの「確度」設定に連動</p>
        <p>構成比の分母 = フィルタ適用後・確度シナリオ内の全件数 / 手数料合計。分母0は「−」</p>
        <p>提携先テーブルの「月」は成立日(established_date)から算出した会計月 / 未計上(日付なし)は集計から除外</p>
      </div>
    </div>
  );
}
