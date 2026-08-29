// =====================================================
// salesPerfMetrics.s1.test.ts — S1集計 単体テスト
// kpiSummary / monthlyCommissionVsBudget / stackedByConfidence / ownerRanking
// =====================================================
import { describe, it, expect } from 'vitest';
import {
  kpiSummary,
  monthlyCommissionVsBudget,
  stackedByConfidence,
  ownerRanking,
  applyFilter,
} from '../lib/salesPerfMetrics';
import type {
  SalesContract,
  SalesTargetRow,
  SalesPerfFilter,
  SalesPerfMasters,
} from '../types';

// ----------------------------------------
// テスト共通フィクスチャ
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
    { id: 'u3', name: '東雲 蓮',   groupId: 'g2', role: 'manager' },
  ],
  groups: [
    { id: 'g1', name: 'G1', memberIds: ['u1', 'u2'], managerIds: ['u3'] },
    { id: 'g2', name: 'G2', memberIds: ['u3'],       managerIds: ['u3'] },
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
// kpiSummary
// ----------------------------------------
describe('kpiSummary', () => {
  it('空データ → 全て0 or null', () => {
    const result = kpiSummary([], [], defaultFilter, masters, 'admin', 'u1');
    expect(result.annualBudget).toBe(0);
    expect(result.confirmedCommission).toBe(0);
    expect(result.progressRate).toBeNull(); // 分母0
    expect(result.budgetGap).toBe(0);
    expect(result.yoyRate).toBeNull(); // 分母0
  });

  it('確定手数料が正しく集計される', () => {
    const contracts = [
      makeContract({ id: 'c1', firstYearCommission: 300000, confidenceAgg: 'fixed' }),
      makeContract({ id: 'c2', firstYearCommission: 200000, confidenceAgg: 'fixed' }),
    ];
    const result = kpiSummary(contracts, [], defaultFilter, masters, 'admin', 'u1');
    expect(result.confirmedCommission).toBe(500000);
  });

  it('確度シナリオ fixed: S/A は除外', () => {
    const contracts = [
      makeContract({ id: 'c1', firstYearCommission: 100000, confidenceCode: 'fixed', confidenceAgg: 'fixed' }),
      makeContract({ id: 'c2', firstYearCommission: 200000, confidenceCode: 'S', confidenceAgg: 'fixed_s' }),
      makeContract({ id: 'c3', firstYearCommission: 300000, confidenceCode: 'A', confidenceAgg: 'fixed_s_a' }),
    ];
    const result = kpiSummary(contracts, [], defaultFilter, masters, 'admin', 'u1');
    // fixed シナリオなので確定のみ = 100000
    expect(result.confirmedCommission).toBe(100000);
  });

  it('確度シナリオ fixed_s: S まで含む', () => {
    const filter = { ...defaultFilter, confidenceScenario: 'fixed_s' as const };
    const contracts = [
      makeContract({ id: 'c1', firstYearCommission: 100000, confidenceCode: 'fixed', confidenceAgg: 'fixed' }),
      makeContract({ id: 'c2', firstYearCommission: 200000, confidenceCode: 'S', confidenceAgg: 'fixed_s' }),
      makeContract({ id: 'c3', firstYearCommission: 300000, confidenceCode: 'A', confidenceAgg: 'fixed_s_a' }),
    ];
    const result = kpiSummary(contracts, [], filter, masters, 'admin', 'u1');
    expect(result.confirmedCommission).toBe(300000); // fixed + S
  });

  it('確度シナリオ fixed_s_a: 全て含む', () => {
    const filter = { ...defaultFilter, confidenceScenario: 'fixed_s_a' as const };
    const contracts = [
      makeContract({ id: 'c1', firstYearCommission: 100000, confidenceCode: 'fixed', confidenceAgg: 'fixed' }),
      makeContract({ id: 'c2', firstYearCommission: 200000, confidenceCode: 'S', confidenceAgg: 'fixed_s' }),
      makeContract({ id: 'c3', firstYearCommission: 300000, confidenceCode: 'A', confidenceAgg: 'fixed_s_a' }),
    ];
    const result = kpiSummary(contracts, [], filter, masters, 'admin', 'u1');
    expect(result.confirmedCommission).toBe(600000); // fixed + S + A
  });

  it('年間予算が正しく集計される (all scope)', () => {
    const targets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m =>
      makeTarget({ month: m, amount: 1_000_000 }),
    );
    const result = kpiSummary([], targets, defaultFilter, masters, 'admin', 'u1');
    expect(result.annualBudget).toBe(12_000_000);
  });

  it('進捗率 = 確定 ÷ 予算 × 100', () => {
    const contracts = [makeContract({ firstYearCommission: 6_000_000 })];
    const targets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m =>
      makeTarget({ month: m, amount: 1_000_000 }),
    );
    const result = kpiSummary(contracts, targets, defaultFilter, masters, 'admin', 'u1');
    expect(result.progressRate).toBeCloseTo(50, 1); // 6M / 12M * 100
  });

  it('目標差額 = 実績 - 予算', () => {
    const contracts = [makeContract({ firstYearCommission: 5_000_000 })];
    const targets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m =>
      makeTarget({ month: m, amount: 500_000 }),
    );
    const result = kpiSummary(contracts, targets, defaultFilter, masters, 'admin', 'u1');
    expect(result.budgetGap).toBe(5_000_000 - 6_000_000); // -1M
  });

  it('前年比: 前期0件 → null', () => {
    const contracts = [makeContract({ fiscalYear: 2025, firstYearCommission: 1_000_000 })];
    const result = kpiSummary(contracts, [], defaultFilter, masters, 'admin', 'u1');
    expect(result.yoyRate).toBeNull(); // 前年0 = 分母0
  });

  it('前年比 = 今期 ÷ 前期 × 100', () => {
    const contracts = [
      makeContract({ id: 'cy', fiscalYear: 2025, firstYearCommission: 1_200_000, month: 1 }),
      makeContract({ id: 'py', fiscalYear: 2024, firstYearCommission: 1_000_000, month: 1 }),
    ];
    const result = kpiSummary(contracts, [], defaultFilter, masters, 'admin', 'u1');
    expect(result.yoyRate).toBeCloseTo(120, 1);
  });

  it('firstYearCommission=null のコントラクトは集計除外', () => {
    const contracts = [
      makeContract({ id: 'c1', firstYearCommission: 500000 }),
      makeContract({ id: 'c2', firstYearCommission: null }),
    ];
    const result = kpiSummary(contracts, [], defaultFilter, masters, 'admin', 'u1');
    expect(result.confirmedCommission).toBe(500000);
  });

  it('general ロール: 自分(u1)のみ集計', () => {
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1', firstYearCommission: 300000 }),
      makeContract({ id: 'c2', ownerId: 'u2', firstYearCommission: 700000 }),
    ];
    const result = kpiSummary(contracts, [], defaultFilter, masters, 'general', 'u1');
    expect(result.confirmedCommission).toBe(300000);
  });

  it('ライン フィルタ: life のみ', () => {
    const filter = { ...defaultFilter, line: 'life' as const };
    const contracts = [
      makeContract({ id: 'c1', line: 'life',    firstYearCommission: 300000 }),
      makeContract({ id: 'c2', line: 'nonlife', firstYearCommission: 700000 }),
    ];
    const result = kpiSummary(contracts, [], filter, masters, 'admin', 'u1');
    expect(result.confirmedCommission).toBe(300000);
  });
});

