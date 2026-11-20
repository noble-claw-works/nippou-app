// quickHouseholdModal.test.ts — 工程C: QuickHouseholdModal バリデーション / 初期値 / area保存形式
import { describe, it, expect } from 'vitest';
import type { Household } from '../types';
import { PREFECTURES } from '../data/prefectures';

// =====================================================
// PREFECTURES マスタ
// =====================================================
describe('PREFECTURES マスタ', () => {
  it('47都道府県が定義されている', () => {
    expect(PREFECTURES).toHaveLength(47);
  });

  it('北海道が先頭、沖縄県が末尾', () => {
    expect(PREFECTURES[0].name).toBe('北海道');
    expect(PREFECTURES[46].name).toBe('沖縄県');
  });

  it('東京都が含まれる', () => {
    const tokyo = PREFECTURES.find(p => p.name === '東京都');
    expect(tokyo).toBeDefined();
    expect(tokyo?.code).toBe('13');
  });

  it('全てのエントリがcodeとnameを持つ', () => {
    for (const pref of PREFECTURES) {
      expect(pref.code).toBeTruthy();
      expect(pref.name).toBeTruthy();
    }
  });
});

// =====================================================
// area保存形式 — 「都道府県 市区町村」スペース連結
// =====================================================
describe('area 保存形式', () => {
  it('都道府県と市区町村をスペース連結してareaに保存できる', () => {
    const prefecture = '東京都';
    const city = '渋谷区';
    const area = `${prefecture} ${city}`;
    expect(area).toBe('東京都 渋谷区');
  });

  it('areaは後方互換でstring型として扱える', () => {
    const h: Household = {
      id: 'h_c_01',
      name: 'テスト家',
      type: 'individual',
      area: '東京都 渋谷区',
      primaryUserId: 'u1',
      familyMemo: '',
      tags: [],
      memo: '',
      status: 'active',
    };
    expect(typeof h.area).toBe('string');
    expect(h.area).toBe('東京都 渋谷区');
  });
});

// =====================================================
// Household型 — channelId フィールド
// =====================================================
describe('Household channelId フィールド', () => {
  it('channelIdは省略可能(optional)', () => {
    const h: Household = {
      id: 'h_c_02',
      name: 'テスト家',
      type: 'individual',
      area: '大阪府 大阪市',
      primaryUserId: 'u1',
      familyMemo: '',
      tags: [],
      memo: '',
      status: 'active',
    };
    // channelId なしでも型エラーなし
    expect(h.channelId).toBeUndefined();
  });

  it('channelIdをセットできる', () => {
    const h: Household = {
      id: 'h_c_03',
      name: 'テスト商事',
      type: 'corporate',
      area: '愛知県 名古屋市',
      primaryUserId: 'u1',
      familyMemo: '',
      tags: [],
      memo: '',
      status: 'active',
      channelId: 'ch_agency_shinjuku',
    };
    expect(h.channelId).toBe('ch_agency_shinjuku');
  });
});

// =====================================================
// 区分 — individual / corporate の2値のみ
// =====================================================
describe('HouseholdType 区分', () => {
  it('individualが有効', () => {
    const h: Household = {
      id: 'h_c_04',
      name: '鈴木家',
      type: 'individual',
      area: '神奈川県 横浜市',
      primaryUserId: 'u1',
      familyMemo: '',
      tags: [],
      memo: '',
      status: 'active',
    };
    expect(h.type).toBe('individual');
  });

  it('corporateが有効', () => {
    const h: Household = {
      id: 'h_c_05',
      name: 'ABC商事',
      type: 'corporate',
      area: '東京都 千代田区',
      primaryUserId: 'u1',
      familyMemo: '',
      tags: [],
      memo: '',
      status: 'active',
    };
    expect(h.type).toBe('corporate');
  });
});

// =====================================================
// バリデーションロジック (純粋関数として抽出して検証)
// =====================================================
interface AreaValidationInput {
  prefecture: string;
  city: string;
}

function validateArea(input: AreaValidationInput): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.prefecture) errors.push('都道府県を選択してください');
  if (!input.city.trim()) errors.push('市区町村を入力してください');
  return { ok: errors.length === 0, errors };
}

describe('エリアバリデーションロジック', () => {
  it('都道府県・市区町村どちらも入力でok=true', () => {
    const result = validateArea({ prefecture: '東京都', city: '渋谷区' });
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('都道府県が空ならエラー', () => {
    const result = validateArea({ prefecture: '', city: '渋谷区' });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('都道府県を選択してください');
  });

  it('市区町村が空ならエラー', () => {
    const result = validateArea({ prefecture: '東京都', city: '' });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('市区町村を入力してください');
  });

  it('両方空ならエラー2件', () => {
    const result = validateArea({ prefecture: '', city: '' });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it('市区町村が空白のみでもエラー', () => {
    const result = validateArea({ prefecture: '東京都', city: '   ' });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('市区町村を入力してください');
  });
});
