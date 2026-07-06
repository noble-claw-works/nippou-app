// =====================================================
// salesPerfMetrics.s7.test.ts — S7 contractRows 単体テスト
// T2-2: 契約明細ドリルダウン
// =====================================================
import { describe, it, expect } from 'vitest';
import { contractRows, applyFilter } from '../lib/salesPerfMetrics';
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
    { id: 'u1', name: '霧島 遥',   groupId: 'g1', role: 'general' },
    { id: 'u2', name: '佐倉 涼',   groupId: 'g1', role: 'general' },
    { id: 'u3', name: '東雲 蓮',   groupId: 'g2', role: 'manager' },
    { id: 'u4', name: '天音 結衣', groupId: 'g2', role: 'general' },
  ],
  groups: [
    { id: 'g1', name: '第一営業G', memberIds: ['u1', 'u2'], managerIds: ['u3'] },
    { id: 'g2', name: '第二営業G', memberIds: ['u3', 'u4'], managerIds: ['u3'] },
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

// ----------------------------------------
// S7: contractRows — スコープ制御
// ----------------------------------------
describe('contractRows — スコープ制御', () => {
  it('admin ロールは全担当の契約を返す', () => {
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1' }),
      makeContract({ id: 'c2', ownerId: 'u2' }),
      makeContract({ id: 'c3', ownerId: 'u4' }),
    ];
    const rows = contractRows(contracts, defaultFilter, masters, 'admin', 'u3');
    expect(rows).toHaveLength(3);
  });

  it('general ロールは自分の担当のみ返す', () => {
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1' }),
      makeContract({ id: 'c2', ownerId: 'u2' }),
      makeContract({ id: 'c3', ownerId: 'u4' }),
    ];
    const rows = contractRows(contracts, defaultFilter, masters, 'general', 'u1');
    expect(rows).toHaveLength(1);
    expect(rows[0].ownerId).toBe('u1');
  });

  it('general ロール: 他担当の契約は含まない', () => {
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u2' }),
      makeContract({ id: 'c2', ownerId: 'u4' }),
    ];
    const rows = contractRows(contracts, defaultFilter, masters, 'general', 'u1');
    expect(rows).toHaveLength(0);
  });

  it('manager ロールは全担当の契約を返す', () => {
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1' }),
      makeContract({ id: 'c2', ownerId: 'u4' }),
    ];
    const rows = contractRows(contracts, defaultFilter, masters, 'manager', 'u3');
    expect(rows).toHaveLength(2);
  });

  it('executive ロールは全担当の契約を返す', () => {
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1' }),
      makeContract({ id: 'c2', ownerId: 'u2' }),
      makeContract({ id: 'c3', ownerId: 'u4' }),
    ];
    const rows = contractRows(contracts, defaultFilter, masters, 'executive', 'u3');
    expect(rows).toHaveLength(3);
  });
});

// ----------------------------------------
// S7: contractRows — フィルタ適用
// ----------------------------------------
describe('contractRows — フィルタ適用', () => {
  const contracts = [
    makeContract({ id: 'c1', ownerId: 'u1', line: 'life',    fiscalYear: 2025 }),
    makeContract({ id: 'c2', ownerId: 'u1', line: 'nonlife', fiscalYear: 2025 }),
    makeContract({ id: 'c3', ownerId: 'u1', line: 'life',    fiscalYear: 2024 }),
  ];

  it('line=life フィルタで生保のみ返す', () => {
    const rows = contractRows(
      contracts,
      { ...defaultFilter, line: 'life' },
      masters,
      'admin',
      'u1',
    );
    expect(rows.every(r => r.line === 'life')).toBe(true);
    expect(rows).toHaveLength(1);
  });

  it('line=nonlife フィルタで損保のみ返す', () => {
    const rows = contractRows(
      contracts,
      { ...defaultFilter, line: 'nonlife' },
      masters,
      'admin',
      'u1',
    );
    expect(rows.every(r => r.line === 'nonlife')).toBe(true);
    expect(rows).toHaveLength(1);
  });

  it('line=both フィルタで両方返す', () => {
    const rows = contractRows(
      contracts,
      { ...defaultFilter, line: 'both' },
      masters,
      'admin',
      'u1',
    );
    expect(rows).toHaveLength(2); // FY2025のみ
  });

  it('fiscalYear フィルタで当年度のみ返す', () => {
    const rows = contractRows(
      contracts,
      { ...defaultFilter, fiscalYear: 2024 },
      masters,
      'admin',
      'u1',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].fiscalYear).toBe(2024);
  });

  it('insurer フィルタで指定保険会社のみ返す', () => {
    const c2 = makeContract({ id: 'c2', ownerId: 'u1', insurer: '東京海上日動' });
    const rows = contractRows(
      [makeContract({ id: 'c1', ownerId: 'u1' }), c2],
      { ...defaultFilter, insurer: '東京海上日動' },
      masters,
      'admin',
      'u1',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].insurer).toBe('東京海上日動');
  });

  it('channel フィルタで指定チャネルのみ返す', () => {
    const c2 = makeContract({ id: 'c2', ownerId: 'u1', channel: '飛込' });
    const rows = contractRows(
      [makeContract({ id: 'c1', ownerId: 'u1' }), c2],
      { ...defaultFilter, channel: '飛込' },
      masters,
      'admin',
      'u1',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].channel).toBe('飛込');
  });

  it('groupId フィルタで指定グループのメンバーのみ返す', () => {
    const contracts2 = [
      makeContract({ id: 'c1', ownerId: 'u1', groupId: 'g1' }),
      makeContract({ id: 'c2', ownerId: 'u2', groupId: 'g1' }),
      makeContract({ id: 'c3', ownerId: 'u4', groupId: 'g2' }),
    ];
    const rows = contractRows(
      contracts2,
      { ...defaultFilter, groupId: 'g1' },
      masters,
      'admin',
      'u3',
    );
    // g1メンバー: u1, u2
    expect(rows.every(r => ['u1', 'u2'].includes(r.ownerId))).toBe(true);
    expect(rows).toHaveLength(2);
  });

  it('periodMode=single で指定会計月のみ返す', () => {
    const contracts2 = [
      makeContract({ id: 'c1', ownerId: 'u1', month: 4  }),   // 7月
      makeContract({ id: 'c2', ownerId: 'u1', month: 5  }),   // 8月
      makeContract({ id: 'c3', ownerId: 'u1', month: null }), // 未計上
    ];
    const rows = contractRows(
      contracts2,
      { ...defaultFilter, periodMode: 'single', singleMonth: 4 },
      masters,
      'admin',
      'u1',
    );
    // month=4 のみ, nullは除外
    expect(rows).toHaveLength(1);
    expect(rows[0].month).toBe(4);
  });
});

