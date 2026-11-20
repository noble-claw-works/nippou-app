// =====================================================
// salesPerfMetrics.s5.test.ts — S5集計 単体テスト
// insurerTypeBreakdown: 保険会社×種目クロス集計
// mode='commission' | 'count'
// =====================================================
import { describe, it, expect } from 'vitest';
import {
  insurerTypeBreakdown,
} from '../lib/salesPerfMetrics';
import type {
  SalesContract,
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
  confidenceScenario: 'fixed_s_a',
};

const masters: SalesPerfMasters = {
  users: [
    { id: 'u1', name: '霧島 遥', groupId: 'g1', role: 'general' },
    { id: 'u2', name: '佐倉 涼', groupId: 'g1', role: 'general' },
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
    id: `c_${Math.random().toString(36).slice(2, 7)}`,
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
    householdId: 'hh1',
    _issues: [],
    ...overrides,
  };
}

// ----------------------------------------
// insurerTypeBreakdown — 基本
// ----------------------------------------
describe('insurerTypeBreakdown', () => {
  it('空配列 → 空配列', () => {
    const result = insurerTypeBreakdown([], defaultFilter, masters, 'admin', 'u1', 'commission');
    expect(result).toHaveLength(0);
  });

  it('保険会社1社・種目1種のデータ → 1行返す', () => {
    const c = makeContract({
      insurer: '第一生命',
      productType: '終身保険',
      firstYearCommission: 300000,
    });
    const result = insurerTypeBreakdown([c], defaultFilter, masters, 'admin', 'u1', 'commission');
    expect(result).toHaveLength(1);
    expect(result[0].insurer).toBe('第一生命');
    expect(result[0].commission).toBe(300000);
    expect(result[0].count).toBe(1);
    expect(result[0].productTypes).toHaveLength(1);
    expect(result[0].productTypes[0].key).toBe('終身保険');
  });

  it('保険会社2社 → 2行返す', () => {
    const contracts = [
      makeContract({ insurer: '第一生命', productType: '終身保険', firstYearCommission: 200000 }),
      makeContract({ insurer: '日本生命', productType: '定期保険', firstYearCommission: 150000 }),
    ];
    const result = insurerTypeBreakdown(contracts, defaultFilter, masters, 'admin', 'u1', 'commission');
    expect(result).toHaveLength(2);
    // 手数料降順
    expect(result[0].insurer).toBe('第一生命');
    expect(result[1].insurer).toBe('日本生命');
  });

  it('同一保険会社・異なる種目 → 1行 + productTypes 2件', () => {
    const contracts = [
      makeContract({ insurer: '第一生命', productType: '終身保険', firstYearCommission: 200000 }),
      makeContract({ insurer: '第一生命', productType: '医療保険', firstYearCommission: 100000 }),
    ];
    const result = insurerTypeBreakdown(contracts, defaultFilter, masters, 'admin', 'u1', 'commission');
    expect(result).toHaveLength(1);
    expect(result[0].insurer).toBe('第一生命');
    expect(result[0].commission).toBe(300000);
    expect(result[0].count).toBe(2);
    expect(result[0].productTypes).toHaveLength(2);
    // productTypes も手数料降順
    expect(result[0].productTypes[0].key).toBe('終身保険');
    expect(result[0].productTypes[0].commission).toBe(200000);
    expect(result[0].productTypes[1].key).toBe('医療保険');
  });

  it('mode="count" → 件数降順でソート', () => {
    const contracts = [
      makeContract({ insurer: '第一生命', productType: '終身保険', firstYearCommission: 500000 }),
      makeContract({ insurer: '日本生命', productType: '定期保険', firstYearCommission: 100000 }),
      makeContract({ insurer: '日本生命', productType: '医療保険', firstYearCommission: 100000 }),
    ];
    const result = insurerTypeBreakdown(contracts, defaultFilter, masters, 'admin', 'u1', 'count');
    // count: 日本生命=2, 第一生命=1 → 件数降順
    expect(result[0].insurer).toBe('日本生命');
    expect(result[0].count).toBe(2);
    expect(result[1].insurer).toBe('第一生命');
    expect(result[1].count).toBe(1);
  });

  it('mode="commission" → 手数料降順でソート', () => {
    const contracts = [
      makeContract({ insurer: '第一生命', productType: '終身保険', firstYearCommission: 100000 }),
      makeContract({ insurer: '日本生命', productType: '定期保険', firstYearCommission: 400000 }),
    ];
    const result = insurerTypeBreakdown(contracts, defaultFilter, masters, 'admin', 'u1', 'commission');
    expect(result[0].insurer).toBe('日本生命');
    expect(result[0].commission).toBe(400000);
  });

  it('firstYearCommission=null は手数料0として集計、件数は計上', () => {
    const c = makeContract({
      insurer: '第一生命',
      productType: '終身保険',
      firstYearCommission: null,
    });
    const result = insurerTypeBreakdown([c], defaultFilter, masters, 'admin', 'u1', 'commission');
    expect(result).toHaveLength(1);
    expect(result[0].commission).toBe(0);
    expect(result[0].count).toBe(1); // 件数は計上される
  });

  it('confidenceScenario="fixed" のみ → fixed 以外は除外', () => {
    const fixedFilter: SalesPerfFilter = {
      ...defaultFilter,
      confidenceScenario: 'fixed',
    };
    const contracts = [
      makeContract({
        insurer: '第一生命',
        productType: '終身保険',
        confidenceCode: 'fixed',
        confidenceAgg: 'fixed',
        firstYearCommission: 200000,
      }),
      makeContract({
        insurer: '第一生命',
        productType: '定期保険',
        confidenceCode: 'S',
        confidenceAgg: 'fixed_s',
        firstYearCommission: 150000,
      }),
    ];
    const result = insurerTypeBreakdown(contracts, fixedFilter, masters, 'admin', 'u1', 'commission');
    // fixed のみ → 1件 (終身保険のみ)
    expect(result).toHaveLength(1);
    expect(result[0].commission).toBe(200000);
    expect(result[0].count).toBe(1);
  });

  it('line フィルタ: line="life" → nonlife は除外', () => {
    const lifeFilter: SalesPerfFilter = {
      ...defaultFilter,
      line: 'life',
    };
    const contracts = [
      makeContract({ insurer: '第一生命', productType: '終身保険', line: 'life', firstYearCommission: 200000 }),
      makeContract({ insurer: '東京海上日動', productType: '自動車保険', line: 'nonlife', firstYearCommission: 150000 }),
    ];
    const result = insurerTypeBreakdown(contracts, lifeFilter, masters, 'admin', 'u1', 'commission');
    expect(result).toHaveLength(1);
    expect(result[0].insurer).toBe('第一生命');
  });

  it('insurer が空文字 → "未分類" として集計', () => {
    const c = makeContract({ insurer: '', productType: '終身保険', firstYearCommission: 100000 });
    const result = insurerTypeBreakdown([c], defaultFilter, masters, 'admin', 'u1', 'commission');
    expect(result).toHaveLength(1);
    expect(result[0].insurer).toBe('未分類');
  });

  it('productType が空文字 → "未分類" として種目集計', () => {
    const c = makeContract({ insurer: '第一生命', productType: '', firstYearCommission: 100000 });
    const result = insurerTypeBreakdown([c], defaultFilter, masters, 'admin', 'u1', 'commission');
    expect(result[0].productTypes[0].key).toBe('未分類');
  });

  it('保険会社フィルタ適用: filter.insurer 指定 → 該当社のみ', () => {
    const filteredByInsurer: SalesPerfFilter = {
      ...defaultFilter,
      insurer: '第一生命',
    };
    const contracts = [
      makeContract({ insurer: '第一生命', productType: '終身保険', firstYearCommission: 200000 }),
      makeContract({ insurer: '日本生命', productType: '定期保険', firstYearCommission: 150000 }),
    ];
    const result = insurerTypeBreakdown(contracts, filteredByInsurer, masters, 'admin', 'u1', 'commission');
    expect(result).toHaveLength(1);
    expect(result[0].insurer).toBe('第一生命');
  });

  it('複数保険会社×複数種目 → 全クロス集計が正確', () => {
    const contracts = [
      makeContract({ insurer: '第一生命', productType: '終身保険',  firstYearCommission: 100000 }),
      makeContract({ insurer: '第一生命', productType: '医療保険',  firstYearCommission: 80000 }),
      makeContract({ insurer: '日本生命', productType: '終身保険',  firstYearCommission: 120000 }),
      makeContract({ insurer: '日本生命', productType: '定期保険',  firstYearCommission: 60000 }),
      makeContract({ insurer: '日本生命', productType: '定期保険',  firstYearCommission: 70000 }), // 同種目2件目
    ];
    const result = insurerTypeBreakdown(contracts, defaultFilter, masters, 'admin', 'u1', 'commission');

    expect(result).toHaveLength(2);

    // 日本生命 = 120000+60000+70000=250000 > 第一生命 = 180000
    expect(result[0].insurer).toBe('日本生命');
    expect(result[0].commission).toBe(250000);
    expect(result[0].count).toBe(3);

    const nippon = result[0];
    const teiki = nippon.productTypes.find(p => p.key === '定期保険');
    expect(teiki?.count).toBe(2);
    expect(teiki?.commission).toBe(130000);

    expect(result[1].insurer).toBe('第一生命');
    expect(result[1].commission).toBe(180000);
    expect(result[1].count).toBe(2);
  });

  it('scope 制限: general ロール → 自分のデータのみ', () => {
    const contracts = [
      makeContract({ ownerId: 'u1', insurer: '第一生命', firstYearCommission: 200000 }),
      makeContract({ ownerId: 'u2', insurer: '日本生命', firstYearCommission: 150000 }),
    ];
    // general ロールは自分 (u1) のみ
    const result = insurerTypeBreakdown(contracts, defaultFilter, masters, 'general', 'u1', 'commission');
    expect(result).toHaveLength(1);
    expect(result[0].insurer).toBe('第一生命');
  });
});
