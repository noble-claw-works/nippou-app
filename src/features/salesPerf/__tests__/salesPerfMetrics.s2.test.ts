// =====================================================
// salesPerfMetrics.s2.test.ts — S2: 予算・目標管理 単体テスト
// =====================================================
import { describe, it, expect } from 'vitest';
import { budgetTable, cumulativeBudgetVsActual } from '../lib/salesPerfMetrics';
import type {
  SalesContract,
  SalesTargetRow,
  SalesPerfFilter,
  SalesPerfMasters,
} from '../types';

// ----------------------------------------
// フィクスチャ
// ----------------------------------------
const defaultFilter: SalesPerfFilter = {
  line: 'both',
  fiscalYear: 2025,
  periodMode: 'full',
  confidenceScenario: 'fixed',
};

const masters: SalesPerfMasters = {
  users: [
    { id: 'u1', name: '霧島 遥', groupId: 'g1', role: 'general' },
    { id: 'u2', name: '佐倉 涼', groupId: 'g1', role: 'general' },
  ],
  groups: [
    { id: 'g1', name: 'G1', memberIds: ['u1', 'u2'], managerIds: ['u2'] },
  ],
  insurers:     [],
  productTypes: [],
  channels:     [],
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
    month: 1, // 会計月1 = 4月
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
// budgetTable
// ----------------------------------------
describe('budgetTable', () => {
  it('常に12行返す', () => {
    const result = budgetTable([], [], defaultFilter, masters, 'admin', 'u1');
    expect(result).toHaveLength(12);
  });

  it('各行に month / label / calMonth / actual / actual_s / actual_s_a / budget / cumBudget / progressRate がある', () => {
    const result = budgetTable([], [], defaultFilter, masters, 'admin', 'u1');
    const row = result[0];
    expect(row).toHaveProperty('month');
    expect(row).toHaveProperty('label');
    expect(row).toHaveProperty('calMonth');
    expect(row).toHaveProperty('actual');
    expect(row).toHaveProperty('actual_s');
    expect(row).toHaveProperty('actual_s_a');
    expect(row).toHaveProperty('budget');
    expect(row).toHaveProperty('cumBudget');
    expect(row).toHaveProperty('progressRate');
  });

  it('データなし: progressRate = null (分母0)', () => {
    const result = budgetTable([], [], defaultFilter, masters, 'admin', 'u1');
    result.forEach(row => {
      expect(row.progressRate).toBeNull();
      expect(row.actual).toBe(0);
      expect(row.budget).toBe(0);
      expect(row.cumBudget).toBe(0);
    });
  });

  it('予算積上げが累計であることを確認 (月次予算が一定の場合)', () => {
    const targets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m =>
      makeTarget({ month: m, amount: 100000 }),
    );
    const result = budgetTable([], targets, defaultFilter, masters, 'admin', 'u1');
    // 会計月1の cumBudget = 100000
    expect(result[0].cumBudget).toBe(100000);
    // 会計月6の cumBudget = 600000
    expect(result[5].cumBudget).toBe(600000);
    // 会計月12の cumBudget = 1200000
    expect(result[11].cumBudget).toBe(1200000);
  });

  it('進捗率: 確定100000 / 予算積上げ500000(月1) = 20%', () => {
    const targets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m =>
      makeTarget({ month: m, amount: 500000 }),
    );
    const c = makeContract({ month: 1, firstYearCommission: 100000 });
    const result = budgetTable([c], targets, defaultFilter, masters, 'admin', 'u1');
    // 月1: cumBudget=500000, actual=100000 → 進捗率=20%
    expect(result[0].progressRate).toBeCloseTo(20, 1);
  });

  it('進捗率 null (予算0) → progressRate = null', () => {
    const c = makeContract({ month: 1, firstYearCommission: 100000 });
    const result = budgetTable([c], [], defaultFilter, masters, 'admin', 'u1');
    expect(result[0].progressRate).toBeNull();
  });

  it('確度シナリオ別集計: actual <= actual_s <= actual_s_a', () => {
    const contracts = [
      makeContract({ id: 'c1', month: 1, confidenceCode: 'fixed', confidenceAgg: 'fixed',     firstYearCommission: 100000 }),
      makeContract({ id: 'c2', month: 1, confidenceCode: 'S',     confidenceAgg: 'fixed_s',   firstYearCommission: 80000  }),
      makeContract({ id: 'c3', month: 1, confidenceCode: 'A',     confidenceAgg: 'fixed_s_a', firstYearCommission: 60000  }),
    ];
    const result = budgetTable(contracts, [], defaultFilter, masters, 'admin', 'u1');
    const row1 = result[0]; // 会計月1
    expect(row1.actual).toBe(100000);
    expect(row1.actual_s).toBe(180000);
    expect(row1.actual_s_a).toBe(240000);
  });

  it('月ごとの集計 (月1と月2)', () => {
    const contracts = [
      makeContract({ id: 'c1', month: 1, firstYearCommission: 200000 }),
      makeContract({ id: 'c2', month: 2, firstYearCommission: 300000 }),
    ];
    const result = budgetTable(contracts, [], defaultFilter, masters, 'admin', 'u1');
    expect(result[0].actual).toBe(200000); // 月1
    expect(result[1].actual).toBe(300000); // 月2
    // 月3以降は0
    expect(result[2].actual).toBe(0);
  });

  it('label は会計月ラベル (月1=4月, 月12=3月)', () => {
    const result = budgetTable([], [], defaultFilter, masters, 'admin', 'u1');
    expect(result[0].label).toBe('4月');
    expect(result[11].label).toBe('3月');
  });

  it('calMonth の年計算 (月1=2025-04, 月12=2026-03)', () => {
    const result = budgetTable([], [], defaultFilter, masters, 'admin', 'u1');
    expect(result[0].calMonth).toBe('2025-04');
    expect(result[11].calMonth).toBe('2026-03');
  });

  it('general ロール: 自分 (u1) のデータのみ', () => {
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1', month: 1, firstYearCommission: 100000 }),
      makeContract({ id: 'c2', ownerId: 'u2', month: 1, firstYearCommission: 200000 }),
    ];
    const result = budgetTable(contracts, [], defaultFilter, masters, 'general', 'u1');
    expect(result[0].actual).toBe(100000); // u1 のみ
  });

  it('line フィルタ: life のみ', () => {
    const contracts = [
      makeContract({ id: 'c1', line: 'life',    month: 1, firstYearCommission: 100000 }),
      makeContract({ id: 'c2', line: 'nonlife', month: 1, firstYearCommission: 200000 }),
    ];
    const result = budgetTable(
      contracts,
      [],
      { ...defaultFilter, line: 'life' },
      masters,
      'admin',
      'u1',
    );
    expect(result[0].actual).toBe(100000);
  });

  it('h1 periodMode でも 12 行返す (applyFilter 側が絞る)', () => {
    const result = budgetTable(
      [],
      [],
      { ...defaultFilter, periodMode: 'h1' },
      masters,
      'admin',
      'u1',
    );
    expect(result).toHaveLength(12);
  });
});

