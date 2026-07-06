// =====================================================
// salesPerfMetrics.s3.test.ts — S3集計 単体テスト
// funnelMetrics / ownerFunnelHeat
// =====================================================
import { describe, it, expect } from 'vitest';
import {
  funnelMetrics,
  ownerFunnelHeat,
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
    householdId: 'hh1',
    _issues: [],
    ...overrides,
  };
}

// ----------------------------------------
// funnelMetrics テスト
// ----------------------------------------
describe('funnelMetrics', () => {
  it('空配列 → すべて0, 転換率null', () => {
    const result = funnelMetrics([], defaultFilter, masters, 'admin', 'u1');
    expect(result.meetings).toBe(0);
    expect(result.lifeplans).toBe(0);
    expect(result.policyCollections).toBe(0);
    expect(result.proposals).toBe(0);
    expect(result.contracts).toBe(0);
    expect(result.contractCount).toBe(0);
    expect(result.lpRate).toBeNull();
    expect(result.proposalRate).toBeNull();
    expect(result.contractRate).toBeNull();
    expect(result.avgHouseholdValue).toBeNull();
  });

  it('商談あり・LP なし → LP率 null (分母0ではなく分子0)', () => {
    const c = makeContract({ hadMeeting: true, hadLifeplan: false, hadProposal: false, policyCollected: false, confidenceCode: 'B', confidenceAgg: null });
    const result = funnelMetrics([c], defaultFilter, masters, 'admin', 'u1');
    expect(result.meetings).toBe(1);
    expect(result.lifeplans).toBe(0);
    // meetings>0 なので LP率は 0/1=0% (分母 non-zero → 0 が返る)
    expect(result.lpRate).toBe(0);
  });

  it('商談0 → LP率 null (分母0)', () => {
    const c = makeContract({ hadMeeting: false, hadLifeplan: false, hadProposal: false, policyCollected: false });
    const result = funnelMetrics([c], defaultFilter, masters, 'admin', 'u1');
    expect(result.meetings).toBe(0);
    expect(result.lpRate).toBeNull();
  });

  it('基本的なファネル計算', () => {
    const contracts: SalesContract[] = [
      // u1: meeting, LP, proposal, fixed contract hh1
      makeContract({ id: 'c1', ownerId: 'u1', hadMeeting: true, hadLifeplan: true, policyCollected: true, hadProposal: true, confidenceCode: 'fixed', confidenceAgg: 'fixed', householdId: 'hh1', firstYearCommission: 300000 }),
      // u1: meeting, LP のみ
      makeContract({ id: 'c2', ownerId: 'u1', hadMeeting: true, hadLifeplan: true, policyCollected: false, hadProposal: false, confidenceCode: 'A', confidenceAgg: 'fixed_s_a', householdId: 'hh2', firstYearCommission: 200000 }),
      // u2: meeting, no LP, proposal, fixed hh1 (同一世帯)
      makeContract({ id: 'c3', ownerId: 'u2', hadMeeting: true, hadLifeplan: false, policyCollected: false, hadProposal: true, confidenceCode: 'fixed', confidenceAgg: 'fixed', householdId: 'hh1', firstYearCommission: 150000 }),
    ];

    const result = funnelMetrics(contracts, defaultFilter, masters, 'admin', 'u1');

    expect(result.meetings).toBe(3);
    expect(result.lifeplans).toBe(2);
    expect(result.policyCollections).toBe(1);
    expect(result.proposals).toBe(2);
    // 確定契約: c1(hh1), c3(hh1) → ユニーク世帯=1
    expect(result.contracts).toBe(1);   // 世帯数
    expect(result.contractCount).toBe(2); // 件数

    // LP率 = 2/3 * 100 ≈ 66.67
    expect(result.lpRate).toBeCloseTo(66.67, 1);
    // 提案率 = 2/3 * 100 ≈ 66.67
    expect(result.proposalRate).toBeCloseTo(66.67, 1);
    // 契約率 = 1世帯/2提案 * 100 = 50
    expect(result.contractRate).toBe(50);
    // 1世帯単価 = (300000+150000) / 1 世帯 = 450000
    expect(result.avgHouseholdValue).toBe(450000);
  });

  it('提案0 → 契約率 null', () => {
    const c = makeContract({ hadProposal: false, confidenceCode: 'fixed', confidenceAgg: 'fixed', householdId: 'hh1' });
    const result = funnelMetrics([c], defaultFilter, masters, 'admin', 'u1');
    expect(result.contractRate).toBeNull();
  });

  it('フィルタ: ライン絞り込み (life のみ)', () => {
    const lifeFilter: SalesPerfFilter = { ...defaultFilter, line: 'life' };
    const contracts: SalesContract[] = [
      makeContract({ id: 'c1', line: 'life',    hadMeeting: true }),
      makeContract({ id: 'c2', line: 'nonlife', hadMeeting: true }),
    ];
    const result = funnelMetrics(contracts, lifeFilter, masters, 'admin', 'u1');
    expect(result.meetings).toBe(1);
  });

  it('フィルタ: 年度絞り込み', () => {
    const contracts: SalesContract[] = [
      makeContract({ id: 'c1', fiscalYear: 2025, hadMeeting: true }),
      makeContract({ id: 'c2', fiscalYear: 2024, hadMeeting: true }),
    ];
    const result = funnelMetrics(contracts, defaultFilter, masters, 'admin', 'u1');
    expect(result.meetings).toBe(1);
  });

  it('general ロール → 自分の契約のみ', () => {
    const contracts: SalesContract[] = [
      makeContract({ id: 'c1', ownerId: 'u1', hadMeeting: true }),
      makeContract({ id: 'c2', ownerId: 'u2', hadMeeting: true }),
    ];
    const result = funnelMetrics(contracts, defaultFilter, masters, 'general', 'u1');
    expect(result.meetings).toBe(1);
  });

  it('契約世帯0 → avgHouseholdValue null', () => {
    // 確定契約なし
    const c = makeContract({ confidenceCode: 'A', confidenceAgg: 'fixed_s_a' });
    const result = funnelMetrics([c], defaultFilter, masters, 'admin', 'u1');
    expect(result.contracts).toBe(0);
    expect(result.avgHouseholdValue).toBeNull();
  });
});

