// =====================================================
// TargetProgressCard — 選択期間の詳細達成率 + ロールアップ内訳
// =====================================================
import { Settings } from 'lucide-react';
import type { Policy, SalesTarget } from '../../types';
import type { PeriodType } from '../../utils/salesPeriod';
import { periodLabel, periodsOfYear } from '../../utils/salesPeriod';
import {
  calcAchievement,
  achievementRate,
  rollupAchievements,
  checkTargetRollup,
} from '../../utils/salesMetrics';

interface Props {
  policies: Policy[];
  ownerIds: string[];
  target: SalesTarget | undefined;
  periodType: PeriodType;
  period: string;
  /** manager 以上: 目標設定ボタンを表示 */
  canEditTarget?: boolean;
  onEditTarget?: () => void;
}

function rateColor(rate: number): string {
  if (rate >= 100) return 'bg-green-500';
  if (rate >= 70) return 'bg-blue-500';
  return 'bg-orange-500';
}

function rateBadge(rate: number): { label: string; cls: string } {
  if (rate >= 100) return { label: '✅ 達成', cls: 'bg-green-100 text-green-700' };
  if (rate >= 70) return { label: '🔵 進行中', cls: 'bg-blue-100 text-blue-700' };
  return { label: '⚠ 未達', cls: 'bg-orange-100 text-orange-700' };
}

export function TargetProgressCard({
  policies,
  ownerIds,
  target,
  periodType,
  period,
  canEditTarget,
  onEditTarget,
}: Props) {
  const ach = calcAchievement(policies, ownerIds, periodType, period);
  const countRate = achievementRate(ach.policyCount, target?.targetPolicyCount ?? 0);
  const premRate = achievementRate(ach.premium, target?.targetPremium ?? 0);

  const rollup = rollupAchievements(policies, ownerIds, periodType, period);

  // ロールアップ整合バッジ用: 年間 vs 四半期×4
  let rollupConsistency = null;
  if (periodType !== 'monthly' && target) {
    const year = period.slice(0, 4);
    const subType: PeriodType = periodType === 'annual' ? 'quarterly' : 'monthly';
    const subPeriods = periodsOfYear(Number(year), subType);
    // children はシード上の targets から引く（この関数は props にないため省略。バッジは実績側のみ）
    const childTotals = subPeriods.map(p =>
      calcAchievement(policies, ownerIds, subType, p).policyCount,
    );
    const total = childTotals.reduce((a, b) => a + b, 0);
    if (total !== ach.policyCount) {
      // 実績は常に整合するはずだが念のため
      rollupConsistency = `Σ = ${total}件`;
    }
  }

  if (!target) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">
            🎯 目標対比 ({periodLabel(periodType, period)})
          </h3>
          {canEditTarget && (
            <button
              onClick={onEditTarget}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Settings className="w-3 h-3" />
              目標を設定
            </button>
          )}
        </div>
        <p className="text-sm text-gray-400">この期間の目標は未設定です</p>
        <p className="text-xs text-gray-500 mt-1">
          実績: 成約 {ach.policyCount}件 / 申込中 {ach.pendingCount}件
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          🎯 目標対比 ({periodLabel(periodType, period)})
        </h3>
        <div className="flex items-center gap-2">
          {rollupConsistency && (
            <span className="text-xs text-gray-400">{rollupConsistency}</span>
          )}
          {canEditTarget && (
            <button
              onClick={onEditTarget}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600"
            >
              <Settings className="w-3 h-3" />
              編集
            </button>
          )}
        </div>
      </div>

      {/* 件数ゲージ */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">成約件数</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-800">{ach.policyCount}件</span>
            <span className="text-xs text-gray-400">/ {target.targetPolicyCount}件</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${rateBadge(countRate).cls}`}>
              {countRate}% {rateBadge(countRate).label}
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${rateColor(countRate)}`}
            style={{ width: `${Math.min(countRate, 100)}%` }}
          />
        </div>
        {ach.pendingCount > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">申込中(見込み): {ach.pendingCount}件</p>
        )}
      </div>

      {/* 保険料ゲージ */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">月換算保険料</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-800">
              ¥{ach.premium.toLocaleString()}
            </span>
            <span className="text-xs text-gray-400">/ ¥{target.targetPremium.toLocaleString()}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${rateBadge(premRate).cls}`}>
              {premRate}%
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${rateColor(premRate)}`}
            style={{ width: `${Math.min(premRate, 100)}%` }}
          />
        </div>
      </div>

      {/* ロールアップ内訳 (年間→四半期 / 四半期→月次) */}
      {periodType !== 'monthly' && rollup.length > 1 && (
        <div className="border-t border-gray-100 pt-3 mt-1">
          <p className="text-xs text-gray-400 mb-1.5">
            内訳({periodType === 'annual' ? '四半期' : '月次'})
          </p>
          <div className="flex gap-2 overflow-x-auto">
            {rollup.map(({ period: p, ach: a }) => (
              <div
                key={p}
                className="flex-shrink-0 bg-gray-50 rounded-lg px-2 py-1.5 text-center min-w-[56px]"
              >
                <p className="text-xs text-gray-500">
                  {periodType === 'annual' ? p.split('-Q')[1] && `Q${p.split('-Q')[1]}` : `${Number(p.slice(5, 7))}月`}
                </p>
                <p className="text-sm font-semibold text-gray-800">{a.policyCount}件</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
