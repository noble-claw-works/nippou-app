// =====================================================
// salesPerfMetrics.test.ts — 集計コア単体テスト
// =====================================================
import { describe, it, expect } from 'vitest';
import {
  kpiSummary, funnelMetrics, ownerRanking, applyFilter,
  monthlyCommissionVsBudget,
} from '../lib/salesPerfMetrics';
import type { SalesContract, SalesTargetRow, SalesPerfFilter, SalesPerfMasters } from '../types';

// ----------------------------------------
// テスト用フィクスチャ
// ----------------------------------------
const defaultFilter: SalesPerfFilter = {
  line: 'both',
  fiscalYear: 2025,
  periodMode: 'full',
  confidenceScenario: 'fixed',
};

const masters: SalesPerfMasters = {
  users: [
    { id: 'u1', name: '霧島 遥',   groupId: 'g1', role: 'general' },
    { id: 'u2', name: '佐倉 涼',   groupId: 'g1', role: 'general' },
  ],
  groups: [
    { id: 'g1', name: 'G1', memberIds: ['u1', 'u2'], managerIds: ['u2'] },
  ],
  insurers: [],
  productTypes: [],
  channels: [],
};

function makeContract(overrides: Partial<SalesContract> = {}): SalesContract {
  return {
    id: 'c1',
    line: 'life',
    fiscalYear: 2025,
    ownerId: 'u1',
    groupId: 'g1',
    channel: '紹介',
    partner: '直接',
    insurer: '第一生命',
    productType: '終身保険',
    monthlyPremium: 30000,
    firstYearCommission: 200000,
    confidenceCode: 'fixed',
    confidenceAgg: 'fixed',
    establishedDate: '2025-07-10',
    month: 4,
    hadMeeting: true,
    hadLifeplan: true,
    policyCollected: true,
    hadProposal: true,
    householdId: 'hh_001',
    _issues: [],
    ...overrides,
  };
}

function makeTarget(overrides: Partial<SalesTargetRow> = {}): SalesTargetRow {
  return {
    line: 'life',
    fiscalYear: 2025,
    scopeType: 'all',
    scopeId: 'ALL',
    month: 1,
    amount: 500000,
    ...overrides,
  };
}

