// =====================================================
// RenewalListPage — 更新一覧（保険契約 更新対応ワークリスト）
//
// 独立ページ (/renewals) として AppShell NAV から直接アクセス。
// CustomerListPage の「更新一覧」タブは撤去済み。
// 8列フラットテーブル: 契約者/団体名/担当者/保険会社/満期日/種目/前年保険料/手続き手段
// 満期日昇順・60日以内強調・行クリックで /renewals/:id
// =====================================================
import { useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertTriangle, RefreshCw, Upload } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { useAppStore } from "../store";
import {
  RENEWAL_METHOD_LABEL,
  RENEWAL_PRODUCT_TYPE_LABEL,
  RENEWAL_STATUS_LABEL,
} from "../utils/renewalLabels";
import { RENEWAL_NEAR_DAYS } from "../utils/filterRenewalPolicies";
import { differenceInCalendarDays, parseISO } from "date-fns";
import type { RenewalCase } from "../types";

function daysUntilMaturity(
  maturityDate: string,
  today: Date = new Date(),
): number {
  return differenceInCalendarDays(parseISO(maturityDate), today);
}

function isMaturityNear(
  maturityDate: string,
  today: Date = new Date(),
): boolean {
  const days = daysUntilMaturity(maturityDate, today);
  return days <= RENEWAL_NEAR_DAYS;
}

const STATUS_COLOR: Record<RenewalCase["status"], string> = {
  not_started: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

export function RenewalListPage() {
  const navigate = useNavigate();
  const { renewalCases, users, currentRole, currentUserId, getRenewalCases } =
    useAppStore(
      useShallow((s) => ({
        renewalCases: s.renewalCases,
        users: s.users,
        currentRole: s.currentRole,
        currentUserId: s.currentUserId,
        getRenewalCases: s.getRenewalCases,
      })),
    );

  // ロール別フィルタ・maturityDate 昇順
  const cases = useMemo(
    () => getRenewalCases({ role: currentRole, userId: currentUserId }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [renewalCases, currentRole, currentUserId],
  );

  const nearCount = useMemo(
    () => cases.filter((rc) => isMaturityNear(rc.maturityDate)).length,
    [cases],
  );

  const getUserName = (userId: string) =>
    users.find((u) => u.id === userId)?.name ?? "—";

  return (
    <div className="w-full px-6 py-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-500" />
            更新一覧
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            損害保険の更新対応ワークリスト {cases.length}件
            {nearCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-orange-600 font-medium">
                <AlertTriangle className="w-3 h-3" />
                {RENEWAL_NEAR_DAYS}日以内 {nearCount}件
              </span>
            )}
          </p>
        </div>
        {/* M3: インポート導線 */}
        <Link
          to="/renewals/import"
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          インポート
        </Link>
      </div>

      {/* 凡例 */}
      {cases.length > 0 && (
        <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-orange-100 border border-orange-300" />
            {RENEWAL_NEAR_DAYS}日以内
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-red-100 border border-red-300" />
            期限切れ
          </span>
        </div>
      )}

      {/* テーブル */}
      {cases.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          更新対応ワークリストがありません
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">
                  契約者
                </th>
                <th className="text-left px-3 py-3 text-gray-600 font-medium whitespace-nowrap">
                  団体名
                </th>
                <th className="text-left px-3 py-3 text-gray-600 font-medium whitespace-nowrap">
                  担当者
                </th>
                <th className="text-left px-3 py-3 text-gray-600 font-medium whitespace-nowrap">
                  保険会社
                </th>
                <th className="text-left px-3 py-3 text-gray-600 font-medium whitespace-nowrap">
                  満期日
                </th>
                <th className="text-left px-3 py-3 text-gray-600 font-medium whitespace-nowrap">
                  種目
                </th>
                <th className="text-right px-3 py-3 text-gray-600 font-medium whitespace-nowrap">
                  前年保険料
                </th>
                <th className="text-left px-3 py-3 text-gray-600 font-medium whitespace-nowrap">
                  手続き手段
                </th>
                <th className="text-left px-3 py-3 text-gray-600 font-medium whitespace-nowrap">
                  状況
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cases.map((rc) => {
                const days = daysUntilMaturity(rc.maturityDate);
                const near = isMaturityNear(rc.maturityDate);
                const expired = days <= 0;

                return (
                  <tr
                    key={rc.id}
                    className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${
                      expired ? "bg-red-50/30" : near ? "bg-orange-50/30" : ""
                    }`}
                    onClick={() => navigate(`/renewals/${rc.id}`)}
                  >
                    {/* 契約者 */}
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {rc.contractorName || (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    {/* 団体名 */}
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                      {rc.groupName ? (
                        <span>{rc.groupName}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    {/* 担当者 */}
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                      {getUserName(rc.ownerUserId)}
                    </td>
                    {/* 保険会社 */}
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                      {rc.insurer}
                    </td>
                    {/* 満期日 + 残日数 */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={
                          expired
                            ? "font-semibold text-red-600"
                            : near
                              ? "font-semibold text-orange-600"
                              : "text-gray-700"
                        }
                      >
                        {rc.maturityDate}
                      </span>
                      <span className="ml-2">
                        {expired ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            期限切れ
                          </span>
                        ) : near ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {days}日後
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400">
                            {days}日後
                          </span>
                        )}
                      </span>
                    </td>
                    {/* 種目 */}
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                      {RENEWAL_PRODUCT_TYPE_LABEL[rc.productType]}
                    </td>
                    {/* 前年保険料 */}
                    <td className="px-3 py-3 text-right text-gray-700 whitespace-nowrap tabular-nums">
                      {rc.prevYearPremium != null ? (
                        `¥${rc.prevYearPremium.toLocaleString()}`
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    {/* 手続き手段 */}
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                      {RENEWAL_METHOD_LABEL[rc.method]}
                    </td>
                    {/* 状況バッジ */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[rc.status]}`}
                      >
                        {RENEWAL_STATUS_LABEL[rc.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