// ----------------------------------------
// monthlyCommissionVsBudget
// ----------------------------------------
describe('monthlyCommissionVsBudget', () => {
  it('12ヶ月分のデータポイントを返す', () => {
    const result = monthlyCommissionVsBudget([], [], defaultFilter, masters, 'admin', 'u1');
    expect(result).toHaveLength(12);
  });

  it('calMonth の形式が YYYY-MM', () => {
    const result = monthlyCommissionVsBudget([], [], defaultFilter, masters, 'admin', 'u1');
    // FY2025 1月目 = 2025-04
    expect(result[0].calMonth).toBe('2025-04');
    // FY2025 12月目 = 2026-03
    expect(result[11].calMonth).toBe('2026-03');
  });

  it('累計が正しく積み上がる', () => {
    const contracts = [
      makeContract({ id: 'c1', month: 1, firstYearCommission: 100000 }),
      makeContract({ id: 'c2', month: 2, firstYearCommission: 150000 }),
      makeContract({ id: 'c3', month: 3, firstYearCommission: 200000 }),
    ];
    const result = monthlyCommissionVsBudget(contracts, [], defaultFilter, masters, 'admin', 'u1');
    expect(result[0].cumActual).toBe(100000);
    expect(result[1].cumActual).toBe(250000);
    expect(result[2].cumActual).toBe(450000);
  });

  it('予算積上げが正しく積み上がる', () => {
    const targets = [1, 2, 3].map(m =>
      makeTarget({ month: m, amount: 500000 }),
    );
    const result = monthlyCommissionVsBudget([], targets, defaultFilter, masters, 'admin', 'u1');
    expect(result[0].cumBudget).toBe(500000);
    expect(result[1].cumBudget).toBe(1000000);
    expect(result[2].cumBudget).toBe(1500000);
  });

  it('月次 actual が正しい', () => {
    const contracts = [
      makeContract({ id: 'c1', month: 4, firstYearCommission: 100000 }),
      makeContract({ id: 'c2', month: 4, firstYearCommission: 200000 }),
    ];
    const result = monthlyCommissionVsBudget(contracts, [], defaultFilter, masters, 'admin', 'u1');
    expect(result[3].actual).toBe(300000); // month=4 は index 3
  });
});