// ----------------------------------------
// applyFilter
// ----------------------------------------
describe('applyFilter', () => {
  it('fiscalYear が違うものは除外', () => {
    const c = makeContract({ fiscalYear: 2024 });
    expect(applyFilter([c], defaultFilter, ['u1'])).toHaveLength(0);
  });

  it('scopeUserIds に含まれない ownerId は除外', () => {
    const c = makeContract({ ownerId: 'u_other' });
    expect(applyFilter([c], defaultFilter, ['u1'])).toHaveLength(0);
  });

  it('line フィルタ: life のみ', () => {
    const c1 = makeContract({ id: 'c1', line: 'life' });
    const c2 = makeContract({ id: 'c2', line: 'nonlife' });
    const result = applyFilter([c1, c2], { ...defaultFilter, line: 'life' }, ['u1']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
  });

  it('periodMode=single で month が一致しないものは除外', () => {
    const c = makeContract({ month: 3 });
    const result = applyFilter([c], { ...defaultFilter, periodMode: 'single', singleMonth: 4 }, ['u1']);
    expect(result).toHaveLength(0);
  });

  it('periodMode=single で month=null のものは除外', () => {
    const c = makeContract({ month: null });
    const result = applyFilter([c], { ...defaultFilter, periodMode: 'single', singleMonth: 4 }, ['u1']);
    expect(result).toHaveLength(0);
  });

  it('periodMode=full で month=null のものは含む', () => {
    const c = makeContract({ month: null });
    const result = applyFilter([c], defaultFilter, ['u1']);
    expect(result).toHaveLength(1);
  });

  it('insurer フィルタ', () => {
    const c1 = makeContract({ id: 'c1', insurer: '第一生命' });
    const c2 = makeContract({ id: 'c2', insurer: '日本生命' });
    const result = applyFilter([c1, c2], { ...defaultFilter, insurer: '第一生命' }, ['u1']);
    expect(result).toHaveLength(1);
  });
});

// ----------------------------------------
// kpiSummary
// ----------------------------------------
describe('kpiSummary', () => {
  it('予算0のとき progressRate=null (分母0)', () => {
    const c = makeContract({ firstYearCommission: 500000 });
    // targets がないので予算=0
    const result = kpiSummary([c], [], defaultFilter, masters, 'admin', 'u1');
    expect(result.progressRate).toBeNull();
  });

  it('前年度データなし → yoyRate=null', () => {
    const c = makeContract({ firstYearCommission: 300000 });
    const t = makeTarget({ amount: 600000 });
    const result = kpiSummary([c], [t], defaultFilter, masters, 'admin', 'u1');
    expect(result.yoyRate).toBeNull();
  });

  it('進捗率: 実績300000 / 予算600000 = 50%', () => {
    const c = makeContract({ firstYearCommission: 300000 });
    const targets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m =>
      makeTarget({ month: m, amount: 50000 }),
    );
    const result = kpiSummary([c], targets, defaultFilter, masters, 'admin', 'u1');
    expect(result.progressRate).toBeCloseTo(50, 1);
    expect(result.annualBudget).toBe(600000);
    expect(result.confirmedCommission).toBe(300000);
    expect(result.budgetGap).toBe(-300000);
  });

  it('3集約シナリオ: fixed_s_a は fixed+S+A を含む', () => {
    const contracts = [
      makeContract({ id: 'c1', confidenceCode: 'fixed', confidenceAgg: 'fixed', firstYearCommission: 100000 }),
      makeContract({ id: 'c2', confidenceCode: 'S', confidenceAgg: 'fixed_s', firstYearCommission: 80000 }),
      makeContract({ id: 'c3', confidenceCode: 'A', confidenceAgg: 'fixed_s_a', firstYearCommission: 60000 }),
      makeContract({ id: 'c4', confidenceCode: 'B', confidenceAgg: null, firstYearCommission: 50000 }),
    ];
    const targets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m =>
      makeTarget({ month: m, amount: 50000 }),
    );

    // fixed のみ
    const r1 = kpiSummary(contracts, targets, { ...defaultFilter, confidenceScenario: 'fixed' }, masters, 'admin', 'u1');
    expect(r1.confirmedCommission).toBe(100000);

    // fixed+S
    const r2 = kpiSummary(contracts, targets, { ...defaultFilter, confidenceScenario: 'fixed_s' }, masters, 'admin', 'u1');
    expect(r2.confirmedCommission).toBe(180000);

    // fixed+S+A
    const r3 = kpiSummary(contracts, targets, { ...defaultFilter, confidenceScenario: 'fixed_s_a' }, masters, 'admin', 'u1');
    expect(r3.confirmedCommission).toBe(240000);
  });

  it('前年比: FY2025=300000 / FY2024=200000 = 150%', () => {
    const contracts = [
      makeContract({ id: 'c1', fiscalYear: 2025, firstYearCommission: 300000 }),
      makeContract({ id: 'c2', fiscalYear: 2024, firstYearCommission: 200000 }),
    ];
    const targets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m =>
      makeTarget({ month: m, amount: 50000 }),
    );
    const result = kpiSummary(contracts, targets, defaultFilter, masters, 'admin', 'u1');
    expect(result.yoyRate).toBeCloseTo(150, 1);
  });
});

// ----------------------------------------
// 会計年度境界テスト
// ----------------------------------------
describe('会計年度境界', () => {
  it('3月末はFY2025の月12として集計される', () => {
    // FY2025の3月末 = 2026-03-31, 会計月12
    const c = makeContract({ establishedDate: '2026-03-31', month: 12, fiscalYear: 2025 });
    const result = applyFilter([c], defaultFilter, ['u1']);
    expect(result).toHaveLength(1);
  });

  it('4月頭はFY2025には含まれない (会計月境界)', () => {
    // 2026-04-01 は FY2026 → FY2025 フィルタで除外
    const c = makeContract({
      id: 'c_next_fy',
      establishedDate: '2026-04-01',
      month: null,  // fy_mismatch で month=null になる
      fiscalYear: 2026,  // 正規化後は FY2026
    });
    const result = applyFilter([c], defaultFilter, ['u1']);
    expect(result).toHaveLength(0);
  });
});

