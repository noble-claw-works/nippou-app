// =====================================================
// S7ContractDetail.tsx — 契約明細ドリルダウン画面
// T2-2: contractRows + 要確認ハイライト + 列ソート + フィルタ連動
// =====================================================
import { useState, useMemo } from 'react';
import { useAppStore } from '../../../../store/index';
import { useShallow } from 'zustand/shallow';
import { useSalesPerfStore } from '../../store';
import { contractRows } from '../../lib/salesPerfMetrics';
import { ownerName } from '../../lib/salePerfScope';
import { formatAmount } from '../../lib/format';
import type { SalesContract } from '../../types';
import {
  CONFIDENCE_LIFE_LABELS,
  CONFIDENCE_NONLIFE_LABELS,
  FISCAL_MONTH_LABELS,
} from '../../constants';

// ----------------------------------------
// 型
// ----------------------------------------
type SortKey =
  | 'establishedDate'
  | 'firstYearCommission'
  | 'monthlyPremium'
  | 'owner'
  | 'insurer'
  | 'productType'
  | 'channel'
  | 'partner'
  | 'confidence'
  | 'line'
  | 'issues';

type SortDir = 'asc' | 'desc';

// ----------------------------------------
// 確度表示ラベル
// ----------------------------------------
function confidenceLabel(c: SalesContract): string {
  if (c.line === 'life') {
    return CONFIDENCE_LIFE_LABELS[c.confidenceCode] ?? c.confidenceCode;
  }
  return CONFIDENCE_NONLIFE_LABELS[c.confidenceCode] ?? c.confidenceCode;
}

// ----------------------------------------
// 要確認フラグの日本語表示マップ
// ----------------------------------------
const ISSUE_LABELS: Record<string, string> = {
  premium_unparseable: '保険料変換不能',
  confidence_unknown: '確度不明',
  fy_mismatch: '年度不整合',
  'missing_insurer': '保険会社欠損',
  'missing_channel': 'チャネル欠損',
  'missing_product_type': '種目欠損',
};

function formatIssues(issues: string[]): string {
  return issues
    .map(i => ISSUE_LABELS[i] ?? i)
    .join(' / ');
}

// ----------------------------------------
// 成立日表示
// ----------------------------------------
function formatEstablishedDate(c: SalesContract): string {
  if (!c.establishedDate) {
    if (c._issues.includes('fy_mismatch')) return '−(年度不整合)';
    return '未計上';
  }
  return c.establishedDate;
}

// ----------------------------------------
// 会計月ラベル
// ----------------------------------------
function monthLabel(c: SalesContract): string {
  if (c.month === null) return '−';
  return FISCAL_MONTH_LABELS[c.month] ?? `${c.month}月`;
}

// ----------------------------------------
// ソート関数
// ----------------------------------------
function sortRows(
  rows: SalesContract[],
  key: SortKey,
  dir: SortDir,
  masters: import('../../types').SalesPerfMasters,
): SalesContract[] {
  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case 'establishedDate': {
        const da = a.establishedDate ?? '';
        const db = b.establishedDate ?? '';
        cmp = da.localeCompare(db);
        break;
      }
      case 'firstYearCommission': {
        const va = a.firstYearCommission ?? -1;
        const vb = b.firstYearCommission ?? -1;
        cmp = va - vb;
        break;
      }
      case 'monthlyPremium': {
        const va = a.monthlyPremium ?? -1;
        const vb = b.monthlyPremium ?? -1;
        cmp = va - vb;
        break;
      }
      case 'owner': {
        const na = ownerName(a.ownerId, masters);
        const nb = ownerName(b.ownerId, masters);
        cmp = na.localeCompare(nb, 'ja');
        break;
      }
      case 'insurer':
        cmp = a.insurer.localeCompare(b.insurer, 'ja');
        break;
      case 'productType':
        cmp = a.productType.localeCompare(b.productType, 'ja');
        break;
      case 'channel':
        cmp = a.channel.localeCompare(b.channel, 'ja');
        break;
      case 'partner':
        cmp = a.partner.localeCompare(b.partner, 'ja');
        break;
      case 'confidence':
        cmp = (a.confidenceCode ?? '').localeCompare(b.confidenceCode ?? '');
        break;
      case 'line':
        cmp = a.line.localeCompare(b.line);
        break;
      case 'issues':
        cmp = b._issues.length - a._issues.length; // 多い順(昇順とき反転)
        break;
    }
    return dir === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

// ----------------------------------------
// ソートヘッダーボタン
// ----------------------------------------
interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right' | 'center';
}

