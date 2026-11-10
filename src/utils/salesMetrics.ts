// =====================================================
// salesMetrics.ts — 達成率・ファネル・権限算出（純関数）
// =====================================================
import type { Policy, Opportunity, User, Team } from '../types';
import type { OpportunityStage } from '../types';
import { dateInPeriod, childPeriods, type PeriodType } from './salesPeriod';
import { getSubordinatesOf } from './orgChart';
import type { Role } from '../types';

/** 未達判定閾値(達成率%) */
export const UNDER_TARGET_THRESHOLD = 70;

/** 契約の月換算保険料。monthly が無ければ annual/12 にフォールバック */
export function monthlyEquivPremium(
  p: Pick<Policy, 'monthlyPremium' | 'annualPremium'>,
): number {
  if (p.monthlyPremium && p.monthlyPremium > 0) return p.monthlyPremium;
  if (p.annualPremium && p.annualPremium > 0) return Math.round(p.annualPremium / 12);
  return 0;
}

/** period(type) に成約(発効)した inforce 契約か */
export function isAchievedInPeriod(p: Policy, type: PeriodType, period: string): boolean {
  return p.status === 'inforce' && dateInPeriod(p.startDate, type, period);
}

export interface Achievement {
  policyCount: number;
  premium: number;        // 月換算保険料合計
  pendingCount: number;   // 申込中 (見込み・別表示)
  pendingPremium: number;
}

/** owner(User.id) 群の実績を集計。ownerId は Policy.ownerId に対応 */
export function calcAchievement(
  policies: Policy[],
  ownerIds: string[],
  type: PeriodType,
  period: string,
): Achievement {
  const mine = policies.filter(p => ownerIds.includes(p.ownerId));
  const achieved = mine.filter(p => isAchievedInPeriod(p, type, period));
  const pending = mine.filter(
    p => p.status === 'pending' && dateInPeriod(p.startDate, type, period),
  );
  return {
    policyCount: achieved.length,
    premium: achieved.reduce((s, p) => s + monthlyEquivPremium(p), 0),
    pendingCount: pending.length,
    pendingPremium: pending.reduce((s, p) => s + monthlyEquivPremium(p), 0),
  };
}

/** 達成率 (%). 目標0のとき: 実績>0 なら 100 扱い、実績0なら 0 */
export function achievementRate(actual: number, target: number): number {
  if (target <= 0) return actual > 0 ? 100 : 0;
  return Math.round((actual / target) * 100);
}

// ファネルステージ順
const FUNNEL_ORDER: OpportunityStage[] = [
  'approach',
  'fact_finding',
  'needs_analysis',
  'proposal',
  'negotiation',
  'application',
  'underwriting',
  'issued',
];

export function calcFunnel(
  opps: Opportunity[],
  ownerIds: string[],
): Record<OpportunityStage, number> {
  const mine = opps.filter(o => ownerIds.includes(o.ownerId));
  const base = Object.fromEntries(FUNNEL_ORDER.map(s => [s, 0])) as Record<OpportunityStage, number>;
  base.lost = 0;
  for (const o of mine) {
    base[o.stage] = (base[o.stage] ?? 0) + 1;
  }
  return base;
}

/** 上位 period の下位内訳を返す(ロールアップ表示用) */
export function rollupAchievements(
  policies: Policy[],
  ownerIds: string[],
  type: PeriodType,
  period: string,
): { period: string; ach: Achievement }[] {
  const { monthly, quarterly } = childPeriods(type, period);
  if (type === 'annual') {
    return quarterly.map(q => ({
      period: q,
      ach: calcAchievement(policies, ownerIds, 'quarterly', q),
    }));
  }
  if (type === 'quarterly') {
    return monthly.map(m => ({
      period: m,
      ach: calcAchievement(policies, ownerIds, 'monthly', m),
    }));
  }
  return [{ period, ach: calcAchievement(policies, ownerIds, 'monthly', period) }];
}

export interface TargetConsistency {
  annualTarget?: number;   // 上位目標(件数 or 保険料)
  sumOfChildren?: number;  // 下位目標の合計
  gap?: number;            // upper - Σchild
  status: 'ok' | 'over' | 'under' | 'no_data';
}

/** 上位目標と下位目標合計の整合をチェック(件数・保険料それぞれで呼ぶ) */
export function checkTargetRollup(
  upper: number | undefined,
  children: number[],
): TargetConsistency {
  if (upper == null || children.length === 0) return { status: 'no_data' };
  const sum = children.reduce((s, n) => s + n, 0);
  const gap = upper - sum;
  return {
    annualTarget: upper,
    sumOfChildren: sum,
    gap,
    status: gap === 0 ? 'ok' : gap > 0 ? 'under' : 'over',
  };
}

/** 切替可能な対象ユーザー集合を返す(権限別) */
export function getScopeUsers(
  role: Role,
  userId: string,
  users: User[],
  teams: Team[],
): User[] {
  if (role === 'general') return users.filter(u => u.id === userId);
  if (role === 'manager') {
    const subs = getSubordinatesOf(userId, users, teams);
    const self = users.find(u => u.id === userId);
    return self ? [self, ...subs.filter(s => s.id !== userId)] : subs;
  }
  // executive / admin
  return users.filter(u => u.role === 'general' || u.role === 'manager');
}
