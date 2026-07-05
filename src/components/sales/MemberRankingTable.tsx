// =====================================================
// MemberRankingTable — メンバー別達成率ランキング
// =====================================================
import { useNavigate } from 'react-router-dom';
import type { Policy, SalesTarget, User } from '../../types';
import type { PeriodType } from '../../utils/salesPeriod';
import { calcAchievement, achievementRate } from '../../utils/salesMetrics';

interface Props {
  members: User[];
  policies: Policy[];
  salesTargets: SalesTarget[];
  periodType: PeriodType;
  period: string;
}

interface RankRow {
  user: User;
  policyCount: number;
  targetCount: number;
  countRate: number;
  premium: number;
  targetPremium: number;
  premRate: number;
}

export function MemberRankingTable({
  members,
  policies,
  salesTargets,
  periodType,
  period,
}: Props) {
  const navigate = useNavigate();

  const rows: RankRow[] = members
    .map(u => {
      const ach = calcAchievement(policies, [u.id], periodType, period);
      const target = salesTargets.find(
        t =>
          t.scope === 'individual' &&
          t.ownerId === u.id &&
          t.periodType === periodType &&
          t.period === period,
      );
      return {
        user: u,
        policyCount: ach.policyCount,
        targetCount: target?.targetPolicyCount ?? 0,
        countRate: achievementRate(ach.policyCount, target?.targetPolicyCount ?? 0),
        premium: ach.premium,
        targetPremium: target?.targetPremium ?? 0,
        premRate: achievementRate(ach.premium, target?.targetPremium ?? 0),
      };
    })
    .sort((a, b) => b.countRate - a.countRate || b.premRate - a.premRate);

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-400">表示対象メンバーがいません</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">🏆 メンバー別達成率</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left py-1.5 pr-3">順位</th>
              <th className="text-left py-1.5 pr-3">メンバー</th>
              <th className="text-right py-1.5 pr-3">件数</th>
              <th className="text-right py-1.5 pr-3">達成率(件数)</th>
              <th className="text-right py-1.5">達成率(保険料)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.user.id}
                onClick={() =>
                  navigate(
                    `/sales-dashboard?user=${row.user.id}&pt=${periodType}&period=${period}`,
                  )
                }
                className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
              >
                <td className="py-2 pr-3 text-gray-400 font-medium">#{i + 1}</td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-medium flex-shrink-0">
                      {row.user.avatarInitials}
                    </span>
                    <span className="text-gray-800">{row.user.name}</span>
                  </div>
                </td>
                <td className="py-2 pr-3 text-right text-gray-700">
                  {row.policyCount}
                  {row.targetCount > 0 && (
                    <span className="text-xs text-gray-400"> / {row.targetCount}</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      row.countRate >= 100
                        ? 'bg-green-100 text-green-700'
                        : row.countRate >= 70
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {row.targetCount > 0 ? `${row.countRate}%` : '-'}
                  </span>
                </td>
                <td className="py-2 text-right">
                  <span className="text-xs text-gray-500">
                    {row.targetPremium > 0 ? `${row.premRate}%` : '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
