// =====================================================
// S7ContractDetail.tsx — 契約明細ドリルダウン画面
// T2-2: contractRows + 要確認ハイライト + 列ソート + フィルタ連動
// =====================================================
import { useState, useMemo } from "react";
import { useAppStore } from "../../../../store/index";
import { useShallow } from "zustand/shallow";
import { useSalesPerfStore } from "../../store";
import { contractRows } from "../../lib/salesPerfMetrics";
import { ownerName } from "../../lib/salePerfScope";
import { formatAmount } from "../../lib/format";
import type { SortKey, SortDir } from "./contractDetailTypes";
import {
  sortRows,
  formatIssues,
  formatEstablishedDate,
  monthLabel,
} from "./contractDetailHelpers";
import {
  SortHeader,
  LineBadge,
  ConfidenceBadge,
  CsvExportButton,
  EmptyState,
} from "./ContractDetailSubComponents";

// ----------------------------------------
// メインコンポーネント
// ----------------------------------------
export function S7ContractDetail() {
  const currentRole = useAppStore((s) => s.currentRole) as
    "general" | "manager" | "admin" | "executive";
  const currentUserId = useAppStore((s) => s.currentUserId);

  const { filter, contracts, masters } = useSalesPerfStore(
    useShallow((s) => ({
      filter: s.filter,
      contracts: s.contracts,
      masters: s.masters,
    })),
  );

  // ソート状態
  const [sortKey, setSortKey] = useState<SortKey>("establishedDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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
    () => rows.filter((c) => c._issues.length > 0).length,
    [rows],
  );

  // ----------------------------------------
  // ハンドラ
  // ----------------------------------------
  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // ----------------------------------------
  // 空状態
  // ----------------------------------------
  if (rows.length === 0) {
    return <EmptyState />;
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
            {rows.length.toLocaleString("ja-JP")} 件
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
          ⚠️
          の行はデータ品質フラグが立っています。金額・確度・年度などを確認してください。
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
              const isOwner =
                currentRole === "general" ? c.ownerId === currentUserId : true;
              // 要確認行の背景色
              const rowClass = hasIssue
                ? "bg-yellow-50 hover:bg-yellow-100 transition-colors"
                : "hover:bg-gray-50 transition-colors";

              return (
                <tr key={c.id} className={rowClass}>
                  {/* 番号 + 要確認マーク */}
                  <td className="px-2 py-1.5 text-gray-400 text-center whitespace-nowrap">
                    {hasIssue ? (
                      <span
                        title={formatIssues(c._issues)}
                        className="cursor-help"
                      >
                        ⚠️
                      </span>
                    ) : (
                      <span className="text-gray-300">{idx + 1}</span>
                    )}
                  </td>

                  {/* ライン */}
                  <td className="px-2 py-1.5 text-center whitespace-nowrap">
                    <LineBadge line={c.line} />
                  </td>

                  {/* 担当 */}
                  <td className="px-2 py-1.5 whitespace-nowrap text-gray-700">
                    {isOwner ? (
                      ownerName(c.ownerId, masters)
                    ) : (
                      <span className="text-gray-300">−</span>
                    )}
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
                    <ConfidenceBadge contract={c} />
                  </td>

                  {/* 初年度手数料 */}
                  <td className="px-2 py-1.5 text-right whitespace-nowrap font-mono text-gray-700">
                    {c.firstYearCommission !== null ? (
                      formatAmount(c.firstYearCommission)
                    ) : (
                      <span className="text-yellow-600 font-normal">
                        要確認
                      </span>
                    )}
                  </td>

                  {/* 月次保険料 */}
                  <td className="px-2 py-1.5 text-right whitespace-nowrap font-mono text-gray-600">
                    {c.monthlyPremium !== null ? (
                      formatAmount(c.monthlyPremium)
                    ) : (
                      <span className="text-yellow-600 font-normal">
                        要確認
                      </span>
                    )}
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
        <p>
          各列ヘッダーをクリックして並び替え可能 |
          担当ロールは自分の担当のみ表示
        </p>
      </div>
    </div>
  );
}