// ----------------------------------------
// cumulativeBudgetVsActual
// ----------------------------------------
describe('cumulativeBudgetVsActual', () => {
  it('常に12ポイント返す', () => {
    const result = cumulativeBudgetVsActual([], [], defaultFilter, masters, 'admin', 'u1');
    expect(result).toHaveLength(12);
  });

  it('各ポイントに必要フィールドが揃っている', () => {
    const result = cumulativeBudgetVsActual([], [], defaultFilter, masters, 'admin', 'u1');
    const pt = result[0];
    expect(pt).toHaveProperty('month');
    expect(pt).toHaveProperty('label');
    expect(pt).toHaveProperty('calMonth');
    expect(pt).toHaveProperty('monthlyActual');
    expect(pt).toHaveProperty('monthlyBudget');
    expect(pt).toHaveProperty('cumActual');
    expect(pt).toHaveProperty('cumBudget');
    expect(pt).toHaveProperty('gap');
    expect(pt).toHaveProperty('cumGap');
  });

  it('データなし: 全ポイントが 0', () => {
    const result = cumulativeBudgetVsActual([], [], defaultFilter, masters, 'admin', 'u1');
    result.forEach(pt => {
      expect(pt.monthlyActual).toBe(0);
      expect(pt.monthlyBudget).toBe(0);
      expect(pt.cumActual).toBe(0);
      expect(pt.cumBudget).toBe(0);
      expect(pt.gap).toBe(0);
      expect(pt.cumGap).toBe(0);
    });
  });

  it('累計実績が正しく積み上がる', () => {
    const contracts = [
      makeContract({ id: 'c1', month: 1, firstYearCommission: 100000 }),
      makeContract({ id: 'c2', month: 2, firstYearCommission: 150000 }),
      makeContract({ id: 'c3', month: 3, firstYearCommission: 200000 }),
    ];
    const result = cumulativeBudgetVsActual(contracts, [], defaultFilter, masters, 'admin', 'u1');
    expect(result[0].cumActual).toBe(100000);
    expect(result[1].cumActual).toBe(250000);
    expect(result[2].cumActual).toBe(450000);
    // 月4以降はそのまま
    expect(result[3].cumActual).toBe(450000);
  });

  it('累計予算が正しく積み上がる', () => {
    const targets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m =>
      makeTarget({ month: m, amount: 100000 }),
    );
    const result = cumulativeBudgetVsActual([], targets, defaultFilter, masters, 'admin', 'u1');
    expect(result[0].cumBudget).toBe(100000);
    expect(result[5].cumBudget).toBe(600000);
    expect(result[11].cumBudget).toBe(1200000);
  });

  it('gap = monthlyActual - monthlyBudget', () => {
    const contracts = [makeContract({ month: 1, firstYearCommission: 300000 })];
    const targets   = [makeTarget({ month: 1, amount: 200000 })];
    const result = cumulativeBudgetVsActual(contracts, targets, defaultFilter, masters, 'admin', 'u1');
    expect(result[0].gap).toBe(100000); // 実績超過
  });

  it('gap が負 (実績 < 予算)', () => {
    const contracts = [makeContract({ month: 1, firstYearCommission: 100000 })];
    const targets   = [makeTarget({ month: 1, amount: 300000 })];
    const result = cumulativeBudgetVsActual(contracts, targets, defaultFilter, masters, 'admin', 'u1');
    expect(result[0].gap).toBe(-200000);
  });

  it('cumGap = cumActual - cumBudget', () => {
    const contracts = [
      makeContract({ id: 'c1', month: 1, firstYearCommission: 300000 }),
      makeContract({ id: 'c2', month: 2, firstYearCommission: 100000 }),
    ];
    const targets = [
      makeTarget({ month: 1, amount: 200000 }),
      makeTarget({ month: 2, amount: 200000 }),
    ];
    const result = cumulativeBudgetVsActual(contracts, targets, defaultFilter, masters, 'admin', 'u1');
    // 月1: cumActual=300000, cumBudget=200000, cumGap=100000
    expect(result[0].cumGap).toBe(100000);
    // 月2: cumActual=400000, cumBudget=400000, cumGap=0
    expect(result[1].cumGap).toBe(0);
  });

  it('確度シナリオ fixed_s は S まで含む', () => {
    const contracts = [
      makeContract({ id: 'c1', month: 1, confidenceCode: 'fixed', confidenceAgg: 'fixed',   firstYearCommission: 100000 }),
      makeContract({ id: 'c2', month: 1, confidenceCode: 'S',     confidenceAgg: 'fixed_s', firstYearCommission: 80000  }),
      makeContract({ id: 'c3', month: 1, confidenceCode: 'A',     confidenceAgg: 'fixed_s_a', firstYearCommission: 60000 }),
    ];
    const result = cumulativeBudgetVsActual(
      contracts,
      [],
      { ...defaultFilter, confidenceScenario: 'fixed_s' },
      masters,
      'admin',
      'u1',
    );
    expect(result[0].monthlyActual).toBe(180000); // fixed + S
    expect(result[0].cumActual).toBe(180000);
  });

  it('calMonth: 月1=2025-04, 月12=2026-03', () => {
    const result = cumulativeBudgetVsActual([], [], defaultFilter, masters, 'admin', 'u1');
    expect(result[0].calMonth).toBe('2025-04');
    expect(result[11].calMonth).toBe('2026-03');
  });

  it('label: 月1=4月, 月7=10月', () => {
    const result = cumulativeBudgetVsActual([], [], defaultFilter, masters, 'admin', 'u1');
    expect(result[0].label).toBe('4月');
    expect(result[6].label).toBe('10月');
  });

  it('general ロール: 自分のデータのみ累計', () => {
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1', month: 1, firstYearCommission: 100000 }),
      makeContract({ id: 'c2', ownerId: 'u2', month: 1, firstYearCommission: 200000 }),
    ];
    const result = cumulativeBudgetVsActual(contracts, [], defaultFilter, masters, 'general', 'u1');
    expect(result[0].monthlyActual).toBe(100000);
    expect(result[0].cumActual).toBe(100000);
  });
});
