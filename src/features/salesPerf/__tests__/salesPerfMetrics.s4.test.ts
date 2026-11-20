// =====================================================
// salesPerfMetrics.s4.test.ts — S4チャネル分析 単体テスト
// channelBreakdown / partnerMonthlyBreakdown
// =====================================================
import { describe, it, expect } from 'vitest';
import {
  channelBreakdown,
  partnerMonthlyBreakdown,
} from '../lib/salesPerfMetrics';
import type {
  SalesContract,
  SalesPerfFilter,
  SalesPerfMasters,
} from '../types';

// ----------------------------------------
// 共通フィクスチャ
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
    partner: '銀行A',
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

// ============================================================
// channelBreakdown
// ============================================================
describe('channelBreakdown', () => {
  it('空データ → 空配列を返す', () => {
    const result = channelBreakdown([], defaultFilter, masters, 'admin', 'u1');
    expect(result).toHaveLength(0);
  });

  it('件数が正しく集計される', () => {
    const contracts = [
      makeContract({ id: 'c1', channel: '紹介', firstYearCommission: 100000 }),
      makeContract({ id: 'c2', channel: '紹介', firstYearCommission: 200000 }),
      makeContract({ id: 'c3', channel: '飛込', firstYearCommission: 300000 }),
    ];
    const result = channelBreakdown(contracts, defaultFilter, masters, 'admin', 'u1');
    const shoukai = result.find(r => r.channel === '紹介');
    const tobikomi = result.find(r => r.channel === '飛込');
    expect(shoukai?.count).toBe(2);
    expect(tobikomi?.count).toBe(1);
  });

  it('手数料が正しく集計される', () => {
    const contracts = [
      makeContract({ id: 'c1', channel: '紹介', firstYearCommission: 100000 }),
      makeContract({ id: 'c2', channel: '紹介', firstYearCommission: 200000 }),
    ];
    const result = channelBreakdown(contracts, defaultFilter, masters, 'admin', 'u1');
    const shoukai = result.find(r => r.channel === '紹介');
    expect(shoukai?.commission).toBe(300000);
  });

  it('構成比が正しく計算される', () => {
    const contracts = [
      makeContract({ id: 'c1', channel: '紹介', firstYearCommission: 600000 }),
      makeContract({ id: 'c2', channel: '飛込', firstYearCommission: 400000 }),
    ];
    const result = channelBreakdown(contracts, defaultFilter, masters, 'admin', 'u1');
    const shoukai = result.find(r => r.channel === '紹介');
    const tobikomi = result.find(r => r.channel === '飛込');
    // 紹介: 600000/1000000 * 100 = 60%
    expect(shoukai?.share).toBeCloseTo(60, 1);
    // 飛込: 400000/1000000 * 100 = 40%
    expect(tobikomi?.share).toBeCloseTo(40, 1);
  });

  it('全件commission=0 → share=null (分母0)', () => {
    const contracts = [
      makeContract({ id: 'c1', channel: '紹介', firstYearCommission: 0 }),
    ];
    const result = channelBreakdown(contracts, defaultFilter, masters, 'admin', 'u1');
    expect(result[0].share).toBeNull();
  });

  it('firstYearCommission=null は0扱い (件数はカウント)', () => {
    const contracts = [
      makeContract({ id: 'c1', channel: '紹介', firstYearCommission: null }),
    ];
    const result = channelBreakdown(contracts, defaultFilter, masters, 'admin', 'u1');
    expect(result[0].count).toBe(1);
    expect(result[0].commission).toBe(0);
  });

  it('手数料降順でソートされる', () => {
    const contracts = [
      makeContract({ id: 'c1', channel: '飛込', firstYearCommission: 100000 }),
      makeContract({ id: 'c2', channel: '紹介', firstYearCommission: 500000 }),
    ];
    const result = channelBreakdown(contracts, defaultFilter, masters, 'admin', 'u1');
    expect(result[0].channel).toBe('紹介');
    expect(result[1].channel).toBe('飛込');
  });

  it('確度シナリオ fixed: S/Aは除外される', () => {
    const contracts = [
      makeContract({ id: 'c1', channel: '紹介', confidenceAgg: 'fixed', firstYearCommission: 100000 }),
      makeContract({ id: 'c2', channel: '紹介', confidenceAgg: 'fixed_s', firstYearCommission: 200000 }),
      makeContract({ id: 'c3', channel: '紹介', confidenceAgg: 'fixed_s_a', firstYearCommission: 300000 }),
    ];
    const result = channelBreakdown(contracts, defaultFilter, masters, 'admin', 'u1');
    // fixed シナリオ → 確定(100000)のみ
    const shoukai = result.find(r => r.channel === '紹介');
    expect(shoukai?.commission).toBe(100000);
    expect(shoukai?.count).toBe(1);
  });

  it('確度シナリオ fixed_s_a: 全て含まれる', () => {
    const filter = { ...defaultFilter, confidenceScenario: 'fixed_s_a' as const };
    const contracts = [
      makeContract({ id: 'c1', channel: '紹介', confidenceAgg: 'fixed',     firstYearCommission: 100000 }),
      makeContract({ id: 'c2', channel: '紹介', confidenceAgg: 'fixed_s',   firstYearCommission: 200000 }),
      makeContract({ id: 'c3', channel: '紹介', confidenceAgg: 'fixed_s_a', firstYearCommission: 300000 }),
    ];
    const result = channelBreakdown(contracts, filter, masters, 'admin', 'u1');
    const shoukai = result.find(r => r.channel === '紹介');
    expect(shoukai?.commission).toBe(600000);
    expect(shoukai?.count).toBe(3);
  });

  it('general ロール: 自分(u1)のみ対象', () => {
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1', channel: '紹介', firstYearCommission: 100000 }),
      makeContract({ id: 'c2', ownerId: 'u2', channel: '飛込', firstYearCommission: 200000 }),
    ];
    const result = channelBreakdown(contracts, defaultFilter, masters, 'general', 'u1');
    // u1 の紹介のみ
    expect(result).toHaveLength(1);
    expect(result[0].channel).toBe('紹介');
  });

  it('lineフィルタ life のみ', () => {
    const filter = { ...defaultFilter, line: 'life' as const };
    const contracts = [
      makeContract({ id: 'c1', line: 'life',    channel: '生保チャネル', firstYearCommission: 300000 }),
      makeContract({ id: 'c2', line: 'nonlife', channel: '損保チャネル', firstYearCommission: 500000 }),
    ];
    const result = channelBreakdown(contracts, filter, masters, 'admin', 'u1');
    expect(result).toHaveLength(1);
    expect(result[0].channel).toBe('生保チャネル');
  });

  it('fiscalYear フィルタが適用される', () => {
    const contracts = [
      makeContract({ id: 'c1', fiscalYear: 2025, channel: '紹介', firstYearCommission: 100000 }),
      makeContract({ id: 'c2', fiscalYear: 2024, channel: '紹介', firstYearCommission: 200000 }),
    ];
    const result = channelBreakdown(contracts, defaultFilter, masters, 'admin', 'u1');
    const shoukai = result.find(r => r.channel === '紹介');
    expect(shoukai?.count).toBe(1);
    expect(shoukai?.commission).toBe(100000);
  });

  it('構成比の合計が100に近い (浮動小数誤差許容)', () => {
    const contracts = [
      makeContract({ id: 'c1', channel: '紹介', firstYearCommission: 300000 }),
      makeContract({ id: 'c2', channel: '飛込', firstYearCommission: 200000 }),
      makeContract({ id: 'c3', channel: 'WEB', firstYearCommission: 500000 }),
    ];
    const result = channelBreakdown(contracts, defaultFilter, masters, 'admin', 'u1');
    const total = result.reduce((s, r) => s + (r.share ?? 0), 0);
    expect(total).toBeCloseTo(100, 1);
  });
});

