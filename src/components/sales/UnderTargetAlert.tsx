// =====================================================
// UnderTargetAlert — 未達アラート
// =====================================================
import { useNavigate } from 'react-router-dom';
import type { Policy, SalesTarget, User } from '../../types';
import type { PeriodType } from '../../utils/salesPeriod';
import { calcAchievement, achievementRate, UNDER_TARGET_THRESHOLD } from '../../utils/salesMetrics';

interface Props {
  members: User[];
  policies: Policy[];
  salesTargets: SalesTarget[];
  periodType: PeriodType;
  period: string;
}

export function UnderTargetAlert({ members, policies, salesTargets, periodType, period }: Props) {
  const navigate = useNavigate();

  const underMembers = members.filter(u => {
    const target = salesTargets.find(
      t =>
        t.scope === 'individual' &&
        t.ownerId === u.id &&
        t.periodType === periodType &&
        t.period === period,
    );
    if (!target) return false;
    const ach = calcAchievement(policies, [u.id], periodType, period);
    const rate = achievementRate(ach.policyCount, target.targetPolicyCount);
    return rate < UNDER_TARGET_THRESHOLD;
  });

  if (underMembers.length === 0) return null;

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-orange-700 mb-2">
        ⚠ 未達アラート ({underMembers.length}名 — 達成率 {UNDER_TARGET_THRESHOLD}% 未満)
      </h3>
      <div className="flex flex-wrap gap-2">
        {underMembers.map(u => {
          const target = salesTargets.find(
            t =>
              t.scope === 'individual' &&
              t.ownerId === u.id &&
              t.periodType === periodType &&
              t.period === period,
          )!;
          const ach = calcAchievement(policies, [u.id], periodType, period);
          const rate = achievementRate(ach.policyCount, target.targetPolicyCount);
          return (
            <button
              key={u.id}
              onClick={() =>
                navigate(
                  `/dashboard?tab=personal&user=${u.id}&pt=${periodType}&period=${period}`,
                )
              }
              className="flex items-center gap-2 bg-white border border-orange-200 rounded-lg px-3 py-2 hover:bg-orange-50 transition-colors"
            >
              <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs flex items-center justify-center font-medium">
                {u.avatarInitials}
              </span>
              <div className="text-left">
                <p className="text-xs font-medium text-gray-800">{u.name}</p>
                <p className="text-xs text-orange-600">
                  {ach.policyCount}件 / {target.targetPolicyCount}件 ({rate}%)
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
