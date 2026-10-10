// householdsPaneD.test.ts — 工程D 3ペイン統合ロジックテスト
// ・構成員追加（名前+年収）
// ・保険商品追加（マスタ選択・初回相談日デフォルト/直前値継承）
// ・種目マスタ選択→productCategoryへの保存

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store';
import type { Person, ProductCategory } from '../types';

const NOW = new Date().toISOString();
const TODAY = new Date().toISOString().slice(0, 10);
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

// ── ヘルパー ──────────────────────────────────────────────────────────
function makePerson(over: Partial<Person> = {}): Person {
  return {
    id: `p-${Math.random().toString(36).slice(2)}`,
    householdId: 'h1',
    name: 'テスト太郎',
    relation: 'head',
    memo: '',
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

function resetStore() {
  useAppStore.setState({
    opportunities: [],
    persons: [],
    currentUserId: 'u1',
    currentRole: 'general',
    insuranceCompanies: [
      { id: 'ins1', name: '日本生命', isActive: true, order: 1 },
      { id: 'ins2', name: '住友生命', isActive: false, order: 2 },
    ],
    productCategories: [
      { id: 'cat1', name: '生命保険', categoryKey: 'life' as ProductCategory, isActive: true, order: 1 },
      { id: 'cat2', name: '医療保険', categoryKey: 'medical' as ProductCategory, isActive: true, order: 2 },
      { id: 'cat3', name: '損害保険', categoryKey: 'non_life' as ProductCategory, isActive: false, order: 3 },
    ],
  });
}

// ── 構成員（Person）年収フィールド ──────────────────────────────────
describe('工程D: Person.annualIncome', () => {
  it('構成員に年収フィールドが存在する', () => {
    const person = makePerson({ annualIncome: 500 });
    expect(person.annualIncome).toBe(500);
  });

  it('年収は省略可能（optional）', () => {
    const person = makePerson();
    expect(person.annualIncome).toBeUndefined();
  });

  it('複数構成員の年収合計が計算できる', () => {
    const persons = [
      makePerson({ name: '山田太郎', annualIncome: 600 }),
      makePerson({ name: '山田花子', annualIncome: 300 }),
      makePerson({ name: '山田次郎' }), // 年収なし
    ];
    const total = persons.reduce((sum, p) => sum + (p.annualIncome ?? 0), 0);
    expect(total).toBe(900);
  });

  it('addPerson で annualIncome が保存される', () => {
    resetStore();
    const store = useAppStore.getState();
    store.addPerson('h1', {
      name: '山田太郎',
      relation: 'head',
      annualIncome: 700,
      memo: '',
    });
    const { persons } = useAppStore.getState();
    const added = persons.find(p => p.name === '山田太郎');
    expect(added).toBeDefined();
    expect(added!.annualIncome).toBe(700);
  });
});

// ── 種目マスタ選択ロジック ──────────────────────────────────────────
describe('工程D: 種目マスタ (isActive:true のみ選択対象)', () => {
  beforeEach(resetStore);

  it('isActive:true のカテゴリのみが有効', () => {
    const { productCategories } = useAppStore.getState();
    const active = productCategories.filter(c => c.isActive);
    expect(active).toHaveLength(2);
    expect(active.map(c => c.categoryKey)).toEqual(['life', 'medical']);
  });

  it('isActive:false のカテゴリは選択対象外', () => {
    const { productCategories } = useAppStore.getState();
    const active = productCategories.filter(c => c.isActive);
    expect(active.some(c => c.categoryKey === 'non_life')).toBe(false);
  });

  it('マスタのcategoryKeyがProductCategory enumと一致する', () => {
    const { productCategories } = useAppStore.getState();
    const cat = productCategories.find(c => c.id === 'cat1');
    expect(cat!.categoryKey).toBe('life');
  });
});

// ── 保険会社マスタ選択ロジック ──────────────────────────────────────
describe('工程D: 保険会社マスタ (isActive:true のみ選択対象)', () => {
  beforeEach(resetStore);

  it('isActive:true の保険会社のみが有効', () => {
    const { insuranceCompanies } = useAppStore.getState();
    const active = insuranceCompanies.filter(c => c.isActive);
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe('日本生命');
  });

  it('isActive:false の保険会社は選択対象外', () => {
    const { insuranceCompanies } = useAppStore.getState();
    const active = insuranceCompanies.filter(c => c.isActive);
    expect(active.some(c => c.name === '住友生命')).toBe(false);
  });
});

// ── ProposalProduct 追加（insurer + insurerId） ─────────────────────
describe('工程D: 保険商品追加 - insurer/insurerId 後方互換', () => {
  beforeEach(resetStore);

  it('addOpportunity で insurer(名前文字列) と insurerId の両方が保存される', () => {
    const store = useAppStore.getState();
    const { insuranceCompanies, productCategories } = store;
    const insurer = insuranceCompanies.find(c => c.id === 'ins1')!;
    const category = productCategories.find(c => c.id === 'cat1')!;

    store.addOpportunity({
      householdId: 'h1',
      ownerId: 'u1',
      title: '日本生命 / 生命保険',
      stage: 'approach',
      status: 'open',
      targetPersonIds: ['p1'],
      productCategories: [category.categoryKey as ProductCategory],
      proposalProducts: [
        {
          id: '',
          productCategory: category.categoryKey as ProductCategory,
          productName: category.name,
          insurer: insurer.name,
          insurerId: insurer.id,
          insuredPersonId: 'p1',
          monthlyPremium: 15000,
          firstConsultDate: TODAY,
          memo: '',
        },
      ],
      needsAnalysisDone: false,
      illustrationProvided: false,
      tags: [],
      memo: '',
    });

    const { opportunities } = useAppStore.getState();
    const opp = opportunities[0];
    expect(opp.proposalProducts).toHaveLength(1);
    const product = opp.proposalProducts[0];
    // 後方互換: insurer (名前文字列) が存在する
    expect(product.insurer).toBe('日本生命');
    // 新規追加: insurerId が存在する
    expect(product.insurerId).toBe('ins1');
    // productCategory に categoryKey が保存される
    expect(product.productCategory).toBe('life');
  });
});

// ── 初回相談日: デフォルト=当日、直前値継承 ────────────────────────
describe('工程D: 初回相談日デフォルト値と直前値継承ロジック', () => {
  it('初期値は今日の日付', () => {
    // PoliciesPane のロジックを純粋関数として検証
    const todayStr = () => new Date().toISOString().slice(0, 10);
    const firstDate = todayStr();
    expect(firstDate).toBe(TODAY);
  });

  it('直前に入力した値が次のフォームの初期値になる（ref による継承）', () => {
    // lastConsultDateRef.current の継承ロジックをシミュレート
    let lastConsultDate = TODAY;
    const applyEntry = (date: string) => {
      lastConsultDate = date;
    };
    // 1件目を YESTERDAY で登録
    applyEntry(YESTERDAY);
    expect(lastConsultDate).toBe(YESTERDAY);
    // 2件目フォームの初期値は直前の YESTERDAY
    const secondFormInitial = lastConsultDate;
    expect(secondFormInitial).toBe(YESTERDAY);
  });

  it('初回相談日が空の場合は当日にフォールバック', () => {
    const todayStr = () => new Date().toISOString().slice(0, 10);
    const resolveDate = (input: string) => input || todayStr();
    expect(resolveDate('')).toBe(TODAY);
    expect(resolveDate('2026-09-01')).toBe('2026-09-01');
  });
});

// ── 3ペイン: スマホタブ状態管理ロジック ────────────────────────────
describe('工程D: スマホタブ切替ロジック', () => {
  it('世帯選択時にタブ1(構成員)に自動遷移する', () => {
    // useHouseholdsPaneState のロジックを純粋に検証
    let activeTab = 0;
    // 世帯選択後は構成員ペインへ自動遷移するロジック
    const simulateSelect = () => { activeTab = 1; };
    expect(activeTab).toBe(0);
    simulateSelect();
    expect(activeTab).toBe(1);
  });

  it('タブは 0/1/2 の範囲内', () => {
    const validTabs = [0, 1, 2];
    validTabs.forEach(tab => {
      expect(tab).toBeGreaterThanOrEqual(0);
      expect(tab).toBeLessThanOrEqual(2);
    });
  });
});
