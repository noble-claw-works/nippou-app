// =====================================================
// S6LifePlan.tsx — S6 ライフプラン実績
// T3-3: チャネル別LP実施件数 vs 目標(月7件)
// 生保のみ。store filter 連動。
// =====================================================
import { useState, useMemo } from 'react';
import { useAppStore } from '../../../../store/index';
import { useShallow } from 'zustand/shallow';
import { useSalesPerfStore } from '../../store';
import { lifePlanMetrics } from '../../lib/salesPerfMetrics';
import { LP_TARGET_PER_MONTH, FISCAL_MONTH_LABELS } from '../../constants';
import { LifePlanBar } from '../charts/LifePlanBar';

// ----------------------------------------
// ビューモード型
// ----------------------------------------
type ViewMode = 'byMonth' | 'byChannel';

// ----------------------------------------
// サマリーカード (チャネル別)
// ----------------------------------------
interface ChannelSummaryProps {
  channel: string;
  total: number;
  months: number;
  target: number;
}

function ChannelSummaryCard({ channel, total, months, target }: ChannelSummaryProps) {
  const monthlyAvg = months > 0 ? total / months : 0;
  const achieved   = total >= target * months;
  const gap        = total - target * months;

  return (
    <div
      className={`
        flex flex-col rounded-lg border px-4 py-3 min-w-[140px]
        ${achieved
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-white border-gray-200'}
      `}
    >
      <span className="text-xs text-gray-500 mb-1 truncate max-w-[120px]" title={channel}>
        {channel}
      </span>
      <span className={`text-2xl font-bold tabular-nums ${achieved ? 'text-emerald-600' : 'text-gray-800'}`}>
        {total}
        <span className="text-xs font-normal text-gray-400 ml-0.5">件</span>
      </span>
      <span className="text-xs text-gray-400 mt-0.5">
        月平均 {monthlyAvg.toFixed(1)}件
      </span>
      <span
        className={`text-xs font-semibold mt-1 ${gap >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
      >
        {gap >= 0 ? `+${gap}` : gap}件 (目標比)
      </span>
    </div>
  );
}

// ----------------------------------------
// メインコンポーネント
// ----------------------------------------
export function S6LifePlan() {
  const currentRole   = useAppStore(s => s.currentRole) as 'general' | 'manager' | 'admin' | 'executive';
  const currentUserId = useAppStore(s => s.currentUserId);

  const { filter, contracts, masters } = useSalesPerfStore(useShallow(s => ({
    filter:    s.filter,
    contracts: s.contracts,
    masters:   s.masters,
  })));

  // ビュー切替
  const [viewMode, setViewMode]           = useState<ViewMode>('byMonth');
  const [selectedChannel, setSelectedChannel] = useState<string>('');

  // ----------------------------------------
  // 集計 (lifePlanMetrics は生保強制フィルタ内蔵)
  // ----------------------------------------
  const rows = useMemo(
    () =>
      lifePlanMetrics(
        contracts,
        filter,
        masters,
        currentRole,
        currentUserId,
        LP_TARGET_PER_MONTH,
      ),
    [contracts, filter, masters, currentRole, currentUserId],
  );

  // チャネル一覧 (ソート済み)
  const channels = useMemo(
    () => [...new Set(rows.map(r => r.channel))].sort(),
    [rows],
  );

  // 有効月数 (全月のうち実績があるか否か問わず12ヶ月)
  const ACTIVE_MONTHS = 12;

  // チャネル別合計
  const channelTotals = useMemo(() => {
    return channels.map(ch => ({
      channel: ch,
      total:   rows.filter(r => r.channel === ch).reduce((s, r) => s + r.actual, 0),
    }));
  }, [channels, rows]);

  // 全体合計
  const grandTotal = useMemo(
    () => rows.reduce((s, r) => s + r.actual, 0),
    [rows],
  );

  // 担当者別集計 (テーブル用)
  const monthLabels = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({ month: i + 1, label: FISCAL_MONTH_LABELS[i + 1] })),
    [],
  );

  // フィルタが損保に限定されているケース
  const isNonlifeOnly = filter.line === 'nonlife';

  // ----------------------------------------
  // 早期リターン: 損保フィルタ時
  // ----------------------------------------
  if (isNonlifeOnly) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">ライフプラン実績</h2>
        </div>
        <div className="flex items-center justify-center py-12 bg-amber-50 rounded-lg border border-amber-200">
          <div className="text-center">
            <span className="text-3xl mb-3 block">⚠️</span>
            <p className="text-amber-700 font-semibold text-sm">
              現在のフィルタが「損保」に限定されています
            </p>
            <p className="text-amber-600 text-xs mt-1">
              ライフプラン実績は生保のみ対象です。
              フィルタを「両方」または「生保」に変更してください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ヘッダー */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800">ライフプラン実績</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          生保のみ対象。チャネル別LP実施件数 vs 目標（月 {LP_TARGET_PER_MONTH}件 / 全担当共通）。
          分母0は「−」
        </p>
      </div>

      {/* データなし */}
      {rows.length === 0 ? (
        <div className="flex items-center justify-center py-16 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-400 text-sm">
            対象データがありません。フィルタ条件を確認してください。
          </p>
        </div>
      ) : (
        <>
          {/* チャネル別サマリーカード行 */}
          <div className="flex flex-wrap gap-3">
            {/* 全体合計カード */}
            <div className="flex flex-col rounded-lg border px-4 py-3 min-w-[140px] bg-blue-50 border-blue-200">
              <span className="text-xs text-blue-500 mb-1">全チャネル合計</span>
              <span className="text-2xl font-bold tabular-nums text-blue-700">
                {grandTotal}
                <span className="text-xs font-normal text-blue-400 ml-0.5">件</span>
              </span>
              <span className="text-xs text-blue-400 mt-0.5">
                目標: {LP_TARGET_PER_MONTH * ACTIVE_MONTHS * channels.length}件
              </span>
              <span
                className={`text-xs font-semibold mt-1 ${
                  grandTotal >= LP_TARGET_PER_MONTH * ACTIVE_MONTHS * channels.length
                    ? 'text-emerald-600'
                    : 'text-red-500'
                }`}
              >
                {(() => {
                  const g = grandTotal - LP_TARGET_PER_MONTH * ACTIVE_MONTHS * channels.length;
                  return `${g >= 0 ? '+' : ''}${g}件 (目標比)`;
                })()}
              </span>
            </div>

            {channelTotals.map(ct => (
              <ChannelSummaryCard
                key={ct.channel}
                channel={ct.channel}
                total={ct.total}
                months={ACTIVE_MONTHS}
                target={LP_TARGET_PER_MONTH}
              />
            ))}
          </div>

          {/* ビュー切替 + チャネルフィルタ */}
          <div className="flex flex-wrap items-center gap-3">
            {/* ビュー切替 */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              <button
                onClick={() => setViewMode('byMonth')}
                className={`px-3 py-1.5 transition-colors ${
                  viewMode === 'byMonth'
                    ? 'bg-blue-500 text-white font-semibold'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                月別
              </button>
              <button
                onClick={() => setViewMode('byChannel')}
                className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${
                  viewMode === 'byChannel'
                    ? 'bg-blue-500 text-white font-semibold'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                チャネル別
              </button>
            </div>

            {/* チャネル絞り込み (byMonth モード時のみ) */}
            {viewMode === 'byMonth' && channels.length > 1 && (
              <select
                value={selectedChannel}
                onChange={e => setSelectedChannel(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">全チャネル合算</option>
                {channels.map(ch => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            )}

            {/* 目標値バッジ */}
            <span className="text-xs px-2 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-600 font-semibold">
              目標: 月{LP_TARGET_PER_MONTH}件
            </span>
          </div>

          {/* チャート */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {viewMode === 'byMonth'
                ? `月次LP実施件数 vs 目標${selectedChannel ? ` (${selectedChannel})` : ' (全チャネル合算)'}`
                : 'チャネル別LP実施件数 (月次積上げ)'}
            </h3>
            <LifePlanBar
              rows={rows}
              viewMode={viewMode}
              selectedChannel={selectedChannel || undefined}
              target={LP_TARGET_PER_MONTH}
            />
            <p className="text-xs text-gray-400 mt-2">
              <span className="inline-block w-3 h-3 rounded-sm bg-green-500 mr-1" />達成（目標以上）
              <span className="inline-block w-3 h-3 rounded-sm bg-red-500 mx-1 ml-3" />未達
              <span
                style={{ borderTop: '2px dashed #f59e0b', display: 'inline-block', width: 20, verticalAlign: 'middle' }}
                className="mx-1 ml-3"
              />目標ライン
            </p>
          </div>

          {/* 月次明細テーブル */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 overflow-x-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              チャネル × 月次 LP実施件数
            </h3>
            <table className="w-full text-xs border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-2 border-b border-gray-200 font-semibold text-gray-600">
                    チャネル
                  </th>
                  {monthLabels.map(({ month, label }) => (
                    <th
                      key={month}
                      className="text-right py-2 px-1.5 border-b border-gray-200 font-semibold text-gray-600 min-w-[36px]"
                    >
                      {label}
                    </th>
                  ))}
                  <th className="text-right py-2 px-2 border-b border-gray-200 font-semibold text-gray-800">
                    合計
                  </th>
                  <th className="text-right py-2 px-2 border-b border-gray-200 font-semibold text-gray-600">
                    目標差
                  </th>
                </tr>
              </thead>
              <tbody>
                {channels.map(ch => {
                  const chRows = rows.filter(r => r.channel === ch);
                  const total  = chRows.reduce((s, r) => s + r.actual, 0);
                  const target12 = LP_TARGET_PER_MONTH * ACTIVE_MONTHS;
                  const gap    = total - target12;

                  return (
                    <tr key={ch} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium text-gray-700 truncate max-w-[120px]">
                        {ch}
                      </td>
                      {monthLabels.map(({ month }) => {
                        const row = chRows.find(r => r.month === month);
                        const val = row?.actual ?? 0;
                        return (
                          <td
                            key={month}
                            className={`py-2 px-1.5 text-right tabular-nums font-mono
                              ${val >= LP_TARGET_PER_MONTH
                                ? 'text-emerald-600 font-semibold'
                                : val > 0
                                  ? 'text-gray-700'
                                  : 'text-gray-300'}`}
                          >
                            {val}
                          </td>
                        );
                      })}
                      <td className="py-2 px-2 text-right tabular-nums font-bold text-gray-800">
                        {total}
                      </td>
                      <td
                        className={`py-2 px-2 text-right tabular-nums font-semibold
                          ${gap >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                      >
                        {gap >= 0 ? `+${gap}` : gap}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* フッター: 目標行 */}
              <tfoot>
                <tr className="bg-amber-50 border-t border-amber-200">
                  <td className="py-2 px-2 font-semibold text-amber-700 text-xs">
                    月次目標
                  </td>
                  {monthLabels.map(({ month }) => (
                    <td key={month} className="py-2 px-1.5 text-right tabular-nums text-amber-600 font-semibold">
                      {LP_TARGET_PER_MONTH}
                    </td>
                  ))}
                  <td className="py-2 px-2 text-right tabular-nums text-amber-700 font-bold">
                    {LP_TARGET_PER_MONTH * ACTIVE_MONTHS}
                  </td>
                  <td className="py-2 px-2" />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 注記 */}
          <div className="text-xs text-gray-400 space-y-1">
            <p>
              <span className="text-emerald-600 font-semibold">緑</span>: 月次目標（{LP_TARGET_PER_MONTH}件）達成 /
              <span className="text-red-500 font-semibold ml-2">赤</span>: 未達
            </p>
            <p>
              LP実施: <code className="bg-gray-100 px-1 rounded">hadLifeplan = true</code> の件数 /
              生保契約のみを対象（損保フィルタ時は警告表示）
            </p>
            <p>目標: 月{LP_TARGET_PER_MONTH}件 / 全担当共通 (<code className="bg-gray-100 px-1 rounded">LP_TARGET_PER_MONTH</code> in constants.ts)</p>
          </div>
        </>
      )}
    </div>
  );
}
