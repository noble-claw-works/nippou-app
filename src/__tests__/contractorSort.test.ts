/**
 * contractorSort.test.ts
 * 契約者ソート比較関数の単体テスト（主上修正指示2026-07-12）
 * 対象: 商談一覧・契約一覧で使う契約者名によるソート比較ロジック
 */

import { describe, it, expect } from 'vitest';

// ─────────────────────────────────────────────────────────────────
// 純粋関数として抽出した契約者ソート比較関数
// （OpportunitiesPage / PoliciesPage の filtered useMemo と同一ロジック）
// ─────────────────────────────────────────────────────────────────

type Person = { id: string; name: string };

/**
 * 契約者PersonIdを受け取り、Person配列から氏名を解決する。
 * 未設定・未登録の場合は '' を返す。
 */
function resolveContractorName(contractorPersonId: string | undefined, persons: Person[]): string {
  if (!contractorPersonId) return '';
  return persons.find(p => p.id === contractorPersonId)?.name ?? '';
}

/**
 * 契約者名で昇順ソートする比較関数。
 * - 名前あり同士 → localeCompare('ja') 昇順
 * - 未設定(空文字)は末尾
 * @param ascending true=昇順, false=降順（未設定末尾は方向によらず末尾）
 */
function compareByContractor(
  aName: string,
  bName: string,
  ascending = true,
): number {
  if (!aName && !bName) return 0;
  if (!aName) return 1;   // a未設定 → 末尾
  if (!bName) return -1;  // b未設定 → 末尾
  const cmp = aName.localeCompare(bName, 'ja');
  return ascending ? cmp : -cmp;
}

// ─────────────────────────────────────────────────────────────────
// テスト
// ─────────────────────────────────────────────────────────────────

const PERSONS: Person[] = [
  { id: 'p1', name: '青木 一郎' },
  { id: 'p2', name: '田中 太郎' },
  { id: 'p3', name: '鈴木 花子' },
];

describe('resolveContractorName', () => {
  it('有効なPersonIdのとき氏名を返す', () => {
    expect(resolveContractorName('p1', PERSONS)).toBe('青木 一郎');
    expect(resolveContractorName('p2', PERSONS)).toBe('田中 太郎');
  });

  it('undefinedのとき空文字を返す', () => {
    expect(resolveContractorName(undefined, PERSONS)).toBe('');
  });

  it('未登録PersonIdのとき空文字を返す', () => {
    expect(resolveContractorName('p999', PERSONS)).toBe('');
  });

  it('空文字PersonIdのとき空文字を返す', () => {
    expect(resolveContractorName('', PERSONS)).toBe('');
  });
});

describe('compareByContractor — 昇順', () => {
  it('青木 < 田中 → 負の値', () => {
    expect(compareByContractor('青木 一郎', '田中 太郎', true)).toBeLessThan(0);
  });

  it('田中 > 青木 → 正の値', () => {
    expect(compareByContractor('田中 太郎', '青木 一郎', true)).toBeGreaterThan(0);
  });

  it('同名 → 0', () => {
    expect(compareByContractor('田中 太郎', '田中 太郎', true)).toBe(0);
  });

  it('未設定(a)は末尾 — 正の値', () => {
    expect(compareByContractor('', '田中 太郎', true)).toBeGreaterThan(0);
  });

  it('未設定(b)は末尾 — 負の値', () => {
    expect(compareByContractor('田中 太郎', '', true)).toBeLessThan(0);
  });

  it('両方未設定 → 0', () => {
    expect(compareByContractor('', '', true)).toBe(0);
  });
});

describe('compareByContractor — 降順', () => {
  it('降順では田中 < 青木（田中が先） → 負の値', () => {
    expect(compareByContractor('田中 太郎', '青木 一郎', false)).toBeLessThan(0);
  });

  it('降順でも未設定(a)は末尾 → 正の値', () => {
    expect(compareByContractor('', '田中 太郎', false)).toBeGreaterThan(0);
  });

  it('降順でも未設定(b)は末尾 → 負の値', () => {
    expect(compareByContractor('田中 太郎', '', false)).toBeLessThan(0);
  });
});

describe('契約者ソート統合: リストを契約者昇順でソート', () => {
  type Item = { id: string; contractorPersonId?: string };

  function sortByContractor(items: Item[], persons: Person[], ascending = true): Item[] {
    return [...items].sort((a, b) => {
      const nameA = resolveContractorName(a.contractorPersonId, persons);
      const nameB = resolveContractorName(b.contractorPersonId, persons);
      return compareByContractor(nameA, nameB, ascending);
    });
  }

  const items: Item[] = [
    { id: 'opp3', contractorPersonId: 'p2' }, // 田中 太郎
    { id: 'opp1', contractorPersonId: 'p1' }, // 青木 一郎
    { id: 'opp4', contractorPersonId: undefined }, // 未設定
    { id: 'opp2', contractorPersonId: 'p3' }, // 鈴木 花子
  ];

  it('昇順: 青木→田中→鈴木→未設定の順になる（ja locale順）', () => {
    const sorted = sortByContractor(items, PERSONS, true);
    const ids = sorted.map(o => o.id);
    // ja locale: 青木 < 田中 < 鈴木、未設定は末尾
    expect(ids[ids.length - 1]).toBe('opp4'); // 未設定は末尾
    expect(ids[0]).toBe('opp1'); // 青木 一郎 が先頭
    expect(ids[1]).toBe('opp3'); // 田中 太郎 が2番目
    expect(ids[2]).toBe('opp2'); // 鈴木 花子 が3番目
  });

  it('降順: 鈴木→田中→青木→未設定の順になる（ja locale逆順）', () => {
    const sorted = sortByContractor(items, PERSONS, false);
    const ids = sorted.map(o => o.id);
    // ja locale降順: 鈴木 > 田中 > 青木
    expect(ids[ids.length - 1]).toBe('opp4'); // 未設定は末尾（降順でも）
    expect(ids[0]).toBe('opp2'); // 鈴木 花子 が先頭
    expect(ids[1]).toBe('opp3'); // 田中 太郎 が2番目
    expect(ids[2]).toBe('opp1'); // 青木 一郎 が3番目
  });

  it('同一契約者の行が隣接して並ぶ', () => {
    const items2: Item[] = [
      { id: 'a', contractorPersonId: 'p2' },
      { id: 'b', contractorPersonId: 'p1' },
      { id: 'c', contractorPersonId: 'p2' },
      { id: 'd', contractorPersonId: 'p1' },
    ];
    const sorted = sortByContractor(items2, PERSONS, true);
    // 青木(p1)同士、田中(p2)同士が隣接するはず
    const contractorNames = sorted.map(o => resolveContractorName(o.contractorPersonId, PERSONS));
    // 最初の2つが同じ名前、後の2つが同じ名前
    expect(contractorNames[0]).toBe(contractorNames[1]);
    expect(contractorNames[2]).toBe(contractorNames[3]);
    expect(contractorNames[0]).not.toBe(contractorNames[2]);
  });
});