// ============================================================
// partnerMonthlyBreakdown
// ============================================================
describe('partnerMonthlyBreakdown', () => {
  it('空データ → 空配列を返す', () => {
    const result = partnerMonthlyBreakdown([], defaultFilter, masters, 'admin', 'u1');
    expect(result).toHaveLength(0);
  });

  it('提携先別の月次件数が正しく集計される', () => {
    const contracts = [
      makeContract({ id: 'c1', partner: '銀行A', month: 1 }),
      makeContract({ id: 'c2', partner: '銀行A', month: 1 }),
      makeContract({ id: 'c3', partner: '銀行A', month: 2 }),
      makeContract({ id: 'c4', partner: '証券B', month: 1 }),
    ];
    const result = partnerMonthlyBreakdown(contracts, defaultFilter, masters, 'admin', 'u1');
    const bankA = result.find(r => r.partner === '銀行A');
    const secB  = result.find(r => r.partner === '証券B');
    expect(bankA?.monthly[1]).toBe(2);
    expect(bankA?.monthly[2]).toBe(1);
    expect(bankA?.total).toBe(3);
    expect(secB?.monthly[1]).toBe(1);
    expect(secB?.total).toBe(1);
  });

  it('合計件数が正しい', () => {
    const contracts = [
      makeContract({ id: 'c1', partner: '銀行A', month: 1 }),
      makeContract({ id: 'c2', partner: '銀行A', month: 3 }),
      makeContract({ id: 'c3', partner: '証券B', month: 2 }),
    ];
    const result = partnerMonthlyBreakdown(contracts, defaultFilter, masters, 'admin', 'u1');
    const bankA = result.find(r => r.partner === '銀行A');
    expect(bankA?.total).toBe(2);
  });

  it('構成比が正しく計算される (分母=全件数)', () => {
    const contracts = [
      makeContract({ id: 'c1', partner: '銀行A', month: 1 }),
      makeContract({ id: 'c2', partner: '銀行A', month: 2 }),
      makeContract({ id: 'c3', partner: '証券B', month: 1 }),
      makeContract({ id: 'c4', partner: '証券B', month: 3 }),
    ];
    const result = partnerMonthlyBreakdown(contracts, defaultFilter, masters, 'admin', 'u1');
    const bankA = result.find(r => r.partner === '銀行A');
    const secB  = result.find(r => r.partner === '証券B');
    // 総件数=4, 銀行A=2 → 50%, 証券B=2 → 50%
    expect(bankA?.share).toBeCloseTo(50, 1);
    expect(secB?.share).toBeCloseTo(50, 1);
  });

  it('件数合計0 → share=null (分母0ガード)', () => {
    // 全件がシナリオ外 → filtered=[]
    const contracts = [
      makeContract({ id: 'c1', partner: '銀行A', confidenceAgg: 'fixed_s_a', month: 1 }),
    ];
    // fixed シナリオなので fixed_s_a は除外
    const result = partnerMonthlyBreakdown(contracts, defaultFilter, masters, 'admin', 'u1');
    expect(result).toHaveLength(0);
  });

  it('month=null の件は 0-bucket (未計上) に集計される', () => {
    const contracts = [
      makeContract({ id: 'c1', partner: '銀行A', month: null }),
    ];
    const result = partnerMonthlyBreakdown(contracts, defaultFilter, masters, 'admin', 'u1');
    const bankA = result.find(r => r.partner === '銀行A');
    // month=0 bucket に入る
    expect(bankA?.monthly[0]).toBe(1);
    expect(bankA?.total).toBe(1);
  });

  it('total降順でソートされる', () => {
    const contracts = [
      makeContract({ id: 'c1', partner: '証券B', month: 1 }),
      makeContract({ id: 'c2', partner: '銀行A', month: 1 }),
      makeContract({ id: 'c3', partner: '銀行A', month: 2 }),
    ];
    const result = partnerMonthlyBreakdown(contracts, defaultFilter, masters, 'admin', 'u1');
    // 銀行A=2件 > 証券B=1件
    expect(result[0].partner).toBe('銀行A');
    expect(result[1].partner).toBe('証券B');
  });

  it('確度シナリオ fixed_s_a で全件含む', () => {
    const filter = { ...defaultFilter, confidenceScenario: 'fixed_s_a' as const };
    const contracts = [
      makeContract({ id: 'c1', partner: '銀行A', confidenceAgg: 'fixed',     month: 1 }),
      makeContract({ id: 'c2', partner: '銀行A', confidenceAgg: 'fixed_s',   month: 2 }),
      makeContract({ id: 'c3', partner: '銀行A', confidenceAgg: 'fixed_s_a', month: 3 }),
    ];
    const result = partnerMonthlyBreakdown(contracts, filter, masters, 'admin', 'u1');
    const bankA = result.find(r => r.partner === '銀行A');
    expect(bankA?.total).toBe(3);
  });

  it('general ロール: 自分(u1)のみ対象', () => {
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1', partner: '銀行A', month: 1 }),
      makeContract({ id: 'c2', ownerId: 'u2', partner: '証券B', month: 1 }),
    ];
    const result = partnerMonthlyBreakdown(contracts, defaultFilter, masters, 'general', 'u1');
    expect(result).toHaveLength(1);
    expect(result[0].partner).toBe('銀行A');
  });

  it('構成比の合計が100に近い (複数提携先)', () => {
    const contracts = [
      makeContract({ id: 'c1', partner: '銀行A', month: 1 }),
      makeContract({ id: 'c2', partner: '証券B', month: 1 }),
      makeContract({ id: 'c3', partner: '不動産C', month: 2 }),
    ];
    const result = partnerMonthlyBreakdown(contracts, defaultFilter, masters, 'admin', 'u1');
    const total = result.reduce((s, r) => s + (r.share ?? 0), 0);
    expect(total).toBeCloseTo(100, 0);
  });

  it('lineフィルタ nonlife のみ', () => {
    const filter = { ...defaultFilter, line: 'nonlife' as const };
    const contracts = [
      makeContract({ id: 'c1', line: 'life',    partner: '生保提携先', month: 1 }),
      makeContract({ id: 'c2', line: 'nonlife', partner: '損保提携先', month: 1 }),
    ];
    const result = partnerMonthlyBreakdown(contracts, filter, masters, 'admin', 'u1');
    expect(result).toHaveLength(1);
    expect(result[0].partner).toBe('損保提携先');
  });
});
