/**
 * grouping.test.ts — C-1: 世帯>契約者 2段グルーピング関数の単体テスト
 *
 * testing-standards準拠:
 * - テスト名: 「<条件>のとき<期待結果>」形式
 * - 観点: 正常系 / 境界 / 契約者未設定フォールバック / フィルタ後グループ化 / 件数集計
 */
import { describe, it, expect } from 'vitest';
import {
  groupByHouseholdThenContractor,
  UNSET_CONTRACTOR_ID,
  UNSET_CONTRACTOR_NAME,
} from '../utils/grouping';
import type { GroupableItem, HouseholdRef, PersonRef } from '../utils/grouping';

// ─── テスト用フィクスチャ ──────────────────────────────

const households: HouseholdRef[] = [
  { id: 'h1', name: '田中家' },
  { id: 'h2', name: '鈴木家' },
  { id: 'h3', name: '佐藤家' },
];

const persons: PersonRef[] = [
  { id: 'p1', name: '田中 太郎', householdId: 'h1' },
  { id: 'p2', name: '田中 花子', householdId: 'h1' },
  { id: 'p3', name: '鈴木 一郎', householdId: 'h2' },
];

function makeItem(
  id: string,
  householdId: string,
  contractorPersonId?: string,
): GroupableItem & { id: string } {
  return { id, householdId, contractorPersonId };
}

// ─── テスト群 ────────────────────────────────────────

describe('groupByHouseholdThenContractor: 正常系', () => {
  it('単一世帯・単一契約者のとき、1世帯1契約者グループになる', () => {
    const items = [makeItem('opp1', 'h1', 'p1')];
    const result = groupByHouseholdThenContractor(items, households, persons);

    expect(result).toHaveLength(1);
    expect(result[0].householdId).toBe('h1');
    expect(result[0].householdName).toBe('田中家');
    expect(result[0].totalCount).toBe(1);
    expect(result[0].contractorGroups).toHaveLength(1);
    expect(result[0].contractorGroups[0].contractorPersonId).toBe('p1');
    expect(result[0].contractorGroups[0].contractorName).toBe('田中 太郎');
    expect(result[0].contractorGroups[0].items).toHaveLength(1);
  });

  it('1世帯に複数契約者がいるとき、契約者ごとにグループが作られる', () => {
    const items = [
      makeItem('opp1', 'h1', 'p1'),
      makeItem('opp2', 'h1', 'p2'),
      makeItem('opp3', 'h1', 'p1'), // p1 に2件目
    ];
    const result = groupByHouseholdThenContractor(items, households, persons);

    expect(result).toHaveLength(1);
    expect(result[0].totalCount).toBe(3);
    expect(result[0].contractorGroups).toHaveLength(2); // p1, p2

    const p1Group = result[0].contractorGroups.find(g => g.contractorPersonId === 'p1');
    expect(p1Group?.items).toHaveLength(2);

    const p2Group = result[0].contractorGroups.find(g => g.contractorPersonId === 'p2');
    expect(p2Group?.items).toHaveLength(1);
  });

  it('複数世帯のとき、各世帯が独立したグループになる', () => {
    const items = [
      makeItem('opp1', 'h1', 'p1'),
      makeItem('opp2', 'h2', 'p3'),
    ];
    const result = groupByHouseholdThenContractor(items, households, persons);

    expect(result).toHaveLength(2);
    expect(result.map(g => g.householdId)).toEqual(['h1', 'h2']);
  });

  it('世帯の登場順は items 配列内の最初の出現順になる', () => {
    const items = [
      makeItem('opp1', 'h2', 'p3'),
      makeItem('opp2', 'h1', 'p1'),
    ];
    const result = groupByHouseholdThenContractor(items, households, persons);

    expect(result[0].householdId).toBe('h2'); // 先に出現したh2が最初
    expect(result[1].householdId).toBe('h1');
  });
});

