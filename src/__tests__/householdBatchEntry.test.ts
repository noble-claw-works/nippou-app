// =====================================================
// 世帯まとめ入力 B-2a — 単体テスト (Vitest)
// testing-standards 準拠: 「<条件>のとき<期待結果>」形式
// =====================================================
import { describe, test, expect } from 'vitest';
import {
  calcTotalMonthlyPremium,
  createEmptyDraft,
  toDraft,
  duplicateDraft,
  validateDraft,
  countInvalidDrafts,
  filterDrafts,
  createEmptyProduct,
  duplicateProduct,
  isLeafChannel,
  getParentChannels,
  getChildChannels,
  getParentChannelId,
  CONFIDENCE_OPTIONS,
} from '../utils/householdBatchEntry';
import type { ProposalProduct, Opportunity, SalesChannel } from '../types';

// ─── テストフィクスチャ ───────────────────────────────────────
const mockChannels: SalesChannel[] = [
  { id: 'ch_agency', name: '代理店', parentId: null, isActive: true, order: 1 },
  { id: 'ch_referral', name: '紹介', parentId: null, isActive: true, order: 2 },
  { id: 'ch_agency_shinjuku', name: 'ABC代理店 新宿支店', parentId: 'ch_agency', isActive: true, order: 1 },
  { id: 'ch_agency_yokohama', name: 'ABC代理店 横浜支店', parentId: 'ch_agency', isActive: true, order: 2 },
  { id: 'ch_referral_existing', name: '既契約者紹介', parentId: 'ch_referral', isActive: true, order: 1 },
  { id: 'ch_inactive', name: '廃止チャネル', parentId: 'ch_agency', isActive: false, order: 99 },
];

