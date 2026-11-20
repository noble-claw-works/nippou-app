// ExpectedRevenueCard.tsx — 見込み収益カード（B2 / Q4）
// = Σ(初年度手数料 × 確度)。成約予定日なしは「期間未定」で別枠。
import { useMemo } from "react";
import type { Opportunity } from "../../types";
import { calcExpectedRevenue } from "../../utils/expectedRevenue";

interface Props {
  opportunities: Opportunity[];
  ownerIds: string[];
}

const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

export function ExpectedRevenueCard({ opportunities, ownerIds }: Props) {
  const r = useMemo(() => calcExpectedRevenue(opportunities, ownerIds), [opportunities, ownerIds]);
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4" data-testid="expected-revenue-card">
      <h3 className="text-sm font-semibold text-gray-700">見込み収益</h3>
      <p className="text-xs text-gray-500 mb-2">進行中案件の 初年度手数料 × 確度 の合計</p>
      <p className="text-2xl font-bold text-gray-900" data-testid="expected-revenue-total">
        {yen(r.total)}
      </p>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1">成約予定月別</p>
          {r.scheduled.length === 0 ? (
            <p className="text-xs text-gray-400">成約予定日のある案件はありません</p>
          ) : (
            <ul className="text-sm space-y-0.5">
              {r.scheduled.map((b) => (
                <li key={b.key} className="flex justify-between">
                  <span>{b.key}</span>
                  <span>{yen(b.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div data-testid="expected-revenue-undecided">
          <p className="text-xs font-semibold text-gray-600 mb-1">期間未定（成約予定日なし）</p>
          <p className="text-sm">{yen(r.undecided.amount)}</p>
          <p className="text-xs text-gray-400">{r.undecided.productCount} 商品</p>
        </div>
      </div>
      {(r.missingCommissionCount > 0 || r.missingConfidenceCount > 0) && (
        <p className="text-xs text-amber-600 mt-2">
          {r.missingCommissionCount > 0 && `手数料未入力 ${r.missingCommissionCount} 商品は含まれません。`}
          {r.missingConfidenceCount > 0 && `確度未設定 ${r.missingConfidenceCount} 件は 0 円扱いです。`}
        </p>
      )}
    </div>
  );
}