// ----------------------------------------
// S7: contractRows — 要確認フラグ
// ----------------------------------------
describe('contractRows — 要確認フラグ (_issues)', () => {
  it('要確認フラグなし契約は _issues が空配列', () => {
    const contracts = [makeContract({ id: 'c1', ownerId: 'u1', _issues: [] })];
    const rows = contractRows(contracts, defaultFilter, masters, 'admin', 'u1');
    expect(rows[0]._issues).toEqual([]);
  });

  it('premium_unparseable フラグが立った契約は _issues に含まれる', () => {
    const contracts = [
      makeContract({
        id: 'c1',
        ownerId: 'u1',
        monthlyPremium: null,
        _issues: ['premium_unparseable'],
      }),
    ];
    const rows = contractRows(contracts, defaultFilter, masters, 'admin', 'u1');
    expect(rows[0]._issues).toContain('premium_unparseable');
  });

  it('confidence_unknown フラグが立った契約は _issues に含まれる', () => {
    const contracts = [
      makeContract({
        id: 'c1',
        ownerId: 'u1',
        confidenceCode: 'unknown',
        _issues: ['confidence_unknown'],
      }),
    ];
    const rows = contractRows(contracts, defaultFilter, masters, 'admin', 'u1');
    expect(rows[0]._issues).toContain('confidence_unknown');
  });

  it('fy_mismatch フラグが立った契約は _issues に含まれる', () => {
    const contracts = [
      makeContract({
        id: 'c1',
        ownerId: 'u1',
        establishedDate: null,
        month: null,
        _issues: ['fy_mismatch'],
      }),
    ];
    const rows = contractRows(contracts, defaultFilter, masters, 'admin', 'u1');
    expect(rows[0]._issues).toContain('fy_mismatch');
  });

  it('複数フラグが立った契約は全て _issues に含まれる', () => {
    const issues = ['premium_unparseable', 'confidence_unknown', 'fy_mismatch'];
    const contracts = [
      makeContract({
        id: 'c1',
        ownerId: 'u1',
        firstYearCommission: null,
        _issues: issues,
      }),
    ];
    const rows = contractRows(contracts, defaultFilter, masters, 'admin', 'u1');
    expect(rows[0]._issues).toEqual(issues);
  });

  it('要確認フラグあり契約と正常契約が混在する場合、両方含まれる', () => {
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1', _issues: [] }),
      makeContract({ id: 'c2', ownerId: 'u1', _issues: ['premium_unparseable'] }),
      makeContract({ id: 'c3', ownerId: 'u1', _issues: ['fy_mismatch'] }),
    ];
    const rows = contractRows(contracts, defaultFilter, masters, 'admin', 'u1');
    expect(rows).toHaveLength(3);
    expect(rows.filter(r => r._issues.length > 0)).toHaveLength(2);
    expect(rows.filter(r => r._issues.length === 0)).toHaveLength(1);
  });

  it('要確認フラグは contractRows から除外されない(集計除外ではなく表示で区別)', () => {
    // 金額系 null でも件数に計上される
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1', firstYearCommission: null, _issues: ['premium_unparseable'] }),
    ];
    const rows = contractRows(contracts, defaultFilter, masters, 'general', 'u1');
    expect(rows).toHaveLength(1);
    expect(rows[0].firstYearCommission).toBeNull();
  });
});