// ----------------------------------------
// stackedByConfidence
// ----------------------------------------
describe('stackedByConfidence', () => {
  it('12ヶ月分のポイントを返す', () => {
    const result = stackedByConfidence([], defaultFilter, masters, 'admin', 'u1');
    expect(result).toHaveLength(12);
  });

  it('確度コード fixed が正しく集計される', () => {
    const contracts = [
      makeContract({ id: 'c1', month: 1, confidenceCode: 'fixed', firstYearCommission: 100000 }),
      makeContract({ id: 'c2', month: 1, confidenceCode: 'S',     firstYearCommission: 200000 }),
    ];
    const result = stackedByConfidence(contracts, defaultFilter, masters, 'admin', 'u1');
    expect(result[0].fixed).toBe(100000);
    expect(result[0].S).toBe(200000);
  });

  it('異なる月に分散したデータが正しい月に集計される', () => {
    const contracts = [
      makeContract({ id: 'c1', month: 1, confidenceCode: 'fixed', firstYearCommission: 100000 }),
      makeContract({ id: 'c2', month: 6, confidenceCode: 'A',     firstYearCommission: 300000 }),
    ];
    const result = stackedByConfidence(contracts, defaultFilter, masters, 'admin', 'u1');
    expect(result[0].fixed).toBe(100000);
    expect(result[0].A).toBe(0);
    expect(result[5].fixed).toBe(0);
    expect(result[5].A).toBe(300000);
  });
});

// ----------------------------------------
// ownerRanking
// ----------------------------------------
describe('ownerRanking', () => {
  it('進捗率の高い順にソートされる', () => {
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1', firstYearCommission: 100000 }),
      makeContract({ id: 'c2', ownerId: 'u2', firstYearCommission: 800000 }),
    ];
    const targets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].flatMap(m => [
      makeTarget({ month: m, scopeType: 'individual', scopeId: 'u1', amount: 100000, line: 'life' }),
      makeTarget({ month: m, scopeType: 'individual', scopeId: 'u2', amount: 100000, line: 'life' }),
    ]);
    const result = ownerRanking(contracts, targets, defaultFilter, masters, 'admin', 'u1');
    // u2 が高い進捗率
    expect(result[0].ownerId).toBe('u2');
  });

  it('budget=0 の担当者の progressRate は null', () => {
    const contracts = [makeContract({ ownerId: 'u1', firstYearCommission: 100000 })];
    const result = ownerRanking(contracts, [], defaultFilter, masters, 'admin', 'u1');
    const u1row = result.find(r => r.ownerId === 'u1');
    expect(u1row?.progressRate).toBeNull();
  });

  it('general ロールは自分のみのランキング (1行)', () => {
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1' }),
      makeContract({ id: 'c2', ownerId: 'u2' }),
    ];
    const result = ownerRanking(contracts, [], defaultFilter, masters, 'general', 'u1');
    expect(result).toHaveLength(1);
    expect(result[0].ownerId).toBe('u1');
  });

  it('ownerName が masters から正しく取得される', () => {
    const contracts = [makeContract({ ownerId: 'u1' })];
    const result = ownerRanking(contracts, [], defaultFilter, masters, 'admin', 'u1');
    const u1row = result.find(r => r.ownerId === 'u1');
    expect(u1row?.ownerName).toBe('霧島 遥');
  });

  it('commission が確度シナリオに応じて絞られる', () => {
    const filterFixedS = { ...defaultFilter, confidenceScenario: 'fixed_s' as const };
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1', confidenceCode: 'fixed', confidenceAgg: 'fixed',     firstYearCommission: 100000 }),
      makeContract({ id: 'c2', ownerId: 'u1', confidenceCode: 'S',     confidenceAgg: 'fixed_s',   firstYearCommission: 200000 }),
      makeContract({ id: 'c3', ownerId: 'u1', confidenceCode: 'A',     confidenceAgg: 'fixed_s_a', firstYearCommission: 300000 }),
    ];
    const result = ownerRanking(contracts, [], filterFixedS, masters, 'admin', 'u1');
    const u1row = result.find(r => r.ownerId === 'u1');
    // fixed + S のみ = 300000
    expect(u1row?.commission).toBe(300000);
  });
});

