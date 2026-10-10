// =====================================================
// salesPerfMetrics.s6.test.ts — S6集計 単体テスト
// lifePlanMetrics
// T3-3: ライフプラン実績 (生保のみ・チャネル別・月次)
// =====================================================
import { describe, it, expect } from 'vitest';
import {
  lifePlanMetrics,
} from '../lib/salesPerfMetrics';
import type {
  SalesContract,
  SalesPerfFilter,
  SalesPerfMasters,
} from '../types';
import { LP_TARGET_PER_MONTH } from '../constants';

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
// LP_TARGET_PER_MONTH 定数
// ----------------------------------------
describe('LP_TARGET_PER_MONTH', () => {
  it('定数が7件であること', () => {
    expect(LP_TARGET_PER_MONTH).toBe(7);
  });
});

// ----------------------------------------
// lifePlanMetrics テスト
// ----------------------------------------
describe('lifePlanMetrics', () => {
  it('空配列 → 空の rows を返す', () => {
    const rows = lifePlanMetrics([], defaultFilter, masters, 'admin', 'u1', LP_TARGET_PER_MONTH);
    expect(rows).toHaveLength(0);
  });

  it('生保のみを対象とする (損保は除外)', () => {
    const contracts: SalesContract[] = [
      makeContract({ id: 'c1', line: 'life',    channel: '紹介',  hadLifeplan: true,  month: 1 }),
      makeContract({ id: 'c2', line: 'nonlife', channel: '住宅',  hadLifeplan: true,  month: 1 }),
    ];
    const rows = lifePlanMetrics(contracts, defaultFilter, masters, 'admin', 'u1', LP_TARGET_PER_MONTH);
    // 生保 'c1' のみ対象 → チャネル '紹介' が存在
    const channels = [...new Set(rows.map(r => r.channel))];
    expect(channels).toContain('紹介');
    expect(channels).not.toContain('住宅');
  });

  it('フィルタ line=nonlife 時 → 生保強制なので空', () => {
    const nonlifeFilter: SalesPerfFilter = { ...defaultFilter, line: 'nonlife' };
    const contracts: SalesContract[] = [
      makeContract({ id: 'c1', line: 'life', channel: '紹介', hadLifeplan: true, month: 1 }),
    ];
    // life に強制される: nonlifeFilter でも applyFilter({ ...filter, line: 'life' }) になる
    const rows = lifePlanMetrics(contracts, nonlifeFilter, masters, 'admin', 'u1', LP_TARGET_PER_MONTH);
    // life 契約なので actual=1 になる (生保強制が正しく動作)
    const row = rows.find(r => r.channel === '紹介' && r.month === 1);
    expect(row).toBeDefined();
    expect(row!.actual).toBe(1);
  });

  it('hadLifeplan=true の件数のみカウント', () => {
    const contracts: SalesContract[] = [
      makeContract({ id: 'c1', channel: '紹介', hadLifeplan: true,  month: 1 }),
      makeContract({ id: 'c2', channel: '紹介', hadLifeplan: false, month: 1 }),
      makeContract({ id: 'c3', channel: '紹介', hadLifeplan: true,  month: 1 }),
    ];
    const rows = lifePlanMetrics(contracts, defaultFilter, masters, 'admin', 'u1', LP_TARGET_PER_MONTH);
    const row = rows.find(r => r.channel === '紹介' && r.month === 1);
    expect(row).toBeDefined();
    expect(row!.actual).toBe(2); // c1, c3 のみ
  });

  it('月次データが12行×チャネル数で返る', () => {
    const contracts: SalesContract[] = [
      makeContract({ id: 'c1', channel: '紹介', hadLifeplan: true, month: 1 }),
      makeContract({ id: 'c2', channel: '住宅', hadLifeplan: true, month: 2 }),
    ];
    const rows = lifePlanMetrics(contracts, defaultFilter, masters, 'admin', 'u1', LP_TARGET_PER_MONTH);
    const channels = [...new Set(rows.map(r => r.channel))];
    // 2チャネル × 12ヶ月 = 24行
    expect(rows.length).toBe(channels.length * 12);
  });

  it('target は渡した lpTargetPerMonth で設定される', () => {
    const contracts: SalesContract[] = [
      makeContract({ id: 'c1', channel: '紹介', hadLifeplan: true, month: 1 }),
    ];
    const rows = lifePlanMetrics(contracts, defaultFilter, masters, 'admin', 'u1', 10);
    expect(rows[0].target).toBe(10);
  });

  it('LP_TARGET_PER_MONTH=7 で target=7 になる', () => {
    const contracts: SalesContract[] = [
      makeContract({ id: 'c1', channel: '紹介', hadLifeplan: true, month: 3 }),
    ];
    const rows = lifePlanMetrics(contracts, defaultFilter, masters, 'admin', 'u1', LP_TARGET_PER_MONTH);
    const row = rows.find(r => r.channel === '紹介' && r.month === 3);
    expect(row!.target).toBe(LP_TARGET_PER_MONTH); // 7
  });

  it('チャネル別に正しく集計される', () => {
    const contracts: SalesContract[] = [
      makeContract({ id: 'c1', channel: '紹介',     hadLifeplan: true,  month: 2 }),
      makeContract({ id: 'c2', channel: '紹介',     hadLifeplan: true,  month: 2 }),
      makeContract({ id: 'c3', channel: 'ウェブクルー', hadLifeplan: true,  month: 2 }),
      makeContract({ id: 'c4', channel: '住宅',     hadLifeplan: false, month: 2 }),
    ];
    const rows = lifePlanMetrics(contracts, defaultFilter, masters, 'admin', 'u1', LP_TARGET_PER_MONTH);

    const shokai2 = rows.find(r => r.channel === '紹介' && r.month === 2);
    const web2    = rows.find(r => r.channel === 'ウェブクルー' && r.month === 2);
    const jutaku2 = rows.find(r => r.channel === '住宅' && r.month === 2);

    expect(shokai2?.actual).toBe(2);
    expect(web2?.actual).toBe(1);
    expect(jutaku2?.actual).toBe(0); // hadLifeplan=false
  });

  it('month=null の契約はカウント外 (periodMode=single)', () => {
    const singleFilter: SalesPerfFilter = { ...defaultFilter, periodMode: 'single', singleMonth: 5 };
    const contracts: SalesContract[] = [
      makeContract({ id: 'c1', channel: '紹介', hadLifeplan: true, month: null }),
      makeContract({ id: 'c2', channel: '紹介', hadLifeplan: true, month: 5 }),
    ];
    const rows = lifePlanMetrics(contracts, singleFilter, masters, 'admin', 'u1', LP_TARGET_PER_MONTH);
    const row5 = rows.find(r => r.channel === '紹介' && r.month === 5);
    // singleMonth=5 なので month=null は除外される
    expect(row5?.actual).toBe(1);
  });

  it('general ロール → 自分の契約のみ', () => {
    const contracts: SalesContract[] = [
      makeContract({ id: 'c1', ownerId: 'u1', channel: '紹介', hadLifeplan: true, month: 1 }),
      makeContract({ id: 'c2', ownerId: 'u2', channel: '紹介', hadLifeplan: true, month: 1 }),
    ];
    const rows = lifePlanMetrics(contracts, defaultFilter, masters, 'general', 'u1', LP_TARGET_PER_MONTH);
    const row = rows.find(r => r.channel === '紹介' && r.month === 1);
    expect(row?.actual).toBe(1); // u1 のみ
  });

  it('label (会計月ラベル) が正しく設定される', () => {
    const contracts: SalesContract[] = [
      makeContract({ id: 'c1', channel: '紹介', hadLifeplan: true, month: 1 }),
    ];
    const rows = lifePlanMetrics(contracts, defaultFilter, masters, 'admin', 'u1', LP_TARGET_PER_MONTH);
    const row1 = rows.find(r => r.channel === '紹介' && r.month === 1);
    expect(row1?.label).toBe('4月'); // 会計月1 = 4月
  });

  it('達成判定: actual >= target', () => {
    const contracts: SalesContract[] = Array.from({ length: 7 }, (_, i) =>
      makeContract({ id: `c${i}`, channel: '紹介', hadLifeplan: true, month: 6 }),
    );
    const rows = lifePlanMetrics(contracts, defaultFilter, masters, 'admin', 'u1', LP_TARGET_PER_MONTH);
    const row6 = rows.find(r => r.channel === '紹介' && r.month === 6);
    expect(row6?.actual).toBe(7);
    expect(row6!.actual >= row6!.target).toBe(true); // 達成
  });

  it('未達: actual < target', () => {
    const contracts: SalesContract[] = Array.from({ length: 3 }, (_, i) =>
      makeContract({ id: `c${i}`, channel: '紹介', hadLifeplan: true, month: 6 }),
    );
    const rows = lifePlanMetrics(contracts, defaultFilter, masters, 'admin', 'u1', LP_TARGET_PER_MONTH);
    const row6 = rows.find(r => r.channel === '紹介' && r.month === 6);
    expect(row6?.actual).toBe(3);
    expect(row6!.actual < row6!.target).toBe(true); // 未達
  });

  it('年度フィルタ: 他年度のデータは除外', () => {
    const contracts: SalesContract[] = [
      makeContract({ id: 'c1', fiscalYear: 2025, channel: '紹介', hadLifeplan: true, month: 1 }),
      makeContract({ id: 'c2', fiscalYear: 2024, channel: '紹介', hadLifeplan: true, month: 1 }),
    ];
    const rows = lifePlanMetrics(contracts, defaultFilter, masters, 'admin', 'u1', LP_TARGET_PER_MONTH);
    const row = rows.find(r => r.channel === '紹介' && r.month === 1);
    expect(row?.actual).toBe(1); // 2025 年度のみ
  });

  it('複数担当者の合計が正しく集計される (admin ロール)', () => {
    const contracts: SalesContract[] = [
      makeContract({ id: 'c1', ownerId: 'u1', channel: 'セミナー', hadLifeplan: true, month: 4 }),
      makeContract({ id: 'c2', ownerId: 'u2', channel: 'セミナー', hadLifeplan: true, month: 4 }),
      makeContract({ id: 'c3', ownerId: 'u3', channel: 'セミナー', hadLifeplan: true, month: 4 }),
    ];
    const rows = lifePlanMetrics(contracts, defaultFilter, masters, 'admin', 'u1', LP_TARGET_PER_MONTH);
    const row = rows.find(r => r.channel === 'セミナー' && r.month === 4);
    expect(row?.actual).toBe(3);
  });
});
