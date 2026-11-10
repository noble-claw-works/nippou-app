import { describe, it, expect } from 'vitest';
import {
  achievementRate,
  calcAchievement,
  rollupAchievements,
  checkTargetRollup,
  getScopeUsers,
  calcFunnel,
} from '../utils/salesMetrics';
import type { Policy, User, Team, Opportunity } from '../types';

// =====================================================
// フィクスチャ
// =====================================================
const makePolicy = (
  id: string,
  ownerId: string,
  startDate: string,
  status: Policy['status'] = 'inforce',
  monthlyPremium = 10000,
): Policy => ({
  id,
  policyNumber: id,
  householdId: 'c1',
  ownerId,
  contractorPersonId: 'p1',
  insuredPersonIds: ['p1'],
  insurer: 'テスト生命',
  productName: 'テスト商品',
  productCategory: 'life',
  status,
  startDate,
  monthlyPremium,
  payMode: 'monthly',
  hasCashValue: false,
  coverages: [],
  tags: [],
  memo: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const policies: Policy[] = [
  // u1: 2026年1月成約 (月次)
  makePolicy('p1', 'u1', '2026-01-15', 'inforce', 10000),
  // u1: 2026年3月成約 (Q1)
  makePolicy('p2', 'u1', '2026-03-01', 'inforce', 20000),
  // u1: 2026年4月成約 (Q2)
  makePolicy('p3', 'u1', '2026-04-10', 'inforce', 15000),
  // u1: 2026年7月成約 (Q3)
  makePolicy('p4', 'u1', '2026-07-05', 'inforce', 12000),
  // u1: 2026年12月成約
  makePolicy('p5', 'u1', '2026-12-01', 'inforce', 8000),
  // u2: 2026年7月成約
  makePolicy('p6', 'u2', '2026-07-20', 'inforce', 18000),
  // u1: 申込中 (2026年7月)
  makePolicy('p7', 'u1', '2026-07-15', 'pending', 5000),
  // 2025年の成約 (テスト用)
  makePolicy('p8', 'u1', '2025-07-01', 'inforce', 9000),
];

const users: User[] = [
  { id: 'u1', name: '霧島', email: 'u1@example.com', role: 'general', teamIds: ['t1'], status: 'active', avatarInitials: '霧' },
  { id: 'u2', name: '田中', email: 'u2@example.com', role: 'general', teamIds: ['t2'], status: 'active', avatarInitials: '田' },
  { id: 'u3', name: '山田', email: 'u3@example.com', role: 'general', teamIds: ['t1'], status: 'active', avatarInitials: '山' },
  { id: 'u4', name: '佐藤', email: 'u4@example.com', role: 'manager', teamIds: ['t1'], status: 'active', avatarInitials: '佐' },
  { id: 'u5', name: '鈴木', email: 'u5@example.com', role: 'executive', teamIds: [], status: 'active', avatarInitials: '鈴' },
];

const teams: Team[] = [
  { id: 't1', name: '営業1課', managerIds: ['u4'], memberIds: ['u1', 'u3', 'u4'] },
  { id: 't2', name: '営業2課', managerIds: [], memberIds: ['u2'] },
];

// =====================================================
// achievementRate
// =====================================================
describe('achievementRate', () => {
  it('通常: 達成率を四捨五入で返す', () => {
    expect(achievementRate(3, 10)).toBe(30);
    expect(achievementRate(10, 10)).toBe(100);
    expect(achievementRate(11, 10)).toBe(110);
  });

  it('目標 0: 実績 > 0 なら 100', () => {
    expect(achievementRate(1, 0)).toBe(100);
  });

  it('目標 0: 実績も 0 なら 0', () => {
    expect(achievementRate(0, 0)).toBe(0);
  });

  it('未達: 68% を正しく計算', () => {
    expect(achievementRate(2, 3)).toBe(67); // 66.67... → 67
  });
});

// =====================================================
// calcAchievement
// =====================================================
describe('calcAchievement', () => {
  it('monthly: 指定月の成約を集計', () => {
    const r = calcAchievement(policies, ['u1'], 'monthly', '2026-01');
    expect(r.policyCount).toBe(1);
    expect(r.premium).toBe(10000);
    expect(r.pendingCount).toBe(0);
  });

  it('monthly: 申込中を pendingCount で別掲', () => {
    const r = calcAchievement(policies, ['u1'], 'monthly', '2026-07');
    expect(r.policyCount).toBe(1);   // p4 のみ inforce
    expect(r.pendingCount).toBe(1);  // p7 が pending
  });

  it('quarterly: Q1 = 1月 + 2月 + 3月', () => {
    // p1 (1月) + p2 (3月) = 2件
    const r = calcAchievement(policies, ['u1'], 'quarterly', '2026-Q1');
    expect(r.policyCount).toBe(2);
    expect(r.premium).toBe(30000);
  });

  it('quarterly: Q3 = 7月-9月', () => {
    // p4 (7月) = 1件
    const r = calcAchievement(policies, ['u1'], 'quarterly', '2026-Q3');
    expect(r.policyCount).toBe(1);
  });

  it('annual: 2026年全体を集計', () => {
    // p1 (1月) + p2 (3月) + p3 (4月) + p4 (7月) + p5 (12月) = 5件
    const r = calcAchievement(policies, ['u1'], 'annual', '2026');
    expect(r.policyCount).toBe(5);
  });

  it('2025年は annual 2026 に含まれない', () => {
    const r = calcAchievement(policies, ['u1'], 'annual', '2025');
    // p8 (2025-07) のみ
    expect(r.policyCount).toBe(1);
  });

  it('複数 ownerIds を合算', () => {
    // u1(2026-07: p4) + u2(2026-07: p6) = 2件
    const r = calcAchievement(policies, ['u1', 'u2'], 'monthly', '2026-07');
    expect(r.policyCount).toBe(2);
  });
});

// =====================================================
// rollupAchievements — 恒等式検証
// =====================================================
describe('rollupAchievements', () => {
  it('quarterly → monthly 内訳の合計 = quarterly 合計', () => {
    const quarterTotal = calcAchievement(policies, ['u1'], 'quarterly', '2026-Q1').policyCount;
    const rollup = rollupAchievements(policies, ['u1'], 'quarterly', '2026-Q1');
    const sum = rollup.reduce((s, r) => s + r.ach.policyCount, 0);
    expect(sum).toBe(quarterTotal);
  });

  it('annual → quarterly 内訳の合計 = annual 合計', () => {
    const yearTotal = calcAchievement(policies, ['u1'], 'annual', '2026').policyCount;
    const rollup = rollupAchievements(policies, ['u1'], 'annual', '2026');
    const sum = rollup.reduce((s, r) => s + r.ach.policyCount, 0);
    expect(sum).toBe(yearTotal);
  });

  it('annual 恒等式: Σ四半期 = Σ月次 = annual', () => {
    const yearTotal = calcAchievement(policies, ['u1'], 'annual', '2026').policyCount;

    // Σ四半期
    const qRollup = rollupAchievements(policies, ['u1'], 'annual', '2026');
    const qSum = qRollup.reduce((s, r) => s + r.ach.policyCount, 0);
    expect(qSum).toBe(yearTotal);

    // Σ月次 (1..12)
    const months = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
    const mSum = months.reduce(
      (s, m) => s + calcAchievement(policies, ['u1'], 'monthly', m).policyCount,
      0,
    );
    expect(mSum).toBe(yearTotal);
  });
});

// =====================================================
// checkTargetRollup
// =====================================================
describe('checkTargetRollup', () => {
  it('整合: status=ok', () => {
    const r = checkTargetRollup(12, [4, 4, 4]);
    expect(r.status).toBe('ok');
    expect(r.gap).toBe(0);
  });

  it('下位合計 < 上位: status=under', () => {
    const r = checkTargetRollup(12, [3, 3, 3]);
    expect(r.status).toBe('under');
    expect(r.gap).toBe(3);
  });

  it('下位合計 > 上位: status=over', () => {
    const r = checkTargetRollup(10, [4, 4, 4]);
    expect(r.status).toBe('over');
    expect(r.gap).toBe(-2);
  });

  it('上位目標 undefined: status=no_data', () => {
    const r = checkTargetRollup(undefined, [3, 3, 3]);
    expect(r.status).toBe('no_data');
  });

  it('下位が空配列: status=no_data', () => {
    const r = checkTargetRollup(10, []);
    expect(r.status).toBe('no_data');
  });
});

// =====================================================
// getScopeUsers
// =====================================================
describe('getScopeUsers', () => {
  it('general: 本人のみ', () => {
    const r = getScopeUsers('general', 'u1', users, teams);
    expect(r.map(u => u.id)).toEqual(['u1']);
  });

  it('manager: 本人 + 部下', () => {
    const r = getScopeUsers('manager', 'u4', users, teams);
    const ids = r.map(u => u.id).sort();
    // u4 (manager) + u1, u3 (subordinates)
    expect(ids).toContain('u4');
    expect(ids).toContain('u1');
    expect(ids).toContain('u3');
  });

  it('executive: general/manager のみ', () => {
    const r = getScopeUsers('executive', 'u5', users, teams);
    const roles = r.map(u => u.role);
    expect(roles.every(role => role === 'general' || role === 'manager')).toBe(true);
    expect(roles).not.toContain('executive');
    expect(roles).not.toContain('admin');
  });
});

// =====================================================
// calcFunnel
// =====================================================
describe('calcFunnel', () => {
  const opps: Opportunity[] = [
    {
      id: 'o1', householdId: 'c1', ownerId: 'u1', title: 'テスト商談1',
      targetPersonIds: [], stage: 'proposal', status: 'open',
      productCategories: [], proposalProducts: [],
      needsAnalysisDone: false, illustrationProvided: false,
      stageHistory: [], tags: [], memo: '',
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'o2', householdId: 'c2', ownerId: 'u1', title: 'テスト商談2',
      targetPersonIds: [], stage: 'negotiation', status: 'open',
      productCategories: [], proposalProducts: [],
      needsAnalysisDone: false, illustrationProvided: false,
      stageHistory: [], tags: [], memo: '',
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'o3', householdId: 'c3', ownerId: 'u2', title: '他者商談',
      targetPersonIds: [], stage: 'approach', status: 'open',
      productCategories: [], proposalProducts: [],
      needsAnalysisDone: false, illustrationProvided: false,
      stageHistory: [], tags: [], memo: '',
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  it('ownerIds でフィルタして集計', () => {
    const funnel = calcFunnel(opps, ['u1']);
    expect(funnel.proposal).toBe(1);
    expect(funnel.negotiation).toBe(1);
    expect(funnel.approach).toBe(0);  // u2 のは含まない
  });

  it('複数 ownerIds で合算', () => {
    const funnel = calcFunnel(opps, ['u1', 'u2']);
    expect(funnel.approach).toBe(1);
    expect(funnel.proposal).toBe(1);
  });
});
