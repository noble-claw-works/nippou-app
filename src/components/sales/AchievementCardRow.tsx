// =====================================================
// AchievementCardRow — 達成カード横並びレーン
// monthly=12枚 / quarterly=4枚 / annual=1枚
// =====================================================
import { useEffect, useRef } from 'react';
import type { Policy, SalesTarget } from '../../types';
import type { PeriodType } from '../../utils/salesPeriod';
import { periodsOfYear, toPeriod } from '../../utils/salesPeriod';
import { calcAchievement } from '../../utils/salesMetrics';
import { PeriodAchievementCard } from './PeriodAchievementCard';

interface Props {
  policies: Policy[];
  ownerIds: string[];
  salesTargets: SalesTarget[];
  targetOwnerId: string;      // 個人なら User.id / チームなら Team.id
  targetScope: 'individual' | 'team';
  year: number;
  periodType: PeriodType;
  selectedPeriod: string;
  onSelectPeriod: (period: string) => void;
}

export function AchievementCardRow({
  policies,
  ownerIds,
  salesTargets,
  targetOwnerId,
  targetScope,
  year,
  periodType,
  selectedPeriod,
  onSelectPeriod,
}: Props) {
  const rowRef = useRef<HTMLDivElement>(null);
  const periods = periodsOfYear(year, periodType);
  const currentPeriod = toPeriod(new Date(), periodType);

  // 当期カードへオートスクロール
  useEffect(() => {
    if (!rowRef.current) return;
    const el = rowRef.current.querySelector<HTMLElement>('[data-current="true"]');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [year, periodType]);

  return (
    <div
      ref={rowRef}
      className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory"
      style={{ scrollbarWidth: 'thin' }}
      aria-label={`${year}年 ${periodType === 'monthly' ? '月次' : periodType === 'quarterly' ? '四半期' : '年間'} 達成カードレーン`}
    >
      {periods.map(p => {
        const target = salesTargets.find(
          t =>
            t.scope === targetScope &&
            t.ownerId === targetOwnerId &&
            t.periodType === periodType &&
            t.period === p,
        );
        const ach = calcAchievement(policies, ownerIds, periodType, p);
        return (
          <div key={p} className="snap-start">
            <PeriodAchievementCard
              period={p}
              periodType={periodType}
              achievement={ach}
              target={target}
              isCurrent={p === currentPeriod}
              isSelected={p === selectedPeriod}
              onClick={() => onSelectPeriod(p)}
            />
          </div>
        );
      })}
    </div>
  );
}
