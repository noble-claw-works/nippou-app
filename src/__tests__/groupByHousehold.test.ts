/**
 * groupByHousehold.test.ts
 * 世帯1段グループ化純粋関数の単体テスト（C-2 主上確定 2026-07-12）
 *
 * テスト観点:
 * - 世帯ごとに束ねられること
 * - 世帯グループが世帯名昇順(ja locale)にソートされること
 * - 世帯内の要素順が引数のitems順を維持すること（呼び出し側のソートを尊重）
 * - フィルタ後リストをグループ化できること（部分的な世帯データでも動く）
 * - 件数集計が正しいこと
 * - 世帯名が取得できない場合はIDをフォールバックとすること
 */

import { describe, it, expect } from 'vitest';
import { groupByHousehold } from '../utils/groupByHousehold';

// ─── テスト用型 ───────────────────────────────────────────────
type Item = {
  id: string;
  householdId: string;
  contractorName: string;
};

// ─── テスト用世帯名マップ ────────────────────────────────────
const HOUSEHOLD_NAMES: Record<string, string> = {
  h1: '田中家',
  h2: '青木家',
  h3: '鈴木家',
  h4: '山本家',
};

const getHouseholdName = (hid: string) => HOUSEHOLD_NAMES[hid] ?? hid;

// ─── テスト用データ ──────────────────────────────────────────
const ITEMS: Item[] = [
  { id: 'a1', householdId: 'h1', contractorName: '田中 太郎' },
  { id: 'a2', householdId: 'h3', contractorName: '鈴木 花子' },
  { id: 'a3', householdId: 'h2', contractorName: '青木 一郎' },
  { id: 'a4', householdId: 'h1', contractorName: '田中 次郎' },
  { id: 'a5', householdId: 'h3', contractorName: '鈴木 健太' },
  { id: 'a6', householdId: 'h2', contractorName: '青木 花子' },
];

