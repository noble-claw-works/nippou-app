// =====================================================
// customerSearch.test.ts - 顧客検索ユーティリティのテスト
// =====================================================
import { describe, it, expect } from 'vitest';
import type { Customer } from '../types';
import { normalizeForSearch, searchCustomers } from '../utils/customerSearch';

// ─── テスト用顧客ファクトリ ─────────────────────────────────────────
function makeCustomer(over: Partial<Customer> = {}): Customer {
  return {
    id: over.id ?? 'c1',
    name: over.name ?? 'テスト顧客',
    type: over.type ?? 'corporate',
    area: over.area ?? '東京',
    primaryUserId: over.primaryUserId ?? 'u1',
    tags: over.tags ?? [],
    memo: over.memo ?? '',
    status: over.status ?? 'active',
    lastContactDate: over.lastContactDate,
    nextAppointment: over.nextAppointment,
    isFavorite: over.isFavorite,
  };
}

// ─── normalizeForSearch ─────────────────────────────────────────────
describe('normalizeForSearch', () => {
  it('NFKC 正規化: 全角英字 → 半角', () => {
    expect(normalizeForSearch('Ａｂｃ')).toBe('abc');
  });

  it('小文字化', () => {
    expect(normalizeForSearch('ABC')).toBe('abc');
  });

  it('空白除去 (半角スペース)', () => {
    expect(normalizeForSearch('山田 太郎')).toBe('山田太郎');
  });

  it('空白除去 (全角スペース)', () => {
    expect(normalizeForSearch('山田　太郎')).toBe('山田太郎');
  });

  it('複合: 全角英字 + スペース + 大文字', () => {
    expect(normalizeForSearch('Ａ Ｂ Ｃ')).toBe('abc');
  });

  it('ひらがな・カタカナはそのまま', () => {
    expect(normalizeForSearch('テスト')).toBe('テスト');
  });
});

// ─── searchCustomers: query 空 ──────────────────────────────────────
describe('searchCustomers (query 空)', () => {
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const fav = makeCustomer({ id: 'fav', name: 'お気に入り顧客', isFavorite: true, status: 'active' });
  const recent = makeCustomer({ id: 'rec', name: '最近接触顧客', lastContactDate: fiveDaysAgo, status: 'active' });
  const inactive = makeCustomer({ id: 'ina', name: '非アクティブ顧客', status: 'inactive' });
  const old = makeCustomer({ id: 'old', name: '古い接触顧客', lastContactDate: fortyDaysAgo, status: 'active' });
  const normal = makeCustomer({ id: 'nor', name: '通常顧客', status: 'active' });

  const customers = [normal, old, inactive, recent, fav];

  it('お気に入りが先頭', () => {
    const results = searchCustomers(customers, '');
    expect(results[0].customer.id).toBe('fav');
  });

  it('最近接触 (30日以内) がお気に入りの次', () => {
    const results = searchCustomers(customers, '');
    const ids = results.map(r => r.customer.id);
    expect(ids.indexOf('rec')).toBeLessThan(ids.indexOf('old'));
    expect(ids.indexOf('rec')).toBeLessThan(ids.indexOf('nor'));
  });

  it('30日以上前の接触は recent 扱いにならない', () => {
    const results = searchCustomers(customers, '');
    const rec = results.find(r => r.customer.id === 'rec')!;
    const old_ = results.find(r => r.customer.id === 'old')!;
    expect(rec.score).toBeGreaterThan(old_.score);
  });

  it('activeOnly=true で inactive が除外される', () => {
    const results = searchCustomers(customers, '', { activeOnly: true });
    expect(results.find(r => r.customer.id === 'ina')).toBeUndefined();
  });

  it('activeOnly=false では inactive も含まれる', () => {
    const results = searchCustomers(customers, '', { activeOnly: false });
    expect(results.find(r => r.customer.id === 'ina')).toBeDefined();
  });

  it('max 件数制限', () => {
    const many = Array.from({ length: 100 }, (_, i) =>
      makeCustomer({ id: `c${i}`, name: `顧客${i}` })
    );
    const results = searchCustomers(many, '', { max: 10 });
    expect(results.length).toBe(10);
  });
});