function SortHeader({ label, sortKey, currentKey, currentDir, onSort, align = 'left' }: SortHeaderProps) {
  const isActive = currentKey === sortKey;
  const arrow = isActive ? (currentDir === 'asc' ? ' ▲' : ' ▼') : '';
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <th
      className={`px-2 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 ${alignClass}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {arrow && <span className="text-blue-500 text-[10px]">{arrow}</span>}
    </th>
  );
}

// ----------------------------------------
// ライン表示
// ----------------------------------------
function lineBadge(line: SalesContract['line']) {
  if (line === 'life') {
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
        生
      </span>
    );
  }
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700">
      損
    </span>
  );
}

// ----------------------------------------
// 確度バッジ
// ----------------------------------------
function confidenceBadge(c: SalesContract) {
  const label = confidenceLabel(c);
  const colorMap: Record<string, string> = {
    確定: 'bg-green-100 text-green-700',
    S: 'bg-blue-100 text-blue-700',
    A: 'bg-cyan-100 text-cyan-700',
    B: 'bg-yellow-100 text-yellow-700',
    C: 'bg-orange-100 text-orange-700',
    D: 'bg-red-100 text-red-700',
    初見: 'bg-gray-100 text-gray-600',
    不明: 'bg-gray-100 text-gray-400',
  };
  const cls = colorMap[label] ?? 'bg-gray-100 text-gray-500';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ----------------------------------------
// CSV エクスポートボタン(将来用・非活性)
// ----------------------------------------
function CsvExportButton() {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title="CSV エクスポートは将来実装予定"
      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded border border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed opacity-60"
    >
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 16 16"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 10.5v2h8v-2M8 2v7m0 0-2.5-2.5M8 9l2.5-2.5"
        />
      </svg>
      CSV エクスポート
      <span className="text-[9px] text-gray-300 ml-0.5">(将来)</span>
    </button>
  );
}

// ----------------------------------------
// メインコンポーネント
// ----------------------------------------
export function S7ContractDetail() {
  const currentRole   = useAppStore(s => s.currentRole) as 'general' | 'manager' | 'admin' | 'executive';
  const currentUserId = useAppStore(s => s.currentUserId);

  const { filter, contracts, masters } = useSalesPerfStore(useShallow(s => ({
    filter:    s.filter,
    contracts: s.contracts,
    masters:   s.masters,
  })));

  // ソート状態
  const [sortKey, setSortKey] = useState<SortKey>('establishedDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // ----------------------------------------
  // 集計
  // ----------------------------------------
  const rows = useMemo(
    () => contractRows(contracts, filter, masters, currentRole, currentUserId),
    [contracts, filter, masters, currentRole, currentUserId],
  );

  const sortedRows = useMemo(
    () => sortRows(rows, sortKey, sortDir, masters),
    [rows, sortKey, sortDir, masters],
  );

  const needsReviewCount = useMemo(
    () => rows.filter(c => c._issues.length > 0).length,
    [rows],
  );

  // ----------------------------------------
  // ハンドラ
  // ----------------------------------------
  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  // ----------------------------------------
  // 空状態
  // ----------------------------------------
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <svg
          className="w-10 h-10 mb-3 opacity-30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h5l2 2h3a2 2 0 012 2v2"
          />
        </svg>
        <p className="text-sm">該当する契約データがありません</p>
        <p className="text-xs mt-1 text-gray-300">フィルタ条件を確認してください</p>
      </div>
    );
  }

  // ----------------------------------------
  // レンダリング
  // ----------------------------------------
  return (
    <div className="space-y-3">
      {/* ─── ヘッダーバー ─── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-800">契約明細一覧</h2>
          {/* 件数バッジ */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {rows.length.toLocaleString('ja-JP')} 件
          </span>
          {/* 要確認バッジ */}
          {needsReviewCount > 0 && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"
              title="データに要確認フラグが立っています"
            >
              ⚠️ 要確認 {needsReviewCount} 件
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CsvExportButton />
        </div>
      </div>

      {/* ─── 要確認説明 ─── */}
      {needsReviewCount > 0 && (
        <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
          ⚠️ の行はデータ品質フラグが立っています。金額・確度・年度などを確認してください。
        </div>
      )}

      {/* ─── テーブル ─── */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-xs divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* 固定ラベル列 */}
              <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-left whitespace-nowrap w-8">
                #
              </th>
              <SortHeader
                label="ライン"
                sortKey="line"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
                align="center"
              />
              <SortHeader
                label="担当"
                sortKey="owner"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="保険会社"
                sortKey="insurer"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="種目"
                sortKey="productType"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="チャネル"
                sortKey="channel"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="提携先"
                sortKey="partner"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="確度"
                sortKey="confidence"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
                align="center"
              />
              <SortHeader
                label="初年度手数料"
                sortKey="firstYearCommission"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
                align="right"
              />
              <SortHeader
                label="月次保険料"
                sortKey="monthlyPremium"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
                align="right"
              />
              <SortHeader
                label="計上月"
                sortKey="establishedDate"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
                align="center"
              />
              <SortHeader
                label="成立日"
                sortKey="establishedDate"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
                align="center"
              />
              <SortHeader
                label="フラグ"
                sortKey="issues"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {sortedRows.map((c, idx) => {
              const hasIssue = c._issues.length > 0;
              // 担当ロールの個人情報表示制御: 現時点はownerId確認のみ(契約者名/被保険者名は将来列追加)
              const isOwner = currentRole === 'general' ? c.ownerId === currentUserId : true;
              // 要確認行の背景色
              const rowClass = hasIssue
                ? 'bg-yellow-50 hover:bg-yellow-100 transition-colors'
                : 'hover:bg-gray-50 transition-colors';

              return (
                <tr key={c.id} className={rowClass}>
                  {/* 番号 + 要確認マーク */}
                  <td className="px-2 py-1.5 text-gray-400 text-center whitespace-nowrap">
                    {hasIssue ? (
                      <span title={formatIssues(c._issues)} className="cursor-help">
                        ⚠️
                      </span>
                    ) : (
                      <span className="text-gray-300">{idx + 1}</span>
                    )}
                  </td>

                  {/* ライン */}
                  <td className="px-2 py-1.5 text-center whitespace-nowrap">
                    {lineBadge(c.line)}
                  </td>

                  {/* 担当 */}
                  <td className="px-2 py-1.5 whitespace-nowrap text-gray-700">
                    {isOwner ? ownerName(c.ownerId, masters) : <span className="text-gray-300">−</span>}
                  </td>

                  {/* 保険会社 */}
                  <td className="px-2 py-1.5 whitespace-nowrap text-gray-700">
                    {c.insurer}
                  </td>

                  {/* 種目 */}
                  <td className="px-2 py-1.5 whitespace-nowrap text-gray-700">
                    {c.productType}
                  </td>

                  {/* チャネル */}
                  <td className="px-2 py-1.5 whitespace-nowrap text-gray-600">
                    {c.channel}
                  </td>

                  {/* 提携先 */}
                  <td className="px-2 py-1.5 whitespace-nowrap text-gray-600">
                    {c.partner || <span className="text-gray-300">−</span>}
                  </td>

                  {/* 確度 */}
                  <td className="px-2 py-1.5 text-center whitespace-nowrap">
                    {confidenceBadge(c)}
                  </td>

                  {/* 初年度手数料 */}
                  <td className="px-2 py-1.5 text-right whitespace-nowrap font-mono text-gray-700">
                    {c.firstYearCommission !== null
                      ? formatAmount(c.firstYearCommission)
                      : <span className="text-yellow-600 font-normal">要確認</span>
                    }
                  </td>

                  {/* 月次保険料 */}
                  <td className="px-2 py-1.5 text-right whitespace-nowrap font-mono text-gray-600">
                    {c.monthlyPremium !== null
                      ? formatAmount(c.monthlyPremium)
                      : <span className="text-yellow-600 font-normal">要確認</span>
                    }
                  </td>

                  {/* 計上月 */}
                  <td className="px-2 py-1.5 text-center whitespace-nowrap text-gray-600">
                    {monthLabel(c)}
                  </td>

                  {/* 成立日 */}
                  <td className="px-2 py-1.5 text-center whitespace-nowrap text-gray-600">
                    {formatEstablishedDate(c)}
                  </td>

                  {/* フラグ詳細 */}
                  <td className="px-2 py-1.5 text-gray-500 max-w-[200px] truncate">
                    {hasIssue ? (
                      <span
                        className="text-yellow-700 text-[10px]"
                        title={formatIssues(c._issues)}
                      >
                        {formatIssues(c._issues)}
                      </span>
                    ) : (
                      <span className="text-gray-200">−</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── フッター注記 ─── */}
      <div className="text-xs text-gray-400 space-y-0.5">
        <p>
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-100 border border-yellow-200 mr-1 align-middle" />
          黄色ハイライト行: データ品質フラグあり（⚠️ をホバーで詳細表示）
        </p>
        <p>各列ヘッダーをクリックして並び替え可能 | 担当ロールは自分の担当のみ表示</p>
      </div>
    </div>
  );
}