describe('groupByHousehold', () => {
  it('世帯ごとに要素を束ねること', () => {
    const groups = groupByHousehold(ITEMS, i => i.householdId, getHouseholdName);
    // 3世帯
    expect(groups).toHaveLength(3);
    // 各世帯の件数
    const h1 = groups.find(g => g.householdId === 'h1');
    const h2 = groups.find(g => g.householdId === 'h2');
    const h3 = groups.find(g => g.householdId === 'h3');
    expect(h1?.items).toHaveLength(2);
    expect(h2?.items).toHaveLength(2);
    expect(h3?.items).toHaveLength(2);
  });

  it('世帯グループが世帯名昇順(ja locale)にソートされること', () => {
    const groups = groupByHousehold(ITEMS, i => i.householdId, getHouseholdName);
    const names = groups.map(g => g.householdName);
    // ja localeCompare の実際の出力順に合わせて検証
    // 重要: 「世帯名昇順」の保証を検証するため、
    // 期待値は localeCompare('ja') の実際の出力順とする
    const expected = ['田中家', '青木家', '鈴木家'].sort((a, b) => a.localeCompare(b, 'ja'));
    expect(names).toEqual(expected);
  });

  it('世帯名が正しく設定されること', () => {
    const groups = groupByHousehold(ITEMS, i => i.householdId, getHouseholdName);
    expect(groups.find(g => g.householdId === 'h1')?.householdName).toBe('田中家');
    expect(groups.find(g => g.householdId === 'h2')?.householdName).toBe('青木家');
    expect(groups.find(g => g.householdId === 'h3')?.householdName).toBe('鈴木家');
  });

  it('世帯内の要素順は引数のitems順を維持すること（呼び出し側のソートを尊重）', () => {
    const groups = groupByHousehold(ITEMS, i => i.householdId, getHouseholdName);
    // h1の要素: a1, a4 の順（ITEMSの出現順）
    const h1 = groups.find(g => g.householdId === 'h1')!;
    expect(h1.items[0].id).toBe('a1');
    expect(h1.items[1].id).toBe('a4');
  });

  it('世帯内の要素順はitems引数の順序を保持すること（契約者昇順ソート後）', () => {
    // 契約者名昇順でソート済みのリストを渡す
    const sorted: Item[] = [
      { id: 'a3', householdId: 'h2', contractorName: '青木 一郎' },
      { id: 'a6', householdId: 'h2', contractorName: '青木 花子' },
      { id: 'a2', householdId: 'h3', contractorName: '鈴木 花子' },
      { id: 'a5', householdId: 'h3', contractorName: '鈴木 健太' },
      { id: 'a1', householdId: 'h1', contractorName: '田中 太郎' },
      { id: 'a4', householdId: 'h1', contractorName: '田中 次郎' },
    ];
    const groups = groupByHousehold(sorted, i => i.householdId, getHouseholdName);
    // 青木家: a3 → a6（契約者昇順）
    const h2 = groups.find(g => g.householdId === 'h2')!;
    expect(h2.items[0].id).toBe('a3');
    expect(h2.items[1].id).toBe('a6');
    // 田中家: a1 → a4（契約者昇順）
    const h1 = groups.find(g => g.householdId === 'h1')!;
    expect(h1.items[0].id).toBe('a1');
    expect(h1.items[1].id).toBe('a4');
  });

  it('フィルタ後の部分リスト（一部世帯のみ）もグループ化できること', () => {
    // h1のみに絞ったリスト
    const filtered = ITEMS.filter(i => i.householdId === 'h1');
    const groups = groupByHousehold(filtered, i => i.householdId, getHouseholdName);
    expect(groups).toHaveLength(1);
    expect(groups[0].householdId).toBe('h1');
    expect(groups[0].items).toHaveLength(2);
  });

  it('空リストを渡したとき空配列を返すこと', () => {
    const groups = groupByHousehold([], i => i.householdId, getHouseholdName);
    expect(groups).toHaveLength(0);
  });

  it('世帯名が取得できない場合はIDをフォールバックとすること', () => {
    const items: Item[] = [
      { id: 'x1', householdId: 'unknown-hh', contractorName: 'テスト' },
    ];
    const groups = groupByHousehold(items, i => i.householdId, (hid) => HOUSEHOLD_NAMES[hid] ?? hid);
    expect(groups[0].householdName).toBe('unknown-hh');
  });

  it('件数バッジ用: groups[n].items.length が正しい件数を返すこと', () => {
    const groups = groupByHousehold(ITEMS, i => i.householdId, getHouseholdName);
    const total = groups.reduce((acc, g) => acc + g.items.length, 0);
    expect(total).toBe(ITEMS.length);
  });

  it('4世帯のデータを世帯名昇順でソートすること', () => {
    const items4: Item[] = [
      { id: 'z1', householdId: 'h4', contractorName: '山本 太郎' },
      { id: 'z2', householdId: 'h1', contractorName: '田中 太郎' },
      { id: 'z3', householdId: 'h3', contractorName: '鈴木 花子' },
      { id: 'z4', householdId: 'h2', contractorName: '青木 一郎' },
    ];
    const groups = groupByHousehold(items4, i => i.householdId, getHouseholdName);
    const names = groups.map(g => g.householdName);
    // 世帯名昇順でソートされることを検証（localeCompareの実際の順序に合わせる）
    const expected = ['田中家', '青木家', '鈴木家', '山本家'].sort((a, b) => a.localeCompare(b, 'ja'));
    expect(names).toEqual(expected);
    // 4世帯分になっていること
    expect(groups).toHaveLength(4);
  });

  it('同一世帯に1件のみの場合も正しくグループ化されること', () => {
    const items: Item[] = [
      { id: 's1', householdId: 'h2', contractorName: '青木 一郎' },
    ];
    const groups = groupByHousehold(items, i => i.householdId, getHouseholdName);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(1);
    expect(groups[0].householdName).toBe('青木家');
  });
});