// ─── searchCustomers: query あり ────────────────────────────────────
describe('searchCustomers (query あり)', () => {
  const c1 = makeCustomer({ id: 'c1', name: '田中商事', area: '大阪', tags: ['VIP', '製造業'], memo: '長期取引先' });
  const c2 = makeCustomer({ id: 'c2', name: '田中建設', area: '東京', tags: ['建設'], memo: '' });
  const c3 = makeCustomer({ id: 'c3', name: '株式会社スズキ', area: '大阪', tags: [], memo: '田中紹介' });
  const c4 = makeCustomer({ id: 'c4', name: '山田電機', area: '名古屋', tags: ['製造業'], memo: '' });
  const c5 = makeCustomer({ id: 'c5', name: '非アクティブ', area: '東京', tags: [], memo: '', status: 'inactive' });
  const customers = [c1, c2, c3, c4, c5];

  it('name 完全一致が最高スコア', () => {
    const results = searchCustomers(customers, '田中商事');
    expect(results[0].customer.id).toBe('c1');
    expect(results[0].matched).toContain('name:exact');
  });

  it('name 前方一致が部分一致より優先', () => {
    // 田中商事 / 田中建設: 前方一致
    // 株式会社スズキ memo に「田中」: 部分一致以下
    const results = searchCustomers(customers, '田中');
    const ids = results.map(r => r.customer.id);
    // c1, c2 (前方一致 or exact) が c3 (memo) より上位
    expect(ids.indexOf('c1')).toBeLessThan(ids.indexOf('c3'));
    expect(ids.indexOf('c2')).toBeLessThan(ids.indexOf('c3'));
  });

  it('area でマッチ', () => {
    const results = searchCustomers(customers, '大阪');
    const ids = results.map(r => r.customer.id);
    expect(ids).toContain('c1');
    expect(ids).toContain('c3');
    expect(ids).not.toContain('c4'); // 名古屋
  });

  it('tags でマッチ', () => {
    const results = searchCustomers(customers, 'VIP');
    expect(results.find(r => r.customer.id === 'c1')).toBeDefined();
    expect(results[0].matched).toContain('tags');
  });

  it('memo でマッチ', () => {
    const results = searchCustomers(customers, '長期取引先');
    expect(results.find(r => r.customer.id === 'c1')).toBeDefined();
    expect(results[0].matched).toContain('memo');
  });

  it('マッチしない顧客は除外', () => {
    const results = searchCustomers(customers, 'zzzzz_no_match');
    expect(results.length).toBe(0);
  });

  it('大文字小文字 + NFKC 正規化', () => {
    // 全角「ＶＩＰ」で「VIP」タグを検索
    const results = searchCustomers(customers, 'ＶＩＰ');
    expect(results.find(r => r.customer.id === 'c1')).toBeDefined();
  });

  it('matched フィールドが正しく報告される', () => {
    const results = searchCustomers([c1], '田中商事');
    expect(results[0].matched).toContain('name:exact');
  });
});

// ─── 1000件パフォーマンステスト ─────────────────────────────────────
describe('searchCustomers パフォーマンス (1000件)', () => {
  const areas = ['東京', '大阪', '名古屋', '福岡', '札幌'];
  const tags = ['VIP', '製造業', '建設', '小売', 'IT', '金融'];
  const memos = ['長期取引', '新規', 'フォロー中', ''];

  const customers1000: Customer[] = Array.from({ length: 1000 }, (_, i) => ({
    id: `c${i}`,
    name: `テスト顧客${i}${i % 10 === 0 ? '商事' : ''}`,
    type: 'corporate',
    area: areas[i % areas.length],
    primaryUserId: 'u1',
    tags: [tags[i % tags.length]],
    memo: memos[i % memos.length],
    status: i % 5 === 0 ? 'inactive' : 'active',
    isFavorite: i % 50 === 0,
    lastContactDate: i % 3 === 0
      ? new Date(Date.now() - (i % 30) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : undefined,
  }));

  it('query 空: 1000件を 50ms 以内に処理', () => {
    const start = performance.now();
    const results = searchCustomers(customers1000, '');
    const elapsed = performance.now() - start;
    expect(results.length).toBeLessThanOrEqual(50);
    expect(elapsed).toBeLessThan(50);
  });

  it('query あり: 1000件を 50ms 以内に処理', () => {
    const start = performance.now();
    const results = searchCustomers(customers1000, '商事');
    const elapsed = performance.now() - start;
    expect(results.length).toBeLessThanOrEqual(50);
    expect(elapsed).toBeLessThan(50);
  });

  it('デフォルト max=50 で最大 50件', () => {
    const results = searchCustomers(customers1000, '');
    expect(results.length).toBe(50);
  });

  it('activeOnly=true で inactive を除外', () => {
    const results = searchCustomers(customers1000, '', { activeOnly: true });
    expect(results.every(r => r.customer.status === 'active')).toBe(true);
  });
});