describe('groupByHouseholdThenContractor: 契約者未設定のフォールバック', () => {
  it('contractorPersonId が undefined のとき「契約者未設定」グループに入る', () => {
    const items = [makeItem('opp1', 'h1', undefined)];
    const result = groupByHouseholdThenContractor(items, households, persons);

    expect(result[0].contractorGroups[0].contractorPersonId).toBe(UNSET_CONTRACTOR_ID);
    expect(result[0].contractorGroups[0].contractorName).toBe(UNSET_CONTRACTOR_NAME);
  });

  it('contractorPersonId が null のとき「契約者未設定」グループに入る', () => {
    const items = [{ id: 'opp1', householdId: 'h1', contractorPersonId: null }];
    const result = groupByHouseholdThenContractor(items, households, persons);

    expect(result[0].contractorGroups[0].contractorPersonId).toBe(UNSET_CONTRACTOR_ID);
    expect(result[0].contractorGroups[0].contractorName).toBe(UNSET_CONTRACTOR_NAME);
  });

  it('設定済み契約者と未設定の案件が混在するとき、それぞれ別グループになる', () => {
    const items = [
      makeItem('opp1', 'h1', 'p1'),
      makeItem('opp2', 'h1', undefined), // 未設定
      makeItem('opp3', 'h1', 'p1'),     // p1 に追加
    ];
    const result = groupByHouseholdThenContractor(items, households, persons);

    expect(result[0].contractorGroups).toHaveLength(2);
    const unsetGroup = result[0].contractorGroups.find(
      g => g.contractorPersonId === UNSET_CONTRACTOR_ID,
    );
    expect(unsetGroup?.items).toHaveLength(1);

    const p1Group = result[0].contractorGroups.find(g => g.contractorPersonId === 'p1');
    expect(p1Group?.items).toHaveLength(2);
  });

  it('存在しないPersonIdのとき「契約者未設定」名称になる', () => {
    const items = [makeItem('opp1', 'h1', 'p_unknown')];
    const result = groupByHouseholdThenContractor(items, households, persons);

    // persons配列に存在しないIDは名前解決できないので「契約者未設定」になる
    expect(result[0].contractorGroups[0].contractorName).toBe(UNSET_CONTRACTOR_NAME);
  });
});

describe('groupByHouseholdThenContractor: 件数集計', () => {
  it('totalCount が contractorGroups 配下の items 合計と一致する', () => {
    const items = [
      makeItem('opp1', 'h1', 'p1'),
      makeItem('opp2', 'h1', 'p2'),
      makeItem('opp3', 'h1', 'p1'),
      makeItem('opp4', 'h1', undefined),
    ];
    const result = groupByHouseholdThenContractor(items, households, persons);

    const total = result[0].contractorGroups.reduce((s, cg) => s + cg.items.length, 0);
    expect(result[0].totalCount).toBe(4);
    expect(result[0].totalCount).toBe(total);
  });
});

describe('groupByHouseholdThenContractor: フィルタ後グループ化', () => {
  it('フィルタ後の配列を渡したとき、フィルタ済み件数のみグループ化される', () => {
    // フィルタ後の items を渡すユースケース（実際は呼び出し元でフィルタする）
    const allItems = [
      makeItem('opp1', 'h1', 'p1'),
      makeItem('opp2', 'h1', 'p1'), // 同じ世帯・契約者
      makeItem('opp3', 'h2', 'p3'), // 別世帯
    ];
    // h1 だけにフィルタした状態
    const filteredItems = allItems.filter(i => i.householdId === 'h1');
    const result = groupByHouseholdThenContractor(filteredItems, households, persons);

    expect(result).toHaveLength(1);
    expect(result[0].householdId).toBe('h1');
    expect(result[0].totalCount).toBe(2);
  });

  it('0件のとき空配列を返す', () => {
    const result = groupByHouseholdThenContractor([], households, persons);
    expect(result).toHaveLength(0);
  });
});

describe('groupByHouseholdThenContractor: 境界値', () => {
  it('世帯マスタに存在しないhouseholdIdのとき、householdNameにIDをそのまま使う', () => {
    const items = [makeItem('opp1', 'h_unknown', 'p1')];
    const result = groupByHouseholdThenContractor(items, households, persons);

    expect(result[0].householdName).toBe('h_unknown');
  });

  it('複数世帯×複数契約者の組み合わせでグループ構造が正しい', () => {
    const items = [
      makeItem('opp1', 'h1', 'p1'),
      makeItem('opp2', 'h1', 'p2'),
      makeItem('opp3', 'h2', 'p3'),
      makeItem('opp4', 'h2', undefined),
    ];
    const result = groupByHouseholdThenContractor(items, households, persons);

    expect(result).toHaveLength(2);

    const h1 = result.find(g => g.householdId === 'h1')!;
    expect(h1.contractorGroups).toHaveLength(2);
    expect(h1.totalCount).toBe(2);

    const h2 = result.find(g => g.householdId === 'h2')!;
    expect(h2.contractorGroups).toHaveLength(2); // p3 + 未設定
    expect(h2.totalCount).toBe(2);
  });

  it('グループ内の item 順序は入力配列の順序を保持する', () => {
    const items = [
      makeItem('opp_c', 'h1', 'p1'),
      makeItem('opp_a', 'h1', 'p1'),
      makeItem('opp_b', 'h1', 'p1'),
    ];
    const result = groupByHouseholdThenContractor(items, households, persons);
    const ids = result[0].contractorGroups[0].items.map((i: GroupableItem & { id: string }) => i.id);
    expect(ids).toEqual(['opp_c', 'opp_a', 'opp_b']);
  });
});
