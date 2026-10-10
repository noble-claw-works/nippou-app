// =====================================================
// opportunity.test.ts — Phase 2: 商談案件 CRUD / ステージ変更
// =====================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store';


// Reset store before each test
function resetStore() {
  useAppStore.setState({
    opportunities: [],
    currentUserId: 'u1',
    currentRole: 'general',
  });
}

function createOpportunity(overrides: Partial<Parameters<typeof useAppStore.getState>['0']['addOpportunity']> = {}) {
  const store = useAppStore.getState();
  return store.addOpportunity({
    householdId: 'c1',
    ownerId: 'u1',
    title: 'テスト案件',
    stage: 'approach',
    status: 'open',
    targetPersonIds: [],
    productCategories: ['life'],
    proposalProducts: [],
    needsAnalysisDone: false,
    illustrationProvided: false,
    tags: [],
    memo: '',
    ...overrides,
  });
}

describe('Opportunity: CRUD', () => {
  beforeEach(() => { resetStore(); });

  it('addOpportunity — id, stageHistory, timestamps を自動設定する', () => {
    const opp = createOpportunity();
    expect(opp.id).toBeTruthy();
    expect(opp.createdAt).toBeTruthy();
    expect(opp.updatedAt).toBeTruthy();
    expect(opp.stageHistory).toHaveLength(1);
    expect(opp.stageHistory[0].stage).toBe('approach');
    expect(opp.stageHistory[0].changedByUserId).toBe('u1');
  });

  it('addOpportunity — totalMonthlyPremium を proposalProducts から自動計算する', () => {
    const opp = createOpportunity({
      proposalProducts: [
        { id: 'pp1', productCategory: 'life', productName: 'テスト商品', insurer: 'テスト生命', insuredPersonId: 'p1', monthlyPremium: 3000, memo: '' },
        { id: 'pp2', productCategory: 'medical', productName: 'テスト医療', insurer: 'テスト生命', insuredPersonId: 'p1', monthlyPremium: 2500, memo: '' },
      ],
    });
    expect(opp.totalMonthlyPremium).toBe(5500);
  });

  it('addOpportunity — proposalProducts なしの場合 totalMonthlyPremium は undefined', () => {
    const opp = createOpportunity();
    expect(opp.totalMonthlyPremium).toBeUndefined();
  });

  it('updateOpportunity — patch が反映される', () => {
    const opp = createOpportunity();

    useAppStore.getState().updateOpportunity(opp.id, { title: '更新された案件', memo: 'テスト' });
    const updated = useAppStore.getState().opportunities.find(o => o.id === opp.id)!;

    expect(updated.title).toBe('更新された案件');
    expect(updated.memo).toBe('テスト');
    expect(updated.updatedAt).toBeTruthy();
  });

  it('updateOpportunity — proposalProducts patch 時に totalMonthlyPremium を再計算する', () => {
    const opp = createOpportunity();
    useAppStore.getState().updateOpportunity(opp.id, {
      proposalProducts: [
        { id: 'pp1', productCategory: 'auto', productName: '自動車', insurer: '損保', insuredPersonId: '', monthlyPremium: 8000, memo: '' },
      ],
    });
    const updated = useAppStore.getState().opportunities.find(o => o.id === opp.id)!;
    expect(updated.totalMonthlyPremium).toBe(8000);
  });

  it('deleteOpportunity — 案件が削除される', () => {
    const opp = createOpportunity();
    expect(useAppStore.getState().opportunities).toHaveLength(1);
    useAppStore.getState().deleteOpportunity(opp.id);
    expect(useAppStore.getState().opportunities).toHaveLength(0);
  });

  it('getOpportunityById — 存在するIDで返却する', () => {
    const opp = createOpportunity();
    const found = useAppStore.getState().getOpportunityById(opp.id);
    expect(found?.id).toBe(opp.id);
  });

  it('getOpportunityById — 存在しないIDで undefined を返す', () => {
    const found = useAppStore.getState().getOpportunityById('nonexistent');
    expect(found).toBeUndefined();
  });
});