// ----------------------------------------
// applyFilter (S1 用基本確認)
// ----------------------------------------
describe('applyFilter (S1 利用ケース)', () => {
  it('fiscalYear が合わないものは除外', () => {
    const contracts = [
      makeContract({ id: 'c1', fiscalYear: 2025 }),
      makeContract({ id: 'c2', fiscalYear: 2024 }),
    ];
    const result = applyFilter(contracts, defaultFilter, ['u1', 'u2', 'u3']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
  });

  it('insurer フィルタが正しく適用される', () => {
    const filter = { ...defaultFilter, insurer: '第一生命' };
    const contracts = [
      makeContract({ id: 'c1', insurer: '第一生命' }),
      makeContract({ id: 'c2', insurer: '日本生命' }),
    ];
    const result = applyFilter(contracts, filter, ['u1', 'u2', 'u3']);
    expect(result).toHaveLength(1);
  });

  it('channel フィルタが正しく適用される', () => {
    const filter = { ...defaultFilter, channel: '紹介' };
    const contracts = [
      makeContract({ id: 'c1', channel: '紹介' }),
      makeContract({ id: 'c2', channel: '飛込' }),
    ];
    const result = applyFilter(contracts, filter, ['u1', 'u2', 'u3']);
    expect(result).toHaveLength(1);
  });

  it('periodMode=single: 指定月のみ', () => {
    const filter: SalesPerfFilter = { ...defaultFilter, periodMode: 'single', singleMonth: 3 };
    const contracts = [
      makeContract({ id: 'c1', month: 3 }),
      makeContract({ id: 'c2', month: 5 }),
      makeContract({ id: 'c3', month: null }), // 未計上
    ];
    const result = applyFilter(contracts, filter, ['u1', 'u2', 'u3']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
  });

  it('periodMode=h1: month=null の未計上は含む (仕様通り)', () => {
    // 設計書: "month が null の未計上は full/h1/h2 では含む。singleMonth は除外"
    const filter: SalesPerfFilter = { ...defaultFilter, periodMode: 'h1' };
    const contracts = [
      makeContract({ id: 'c1', month: 1 }),
      makeContract({ id: 'c2', month: 6 }),
      makeContract({ id: 'c3', month: 7 }),   // h1 範囲外だが h1 では除外しない
      makeContract({ id: 'c4', month: null }), // null は含む
    ];
    const result = applyFilter(contracts, filter, ['u1', 'u2', 'u3']);
    // h1/h2/full では month 絞りをしない (singleMonth のみ絞る)
    expect(result).toHaveLength(4);
  });

  it('line=life のみ', () => {
    const filter = { ...defaultFilter, line: 'life' as const };
    const contracts = [
      makeContract({ id: 'c1', line: 'life' }),
      makeContract({ id: 'c2', line: 'nonlife' }),
    ];
    const result = applyFilter(contracts, filter, ['u1', 'u2', 'u3']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
  });
});