// ----------------------------------------
// S7: contractRows — 件数とデータ整合性
// ----------------------------------------
describe('contractRows — 件数とデータ整合性', () => {
  it('0件のとき空配列を返す', () => {
    const rows = contractRows([], defaultFilter, masters, 'admin', 'u1');
    expect(rows).toEqual([]);
  });

  it('返却行には必須プロパティ(id/line/ownerId/insurer/channel)が存在する', () => {
    const contracts = [makeContract({ id: 'c1', ownerId: 'u1' })];
    const rows = contractRows(contracts, defaultFilter, masters, 'admin', 'u1');
    expect(rows[0]).toHaveProperty('id');
    expect(rows[0]).toHaveProperty('line');
    expect(rows[0]).toHaveProperty('ownerId');
    expect(rows[0]).toHaveProperty('insurer');
    expect(rows[0]).toHaveProperty('channel');
    expect(rows[0]).toHaveProperty('_issues');
  });

  it('1契約1行で返す (重複なし)', () => {
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1' }),
      makeContract({ id: 'c2', ownerId: 'u1' }),
      makeContract({ id: 'c3', ownerId: 'u1' }),
    ];
    const rows = contractRows(contracts, defaultFilter, masters, 'admin', 'u1');
    const ids = rows.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length); // 重複なし
    expect(rows).toHaveLength(3);
  });

  it('大量データ(300件)でも全件返す (admin)', () => {
    const contracts = Array.from({ length: 300 }, (_, i) =>
      makeContract({
        id: `c${i}`,
        ownerId: masters.users[i % masters.users.length].id,
      }),
    );
    const rows = contractRows(contracts, defaultFilter, masters, 'admin', 'u3');
    expect(rows).toHaveLength(300);
  });

  it('general ロールで大量データの場合、自分の契約のみ返す', () => {
    const contracts = Array.from({ length: 300 }, (_, i) =>
      makeContract({
        id: `c${i}`,
        ownerId: masters.users[i % masters.users.length].id,
      }),
    );
    const rows = contractRows(contracts, defaultFilter, masters, 'general', 'u1');
    expect(rows.every(r => r.ownerId === 'u1')).toBe(true);
  });
});

// ----------------------------------------
// applyFilter — 境界値テスト (S7 での利用確認)
// ----------------------------------------
describe('applyFilter — S7 向け境界値テスト', () => {
  const scopeIds = ['u1', 'u2', 'u3', 'u4'];

  it('month=null 契約は periodMode=full のとき含まれる', () => {
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1', month: null, establishedDate: null }),
    ];
    const result = applyFilter(contracts, { ...defaultFilter, periodMode: 'full' }, scopeIds);
    expect(result).toHaveLength(1);
  });

  it('month=null 契約は periodMode=single のとき除外される', () => {
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1', month: null, establishedDate: null }),
    ];
    const result = applyFilter(
      contracts,
      { ...defaultFilter, periodMode: 'single', singleMonth: 1 },
      scopeIds,
    );
    expect(result).toHaveLength(0);
  });

  it('productType フィルタで指定種目のみ返す', () => {
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1', productType: '終身保険' }),
      makeContract({ id: 'c2', ownerId: 'u1', productType: '医療保険' }),
    ];
    const result = applyFilter(
      contracts,
      { ...defaultFilter, productType: '医療保険' },
      scopeIds,
    );
    expect(result).toHaveLength(1);
    expect(result[0].productType).toBe('医療保険');
  });

  it('スコープ外 userId の契約は除外される', () => {
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'outside_user' }),
    ];
    const result = applyFilter(contracts, defaultFilter, scopeIds);
    expect(result).toHaveLength(0);
  });

  it('periodMode=h1 のとき全月(null含む)が含まれる (h1/h2は月フィルタ非適用=仕様)', () => {
    // applyFilter の仕様: h1/h2 では month による除外は行わない
    // (periodMode=single のみ month フィルタを適用。h1/h2 は集計関数側で範囲制御)
    const contracts = [
      makeContract({ id: 'c1', ownerId: 'u1', month: 3  }),  // 上期
      makeContract({ id: 'c2', ownerId: 'u1', month: 7  }),  // 下期
      makeContract({ id: 'c3', ownerId: 'u1', month: null }), // null → 含まれる
    ];
    const result = applyFilter(
      contracts,
      { ...defaultFilter, periodMode: 'h1' },
      scopeIds,
    );
    // h1/h2 では month による除外なし = 全件含まれる
    expect(result).toHaveLength(3);
    expect(result.some(r => r.id === 'c1')).toBe(true);
    expect(result.some(r => r.id === 'c2')).toBe(true);
    expect(result.some(r => r.id === 'c3')).toBe(true);
  });
});
