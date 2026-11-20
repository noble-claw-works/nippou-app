// =====================================================
// TeamSummaryCard — チーム集計 + 整合バッジ
// =====================================================
import { Settings } from 'lucide-react';
import type { Policy, SalesTarget, Team } from '../../types';
import type { PeriodType } from '../../utils/salesPeriod';
import { periodLabel } from '../../utils/salesPeriod';
import { calcAchievement, achievementRate } from '../../utils/salesMetrics';

interface Props {
  team: Team;
  policies: Policy[];
  target: SalesTarget | undefined;
  periodType: PeriodType;
  period: string;
  canEditTarget?: boolean;
  onEditTarget?: () => void;
}

function rateColor(rate: number): string {
  if (rate >= 100) return 'bg-green-500';
  if (rate >= 70) return 'bg-blue-500';
  return 'bg-orange-400';
}

export function TeamSummaryCard({
  team,
  policies,
  target,
  periodType,
  period,
  canEditTarget,
  onEditTarget,
}: Props) {
  const memberIds = team.memberIds;
  const ach = calcAchievement(policies, memberIds, periodType, period);
  const countRate = achievementRate(ach.policyCount, target?.targetPolicyCount ?? 0);
  const premRate = achievementRate(ach.premium, target?.targetPremium ?? 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">
            📈 チーム集計: {team.name}
          </h3>
          <p className="text-xs text-gray-400">{periodLabel(periodType, period)} · {memberIds.length}名</p>
        </div>
        {canEditTarget && (
          <button
            onClick={onEditTarget}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600"
          >
            <Settings className="w-3 h-3" />
            {target ? '目標編集' : '目標設定'}
          </button>
        )}
      </div>

      {!target ? (
        <p className="text-sm text-gray-400">チーム目標は未設定です</p>
      ) : (
        <>
          {/* 件数 */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">成約件数</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-800">{ach.policyCount}件</span>
                <span className="text-xs text-gray-400">/ {target.targetPolicyCount}件</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    countRate >= 100
                      ? 'bg-green-100 text-green-700'
                      : countRate >= 70
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {countRate}%
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${rateColor(countRate)}`}
                style={{ width: `${Math.min(countRate, 100)}%` }}
              />
            </div>
          </div>

          {/* 保険料 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">月換算保険料</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-800">
                  ¥{ach.premium.toLocaleString()}
                </span>
                <span className="text-xs text-gray-400">/ ¥{target.targetPremium.toLocaleString()}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    premRate >= 100
                      ? 'bg-green-100 text-green-700'
                      : premRate >= 70
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {premRate}%
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${rateColor(premRate)}`}
                style={{ width: `${Math.min(premRate, 100)}%` }}
              />
            </div>
          </div>
        </>
      )}

      {/* 見込み表示 */}
      {ach.pendingCount > 0 && (
        <p className="text-xs text-gray-400 mt-2">申込中(見込み): {ach.pendingCount}件</p>
      )}
    </div>
  );
}
