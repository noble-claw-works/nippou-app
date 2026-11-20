// =====================================================
// PeriodAchievementCard — 1枚=当該期間の達成率カード
// =====================================================
import type { SalesTarget } from '../../types';
import type { Achievement } from '../../utils/salesMetrics';
import { achievementRate } from '../../utils/salesMetrics';
import type { PeriodType } from '../../utils/salesPeriod';
import { periodLabel } from '../../utils/salesPeriod';

interface Props {
  period: string;
  periodType: PeriodType;
  achievement: Achievement;
  target: SalesTarget | undefined;
  isCurrent: boolean;
  isSelected: boolean;
  onClick: () => void;
}

function rateBarColor(rate: number): string {
  if (rate >= 100) return 'bg-green-500';
  if (rate >= 70) return 'bg-blue-500';
  return 'bg-orange-400';
}

function rateTextColor(rate: number): string {
  if (rate >= 100) return 'text-green-700';
  if (rate >= 70) return 'text-blue-700';
  return 'text-orange-600';
}

export function PeriodAchievementCard({
  period,
  periodType,
  achievement,
  target,
  isCurrent,
  isSelected,
  onClick,
}: Props) {
  const countRate = achievementRate(achievement.policyCount, target?.targetPolicyCount ?? 0);
  const premRate = achievementRate(achievement.premium, target?.targetPremium ?? 0);
  const hasTarget = !!target;

  return (
    <button
      onClick={onClick}
      data-period={period}
      data-current={isCurrent ? 'true' : undefined}
      className={`
        flex-shrink-0 w-[110px] rounded-xl border p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-400
        ${isCurrent
          ? 'border-blue-400 bg-blue-50 shadow-sm'
          : isSelected
          ? 'border-blue-300 bg-blue-50/50'
          : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50'
        }
      `}
    >
      {/* ラベル行 */}
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-xs font-semibold ${isCurrent ? 'text-blue-700' : 'text-gray-600'}`}>
          {periodLabel(periodType, period)}
        </span>
        {isCurrent && (
          <span className="text-[9px] bg-blue-600 text-white px-1 rounded">今期</span>
        )}
      </div>

      {!hasTarget ? (
        <p className="text-[11px] text-gray-300 mt-1">未設定</p>
      ) : (
        <>
          {/* 達成率 (件数) */}
          <div className="mb-1">
            <div className="flex items-end justify-between mb-0.5">
              <span className="text-[10px] text-gray-400">件数</span>
              <span className={`text-sm font-bold ${rateTextColor(countRate)}`}>
                {countRate}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${rateBarColor(countRate)}`}
                style={{ width: `${Math.min(countRate, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {achievement.policyCount} / {target.targetPolicyCount}件
            </p>
          </div>

          {/* 達成率 (保険料) */}
          <div>
            <div className="flex items-end justify-between mb-0.5">
              <span className="text-[10px] text-gray-400">保険料</span>
              <span className={`text-xs font-semibold ${rateTextColor(premRate)}`}>
                {premRate}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1">
              <div
                className={`h-1 rounded-full ${rateBarColor(premRate)}`}
                style={{ width: `${Math.min(premRate, 100)}%` }}
              />
            </div>
          </div>
        </>
      )}
    </button>
  );
}