// ----------------------------------------
// funnelMetrics
// ----------------------------------------
describe('funnelMetrics', () => {
  it('全員false → 分母0は null', () => {
    const c = makeContract({
      hadMeeting: false,
      hadLifeplan: false,
      hadProposal: false,
      policyCollected: false,
      confidenceCode: 'B',
      confidenceAgg: null,
    });
    const result = funnelMetrics([c], defaultFilter, masters, 'admin', 'u1');
    expect(result.lpRate).toBeNull();
    expect(result.proposalRate).toBeNull();
    expect(result.contractRate).toBeNull();
    expect(result.avgHouseholdValue).toBeNull();
  });

  it('meetings=4, lifeplans=2 → lpRate=50', () => {
    const contracts = [
      makeContract({ id: 'c1', hadMeeting: true, hadLifeplan: true }),
      makeContract({ id: 'c2', hadMeeting: true, hadLifeplan: true }),
      makeContract({ id: 'c3', hadMeeting: true, hadLifeplan: false }),
      makeContract({ id: 'c4', hadMeeting: true, hadLifeplan: false }),
    ];
    const result = funnelMetrics(contracts, defaultFilter, masters, 'admin', 'u1');
    expect(result.meetings).toBe(4);
    expect(result.lifeplans).toBe(2);
    expect(result.lpRate).toBeCloseTo(50, 1);
  });

  it('ファネル転換率: proposals=3, contracts=1 → contractRate≈33.3', () => {
    const contracts = [
      makeContract({ id: 'c1', hadProposal: true, confidenceCode: 'fixed', confidenceAgg: 'fixed', householdId: 'hh1' }),
      makeContract({ id: 'c2', hadProposal: true, confidenceCode: 'A', confidenceAgg: 'fixed_s_a', householdId: 'hh2' }),
      makeContract({ id: 'c3', hadProposal: true, confidenceCode: 'B', confidenceAgg: null, householdId: 'hh3' }),
    ];
    const result = funnelMetrics(contracts, defaultFilter, masters, 'admin', 'u1');
    // confirmed=1 (fixed のみ), proposals=3
    expect(result.contractRate).toBeCloseTo(33.33, 1);
  });
});

// ----------------------------------------
// ownerRanking
// ----------------------------------------
describe('ownerRanking', () => {
  it('進捗率順にソートされる', () => {
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1', firstYearCommission: 100000 }),
      makeContract({ id: 'c2', ownerId: 'u2', firstYearCommission: 200000 }),
    ];
    const targets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].flatMap(m => [
      makeTarget({ month: m, scopeType: 'individual', scopeId: 'u1', amount: 20000, line: 'life' }),
      makeTarget({ month: m, scopeType: 'individual', scopeId: 'u2', amount: 20000, line: 'life' }),
    ]);
    const result = ownerRanking(contracts, targets, defaultFilter, masters, 'admin', 'u1');
    expect(result[0].ownerId).toBe('u2');
  });

  it('budget=0 の担当者の progressRate は null', () => {
    const c = makeContract({ ownerId: 'u1' });
    const result = ownerRanking([c], [], defaultFilter, masters, 'admin', 'u1');
    const u1row = result.find(r => r.ownerId === 'u1');
    expect(u1row?.progressRate).toBeNull();
  });
});

// ----------------------------------------
// monthlyCommissionVsBudget
// ----------------------------------------
describe('monthlyCommissionVsBudget', () => {
  it('12ヶ月分のポイントを返す', () => {
    const result = monthlyCommissionVsBudget([], [], defaultFilter, masters, 'admin', 'u1');
    expect(result).toHaveLength(12);
  });

  it('累計が正しく積み上がる', () => {
    const contracts = [
      makeContract({ id: 'c1', month: 1, firstYearCommission: 100000 }),
      makeContract({ id: 'c2', month: 2, firstYearCommission: 150000 }),
    ];
    const result = monthlyCommissionVsBudget(contracts, [], defaultFilter, masters, 'admin', 'u1');
    expect(result[0].cumActual).toBe(100000);
    expect(result[1].cumActual).toBe(250000);
  });
});

// ----------------------------------------
// general ロール: 自分のみ見える
// ----------------------------------------
describe('general ロールのスコープ制限', () => {
  it('general は自分 (u1) のデータのみ集計', () => {
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1', firstYearCommission: 100000 }),
      makeContract({ id: 'c2', ownerId: 'u2', firstYearCommission: 200000 }),
    ];
    const result = kpiSummary(contracts, [], defaultFilter, masters, 'general', 'u1');
    // u1 のみ = 100000
    expect(result.confirmedCommission).toBe(100000);
  });
});