// ----------------------------------------
// ownerFunnelHeat テスト
// ----------------------------------------
describe('ownerFunnelHeat', () => {
  it('空配列 → 全員0, 転換率null', () => {
    const rows = ownerFunnelHeat([], defaultFilter, masters, 'admin', 'u1');
    // scopeIds は masters.users 全員 (admin+全体フィルタ)
    expect(rows.length).toBe(3);
    for (const row of rows) {
      expect(row.meetings).toBe(0);
      expect(row.lifeplans).toBe(0);
      expect(row.lpRate).toBeNull();
    }
  });

  it('担当者ごとに正しく集計', () => {
    const contracts: SalesContract[] = [
      makeContract({ id: 'c1', ownerId: 'u1', hadMeeting: true, hadLifeplan: true, hadProposal: true, confidenceCode: 'fixed', confidenceAgg: 'fixed', householdId: 'hh1' }),
      makeContract({ id: 'c2', ownerId: 'u2', hadMeeting: true, hadLifeplan: false, hadProposal: false, confidenceCode: 'B', confidenceAgg: null, householdId: 'hh2' }),
    ];

    const rows = ownerFunnelHeat(contracts, defaultFilter, masters, 'admin', 'u1');
    const u1Row = rows.find(r => r.ownerId === 'u1');
    const u2Row = rows.find(r => r.ownerId === 'u2');

    expect(u1Row).toBeDefined();
    expect(u1Row!.meetings).toBe(1);
    expect(u1Row!.lifeplans).toBe(1);
    expect(u1Row!.proposals).toBe(1);
    expect(u1Row!.contracts).toBe(1);   // 確定世帯=1
    expect(u1Row!.lpRate).toBe(100);    // 1LP/1商談
    expect(u1Row!.contractRate).toBe(100); // 1世帯/1提案

    expect(u2Row).toBeDefined();
    expect(u2Row!.meetings).toBe(1);
    expect(u2Row!.lifeplans).toBe(0);
    expect(u2Row!.lpRate).toBe(0);      // 0LP/1商談=0%
    expect(u2Row!.contracts).toBe(0);   // 確定なし
    expect(u2Row!.contractRate).toBeNull(); // 提案0→null
  });

  it('ownerName が正しく設定される', () => {
    const rows = ownerFunnelHeat([], defaultFilter, masters, 'admin', 'u1');
    const u1Row = rows.find(r => r.ownerId === 'u1');
    expect(u1Row!.ownerName).toBe('霧島 遥');
  });

  it('グループフィルタ連動', () => {
    const groupFilter: SalesPerfFilter = { ...defaultFilter, groupId: 'g1' };
    const rows = ownerFunnelHeat([], groupFilter, masters, 'admin', 'u1');
    expect(rows.length).toBe(2); // g1: u1, u2 のみ
    expect(rows.map(r => r.ownerId).sort()).toEqual(['u1', 'u2']);
  });

  it('LP率・契約率のnull境界: 商談0→LP率null', () => {
    const c = makeContract({ ownerId: 'u1', hadMeeting: false, hadLifeplan: true });
    const rows = ownerFunnelHeat([c], defaultFilter, masters, 'admin', 'u1');
    const u1Row = rows.find(r => r.ownerId === 'u1');
    expect(u1Row!.meetings).toBe(0);
    expect(u1Row!.lpRate).toBeNull();
  });

  it('提案0→契約率null', () => {
    const c = makeContract({ ownerId: 'u1', hadProposal: false, confidenceCode: 'fixed', confidenceAgg: 'fixed' });
    const rows = ownerFunnelHeat([c], defaultFilter, masters, 'admin', 'u1');
    const u1Row = rows.find(r => r.ownerId === 'u1');
    expect(u1Row!.proposals).toBe(0);
    expect(u1Row!.contractRate).toBeNull();
  });

  it('同一世帯の複数契約 → 世帯数は1', () => {
    const contracts: SalesContract[] = [
      makeContract({ id: 'c1', ownerId: 'u1', confidenceCode: 'fixed', confidenceAgg: 'fixed', householdId: 'hh1' }),
      makeContract({ id: 'c2', ownerId: 'u1', confidenceCode: 'fixed', confidenceAgg: 'fixed', householdId: 'hh1' }),
      makeContract({ id: 'c3', ownerId: 'u1', confidenceCode: 'fixed', confidenceAgg: 'fixed', householdId: 'hh2' }),
    ];
    const rows = ownerFunnelHeat(contracts, defaultFilter, masters, 'admin', 'u1');
    const u1Row = rows.find(r => r.ownerId === 'u1');
    expect(u1Row!.contracts).toBe(2); // hh1, hh2 = 2世帯
  });
});