describe('Opportunity: changeOpportunityStage', () => {
  beforeEach(() => { resetStore(); });

  it('ステージが更新されて stageHistory に追記される', () => {
    const opp = createOpportunity();
    useAppStore.getState().changeOpportunityStage(opp.id, 'proposal', 'テストメモ');
    const updated = useAppStore.getState().getOpportunityById(opp.id)!;

    expect(updated.stage).toBe('proposal');
    expect(updated.stageHistory).toHaveLength(2);
    const lastHistory = updated.stageHistory[1];
    expect(lastHistory.stage).toBe('proposal');
    expect(lastHistory.note).toBe('テストメモ');
    expect(lastHistory.changedByUserId).toBe('u1');
  });

  it('issued に変更すると status = won, actualCloseDate が自動設定される', () => {
    const opp = createOpportunity();
    expect(opp.actualCloseDate).toBeUndefined();

    useAppStore.getState().changeOpportunityStage(opp.id, 'issued');
    const updated = useAppStore.getState().getOpportunityById(opp.id)!;

    expect(updated.stage).toBe('issued');
    expect(updated.status).toBe('won');
    expect(updated.actualCloseDate).toBeTruthy();
    expect(updated.actualCloseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('lost に変更すると status = lost, actualCloseDate が自動設定される', () => {
    const opp = createOpportunity();
    useAppStore.getState().changeOpportunityStage(opp.id, 'lost', '他社に決まった');
    const updated = useAppStore.getState().getOpportunityById(opp.id)!;

    expect(updated.stage).toBe('lost');
    expect(updated.status).toBe('lost');
    expect(updated.actualCloseDate).toBeTruthy();
  });

  it('won 後に actualCloseDate が上書きされない', () => {
    const opp = createOpportunity();
    useAppStore.getState().changeOpportunityStage(opp.id, 'issued');
    const firstDate = useAppStore.getState().getOpportunityById(opp.id)!.actualCloseDate;

    // stage change again should not overwrite actualCloseDate
    useAppStore.getState().changeOpportunityStage(opp.id, 'issued');
    const secondDate = useAppStore.getState().getOpportunityById(opp.id)!.actualCloseDate;
    expect(secondDate).toBe(firstDate);
  });

  it('updatedAt が設定される', () => {
    const opp = createOpportunity();
    useAppStore.getState().changeOpportunityStage(opp.id, 'fact_finding');
    const updated = useAppStore.getState().getOpportunityById(opp.id)!;
    expect(updated.updatedAt).toBeTruthy();
  });
});

describe('Opportunity: getOpportunitiesByHousehold', () => {
  beforeEach(() => { resetStore(); });

  it('世帯IDでフィルタリングされる', () => {
    createOpportunity({ householdId: 'c1' });
    createOpportunity({ householdId: 'c1' });
    createOpportunity({ householdId: 'c2' });

    const c1 = useAppStore.getState().getOpportunitiesByHousehold('c1');
    expect(c1).toHaveLength(2);
    const c2 = useAppStore.getState().getOpportunitiesByHousehold('c2');
    expect(c2).toHaveLength(1);
  });

  it('openOnly: true で open 案件のみ返す', () => {
    const o1 = createOpportunity({ householdId: 'c1' });
    const o2 = createOpportunity({ householdId: 'c1' });

    // Close o2
    useAppStore.getState().changeOpportunityStage(o2.id, 'issued');

    const openOnly = useAppStore.getState().getOpportunitiesByHousehold('c1', { openOnly: true });
    expect(openOnly).toHaveLength(1);
    expect(openOnly[0].id).toBe(o1.id);
  });

  it('存在しない世帯IDの場合、空配列を返す', () => {
    createOpportunity({ householdId: 'c1' });
    const result = useAppStore.getState().getOpportunitiesByHousehold('c999');
    expect(result).toHaveLength(0);
  });
});

describe('Opportunity: totalMonthlyPremium 自動計算', () => {
  beforeEach(() => { resetStore(); });

  it('複数商品の合計月払を計算する', () => {
    const opp = createOpportunity({
      proposalProducts: [
        { id: 'pp1', productCategory: 'life', productName: 'A', insurer: 'X', insuredPersonId: '', monthlyPremium: 5000, memo: '' },
        { id: 'pp2', productCategory: 'medical', productName: 'B', insurer: 'X', insuredPersonId: '', monthlyPremium: 3000, memo: '' },
        { id: 'pp3', productCategory: 'cancer', productName: 'C', insurer: 'X', insuredPersonId: '', monthlyPremium: 2000, memo: '' },
      ],
    });
    expect(opp.totalMonthlyPremium).toBe(10000);
  });

  it('商品更新後に再計算される', () => {
    const opp = createOpportunity({
      proposalProducts: [
        { id: 'pp1', productCategory: 'auto', productName: 'Car', insurer: 'Y', insuredPersonId: '', monthlyPremium: 6000, memo: '' },
      ],
    });
    expect(opp.totalMonthlyPremium).toBe(6000);

    useAppStore.getState().updateOpportunity(opp.id, {
      proposalProducts: [
        { id: 'pp1', productCategory: 'auto', productName: 'Car', insurer: 'Y', insuredPersonId: '', monthlyPremium: 6000, memo: '' },
        { id: 'pp2', productCategory: 'fire', productName: 'Fire', insurer: 'Y', insuredPersonId: '', monthlyPremium: 4000, memo: '' },
      ],
    });
    const updated = useAppStore.getState().getOpportunityById(opp.id)!;
    expect(updated.totalMonthlyPremium).toBe(10000);
  });
});
