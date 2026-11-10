// =====================================================
// RecentPoliciesPanel — 選択期間の成約 Policy 一覧
// =====================================================
import { Link } from 'react-router-dom';
import type { Policy } from '../../types';
import type { PeriodType } from '../../utils/salesPeriod';
import { dateInPeriod } from '../../utils/salesPeriod';
import { monthlyEquivPremium } from '../../utils/salesMetrics';

interface Props {
  policies: Policy[];
  ownerIds: string[];
  periodType: PeriodType;
  period: string;
}

const PRODUCT_LABELS: Record<string, string> = {
  life: '生命保険',
  medical: '医療保険',
  cancer: 'がん保険',
  income: '就業不能保険',
  nursing: '介護保険',
  savings: '学資・貯蓄',
  auto: '自動車保険',
  fire: '火災保険',
  liability: '賠償責任保険',
  other: 'その他',
};

export function RecentPoliciesPanel({ policies, ownerIds, periodType, period }: Props) {
  const mine = policies.filter(p => ownerIds.includes(p.ownerId));
  const achieved = mine.filter(
    p => p.status === 'inforce' && dateInPeriod(p.startDate, periodType, period),
  );
  const pending = mine.filter(
    p => p.status === 'pending' && dateInPeriod(p.startDate, periodType, period),
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        📋 成約契約
        <span className="ml-2 text-xs font-normal text-gray-400">{achieved.length}件</span>
      </h3>

      {achieved.length === 0 && pending.length === 0 && (
        <p className="text-sm text-gray-400">この期間の成約・申込中の契約はありません</p>
      )}

      {/* 成約済み */}
      <div className="space-y-1.5">
        {achieved.map(p => (
          <Link
            key={p.id}
            to={`/policies/${p.id}`}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 border border-gray-100"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 truncate">{p.productName}</p>
              <p className="text-xs text-gray-400">
                {PRODUCT_LABELS[p.productCategory] ?? p.productCategory} ·{' '}
                {p.insurer}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-gray-700">
                ¥{monthlyEquivPremium(p).toLocaleString()}/月
              </p>
              <p className="text-xs text-green-600">✅ 成約</p>
            </div>
          </Link>
        ))}
      </div>

      {/* 申込中(見込み) */}
      {pending.length > 0 && (
        <>
          <p className="text-xs text-gray-400 mt-3 mb-1.5">
            申込中(見込み) {pending.length}件
          </p>
          <div className="space-y-1.5">
            {pending.map(p => (
              <Link
                key={p.id}
                to={`/policies/${p.id}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 border border-dashed border-gray-200 opacity-70"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 truncate">{p.productName}</p>
                  <p className="text-xs text-gray-400">
                    {PRODUCT_LABELS[p.productCategory] ?? p.productCategory} ·{' '}
                    {p.insurer}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm text-gray-500">
                    ¥{monthlyEquivPremium(p).toLocaleString()}/月
                  </p>
                  <p className="text-xs text-orange-500">⏳ 申込中</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
