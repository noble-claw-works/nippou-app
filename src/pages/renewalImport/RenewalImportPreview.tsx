// =====================================================
// RenewalImportPreview — STEP 2 プレビューテーブル + 突合確認
// =====================================================
import { CheckCircle2, AlertTriangle } from "lucide-react";
import type { MatchedImportRow } from "../../utils/matchRenewalHousehold";
import {
  RENEWAL_METHOD_LABEL,
  RENEWAL_PRODUCT_TYPE_LABEL,
} from "../../utils/renewalLabels";
import { parseProductType, parseMethod, parsePremium } from "./parsers";

interface RenewalImportPreviewProps {
  preview: MatchedImportRow[];
  matchedCount: number;
  unmatchedCount: number;
}

export function RenewalImportPreview({
  preview,
  matchedCount,
  unmatchedCount,
}: RenewalImportPreviewProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
          2
        </span>
        プレビュー・突合確認
      </h2>

      {/* 突合サマリ */}
      <div className="flex gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span className="text-green-700 font-medium">
            突合済み {matchedCount}件
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-amber-700 font-medium">
            未突合 {unmatchedCount}件
          </span>
        </div>
      </div>

      {/* プレビューテーブル */}
      <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2.5 text-gray-600 font-medium whitespace-nowrap">
                突合
              </th>
              <th className="text-left px-3 py-2.5 text-gray-600 font-medium whitespace-nowrap">
                契約者
              </th>
              <th className="text-left px-3 py-2.5 text-gray-600 font-medium whitespace-nowrap">
                団体名
              </th>
              <th className="text-left px-3 py-2.5 text-gray-600 font-medium whitespace-nowrap">
                担当者
              </th>
              <th className="text-left px-3 py-2.5 text-gray-600 font-medium whitespace-nowrap">
                保険会社
              </th>
              <th className="text-left px-3 py-2.5 text-gray-600 font-medium whitespace-nowrap">
                満期日
              </th>
              <th className="text-left px-3 py-2.5 text-gray-600 font-medium whitespace-nowrap">
                種目
              </th>
              <th className="text-right px-3 py-2.5 text-gray-600 font-medium whitespace-nowrap">
                前年保険料
              </th>
              <th className="text-left px-3 py-2.5 text-gray-600 font-medium whitespace-nowrap">
                手続き手段
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {preview.map((row, idx) => {
              const matched = row.matchStatus === "matched";
              const premium = parsePremium(row.prevYearPremium);
              const productType = parseProductType(row.productType);
              const method = parseMethod(row.method);
              return (
                <tr
                  key={idx}
                  className={matched ? "bg-white" : "bg-amber-50/30"}
                >
                  {/* 突合結果 */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {matched ? (
                      <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        突合済✓
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        未突合⚠
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-gray-900 font-medium whitespace-nowrap">
                    {row.contractorName || (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                    {row.groupName || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                    {row.ownerName || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                    {row.insurer}
                  </td>
                  <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                    {row.maturityDate}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                    {RENEWAL_PRODUCT_TYPE_LABEL[productType]}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-700 whitespace-nowrap tabular-nums">
                    {premium != null ? (
                      `¥${premium.toLocaleString()}`
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                    {RENEWAL_METHOD_LABEL[method]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {unmatchedCount > 0 && (
        <p className="mt-3 text-xs text-amber-600 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          未突合の行は世帯情報が紐付かない状態で取り込まれます。取り込み後に詳細ページから手動で紐付けてください。
        </p>
      )}
    </div>
  );
}