const baseOpportunity: Opportunity = {
  id: 'opp_test',
  householdId: 'hh_test',
  ownerId: 'u1',
  title: 'テスト案件',
  stage: 'approach',
  status: 'open',
  targetPersonIds: ['p1'],
  productCategories: ['life'],
  proposalProducts: [],
  needsAnalysisDone: false,
  illustrationProvided: false,
  stageHistory: [],
  tags: [],
  memo: '',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

// ─────────────────────────────────────────────────────────────
// 1. 月払合計の集計
// ─────────────────────────────────────────────────────────────
describe('calcTotalMonthlyPremium', () => {
  test('商品が0件のとき合計は0になること', () => {
    expect(calcTotalMonthlyPremium([])).toBe(0);
  });

  test('商品が1件のとき単品の月払額が返ること', () => {
    const products: ProposalProduct[] = [
      { id: 'p1', productCategory: 'life', productName: '生保', insurer: '◯◯生命', insuredPersonId: 'per1', monthlyPremium: 8000, memo: '' },
    ];
    expect(calcTotalMonthlyPremium(products)).toBe(8000);
  });

  test('商品が複数件のとき合計が正しく計算されること', () => {
    const products: ProposalProduct[] = [
      { id: 'p1', productCategory: 'life', productName: '生保', insurer: '◯◯生命', insuredPersonId: 'per1', monthlyPremium: 8000, memo: '' },
      { id: 'p2', productCategory: 'auto', productName: '自動車保険', insurer: '△△損保', insuredPersonId: 'per1', monthlyPremium: 5000, memo: '' },
      { id: 'p3', productCategory: 'cancer', productName: 'がん保険', insurer: '□□生命', insuredPersonId: 'per2', monthlyPremium: 3000, memo: '' },
    ];
    expect(calcTotalMonthlyPremium(products)).toBe(16000);
  });

  test('月払額が0の商品を含む場合も正しく計算されること', () => {
    const products: ProposalProduct[] = [
      { id: 'p1', productCategory: 'life', productName: '生保', insurer: '◯◯生命', insuredPersonId: 'per1', monthlyPremium: 5000, memo: '' },
      { id: 'p2', productCategory: 'medical', productName: '医療保険', insurer: '△△生命', insuredPersonId: 'per1', monthlyPremium: 0, memo: '' },
    ];
    expect(calcTotalMonthlyPremium(products)).toBe(5000);
  });
});

// ─────────────────────────────────────────────────────────────
// 2. バリデーション
// ─────────────────────────────────────────────────────────────
describe('validateDraft', () => {
  test('channelIdが葉かつconfidenceが設定されているとき有効(isValid=true)であること', () => {
    const draft = toDraft({
      ...baseOpportunity,
      channelId: 'ch_agency_shinjuku',
      confidence: 'A',
    });
    const result = validateDraft(draft, mockChannels);
    expect(result.isValid).toBe(true);
    expect(result.errors.noChannel).toBe(false);
    expect(result.errors.noConfidence).toBe(false);
  });

  test('channelIdが未設定のとき無効(noChannel=true)であること', () => {
    const draft = toDraft({ ...baseOpportunity, channelId: undefined, confidence: 'A' });
    const result = validateDraft(draft, mockChannels);
    expect(result.isValid).toBe(false);
    expect(result.errors.noChannel).toBe(true);
  });

  test('channelIdが親チャネルのとき無効(noChannel=true)であること', () => {
    const draft = toDraft({ ...baseOpportunity, channelId: 'ch_agency', confidence: 'B' });
    const result = validateDraft(draft, mockChannels);
    expect(result.isValid).toBe(false);
    expect(result.errors.noChannel).toBe(true);
  });

  test('confidenceが未設定のとき無効(noConfidence=true)であること', () => {
    const draft = toDraft({ ...baseOpportunity, channelId: 'ch_agency_shinjuku', confidence: undefined });
    const result = validateDraft(draft, mockChannels);
    expect(result.isValid).toBe(false);
    expect(result.errors.noConfidence).toBe(true);
  });

  test('channelIdもconfidenceも未設定のとき両方エラーになること', () => {
    const draft = toDraft({ ...baseOpportunity, channelId: undefined, confidence: undefined });
    const result = validateDraft(draft, mockChannels);
    expect(result.isValid).toBe(false);
    expect(result.errors.noChannel).toBe(true);
    expect(result.errors.noConfidence).toBe(true);
  });
});

describe('countInvalidDrafts', () => {
  test('全案件が有効のとき0を返すこと', () => {
    const drafts = [
      toDraft({ ...baseOpportunity, id: 'o1', channelId: 'ch_agency_shinjuku', confidence: 'A' }),
      toDraft({ ...baseOpportunity, id: 'o2', channelId: 'ch_referral_existing', confidence: 'B' }),
    ];
    expect(countInvalidDrafts(drafts, mockChannels)).toBe(0);
  });

  test('無効な案件が2件あるとき2を返すこと', () => {
    const drafts = [
      toDraft({ ...baseOpportunity, id: 'o1', channelId: 'ch_agency_shinjuku', confidence: 'A' }), // 有効
      toDraft({ ...baseOpportunity, id: 'o2', channelId: undefined, confidence: undefined }),       // 無効
      toDraft({ ...baseOpportunity, id: 'o3', channelId: 'ch_agency', confidence: 'S' }),           // 無効(親)
    ];
    expect(countInvalidDrafts(drafts, mockChannels)).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────
// 3. 複製時の継承ロジック
// ─────────────────────────────────────────────────────────────
describe('duplicateDraft', () => {
  test('複製時に金額がゼロ化されること', () => {
    const source = toDraft({
      ...baseOpportunity,
      proposalProducts: [
        { id: 'pp1', productCategory: 'life', productName: '生保', insurer: '◯◯生命', insuredPersonId: 'per1', monthlyPremium: 8000, firstYearCommission: 40000, memo: '' },
      ],
      channelId: 'ch_agency_shinjuku',
      confidence: 'A',
    });
    const dup = duplicateDraft(source, {});
    expect(dup.proposalProducts[0].monthlyPremium).toBe(0);
    expect(dup.proposalProducts[0].firstYearCommission).toBeUndefined();
  });

  test('複製時に確度がリセットされること', () => {
    const source = toDraft({ ...baseOpportunity, channelId: 'ch_agency_shinjuku', confidence: 'A' });
    const dup = duplicateDraft(source, {});
    expect(dup.confidence).toBeUndefined();
  });

  test('複製時にchannelIdが引き継がれること', () => {
    const source = toDraft({ ...baseOpportunity, channelId: 'ch_agency_shinjuku', confidence: 'A' });
    const dup = duplicateDraft(source, {});
    expect(dup.channelId).toBe('ch_agency_shinjuku');
  });

  test('複製時にcontractorPersonIdが引数で上書きできること', () => {
    const source = toDraft({ ...baseOpportunity, contractorPersonId: 'per1' });
    const dup = duplicateDraft(source, { contractorPersonId: 'per2' });
    expect(dup.contractorPersonId).toBe('per2');
  });

  test('複製時にIDが元と異なること', () => {
    const source = toDraft({ ...baseOpportunity, id: 'original_id' });
    const dup = duplicateDraft(source, {});
    expect(dup.id).not.toBe('original_id');
  });

  test('複製は新規ドラフト(_isNew=true)になること', () => {
    const source = toDraft(baseOpportunity);
    const dup = duplicateDraft(source, {});
    expect(dup._isNew).toBe(true);
    expect(dup._isDirty).toBe(true);
  });

  test('複製時に商品のIDが新しく生成されること', () => {
    const source = toDraft({
      ...baseOpportunity,
      proposalProducts: [
        { id: 'pp_original', productCategory: 'life', productName: '生保', insurer: '◯◯生命', insuredPersonId: 'per1', monthlyPremium: 8000, memo: '' },
      ],
    });
    const dup = duplicateDraft(source, {});
    expect(dup.proposalProducts[0].id).not.toBe('pp_original');
  });
});

// ─────────────────────────────────────────────────────────────
// 4. 表示フィルタ
// ─────────────────────────────────────────────────────────────
describe('filterDrafts', () => {
  const openDraft = toDraft({ ...baseOpportunity, id: 'o1', status: 'open' });
  const wonDraft = toDraft({ ...baseOpportunity, id: 'o2', status: 'won' });
  const newDraft = createEmptyDraft({ householdId: 'hh_test', ownerId: 'u1' });

  test('filter=allのとき全ドラフトが返ること', () => {
    const result = filterDrafts([openDraft, wonDraft, newDraft], 'all');
    expect(result).toHaveLength(3);
  });

  test('filter=activeのとき進行中と新規のみ返ること', () => {
    const result = filterDrafts([openDraft, wonDraft, newDraft], 'active');
    expect(result).toHaveLength(2);
    expect(result.map(d => d.id)).toContain(openDraft.id);
    expect(result.map(d => d.id)).not.toContain(wonDraft.id);
    expect(result.map(d => d.id)).toContain(newDraft.id);
  });
});

// ─────────────────────────────────────────────────────────────
// 5. チャネルヘルパー
// ─────────────────────────────────────────────────────────────
describe('isLeafChannel', () => {
  test('葉チャネルのときtrueを返すこと', () => {
    expect(isLeafChannel('ch_agency_shinjuku', mockChannels)).toBe(true);
  });

  test('親チャネルのときfalseを返すこと', () => {
    expect(isLeafChannel('ch_agency', mockChannels)).toBe(false);
  });

  test('undefinedのときfalseを返すこと', () => {
    expect(isLeafChannel(undefined, mockChannels)).toBe(false);
  });

  test('存在しないchannelIdのときfalseを返すこと', () => {
    expect(isLeafChannel('ch_unknown', mockChannels)).toBe(false);
  });
});

describe('getParentChannels', () => {
  test('parentId=nullのアクティブチャネルのみ返ること', () => {
    const parents = getParentChannels(mockChannels);
    expect(parents.every(c => c.parentId === null)).toBe(true);
    expect(parents.every(c => c.isActive)).toBe(true);
  });

  test('order順に並ぶこと', () => {
    const parents = getParentChannels(mockChannels);
    for (let i = 1; i < parents.length; i++) {
      expect(parents[i].order).toBeGreaterThanOrEqual(parents[i - 1].order);
    }
  });
});

describe('getChildChannels', () => {
  test('指定親の子チャネルのみ返ること', () => {
    const children = getChildChannels('ch_agency', mockChannels);
    expect(children.every(c => c.parentId === 'ch_agency')).toBe(true);
  });

  test('廃止チャネル(isActive=false)は除外されること', () => {
    const children = getChildChannels('ch_agency', mockChannels);
    expect(children.some(c => c.id === 'ch_inactive')).toBe(false);
  });
});

describe('getParentChannelId', () => {
  test('葉チャネルIDから親IDを返すこと', () => {
    expect(getParentChannelId('ch_agency_shinjuku', mockChannels)).toBe('ch_agency');
  });

  test('undefinedのとき空文字を返すこと', () => {
    expect(getParentChannelId(undefined, mockChannels)).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────
// 6. 商品操作ヘルパー
// ─────────────────────────────────────────────────────────────
describe('createEmptyProduct', () => {
  test('月払が0の空商品が生成されること', () => {
    const p = createEmptyProduct('per1');
    expect(p.monthlyPremium).toBe(0);
    expect(p.insuredPersonId).toBe('per1');
    expect(p.insurer).toBe('');
  });
});

describe('duplicateProduct', () => {
  test('複製時に月払がゼロ化されること', () => {
    const original: ProposalProduct = {
      id: 'pp1', productCategory: 'life', productName: '生保', insurer: '◯◯生命',
      insuredPersonId: 'per1', monthlyPremium: 8000, firstYearCommission: 40000, memo: '',
    };
    const dup = duplicateProduct(original);
    expect(dup.monthlyPremium).toBe(0);
    expect(dup.firstYearCommission).toBeUndefined();
    expect(dup.id).not.toBe(original.id);
    expect(dup.insurer).toBe('◯◯生命'); // 保険会社は引き継ぐ
  });
});

// ─────────────────────────────────────────────────────────────
// 7. 確度ラベル一覧
// ─────────────────────────────────────────────────────────────
describe('CONFIDENCE_OPTIONS', () => {
  test('6種の確度が定義されていること', () => {
    expect(CONFIDENCE_OPTIONS).toHaveLength(6);
    expect(CONFIDENCE_OPTIONS).toContain('fixed');
    expect(CONFIDENCE_OPTIONS).toContain('S');
    expect(CONFIDENCE_OPTIONS).toContain('A');
    expect(CONFIDENCE_OPTIONS).toContain('B');
    expect(CONFIDENCE_OPTIONS).toContain('C');
    expect(CONFIDENCE_OPTIONS).toContain('D');
  });
});
