// =====================================================
// quickOpportunityCreate.test.ts
// 新規案件作成モーダルが addOpportunity に渡す項目
// (担当者/対象者/提案商品/確度) が正しく反映されることを検証
// =====================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store';
import type { ProposalProduct } from '../types';

function resetStore() {
  useAppStore.setState({
    opportunities: [],
    currentUserId: 'u1',
    currentRole: 'general',
  });
}

describe('QuickOpportunityModal: addOpportunity 統合', () => {
  beforeEach(() => { resetStore(); });

  it('担当者/対象者/提案商品/確度つきの案件を正しく生成する', () => {
    const store = useAppStore.getState();
    const products: ProposalProduct[] = [
      { id: 'pp1', productCategory: 'life', productName: '収入保障', insurer: 'ソニー生命', insuredPersonId: 'p1', monthlyPremium: 4800, memo: '' },
      { id: 'pp2', productCategory: 'medical', productName: '医療保険', insurer: 'アフラック', insuredPersonId: 'p2', monthlyPremium: 2200, memo: '' },
    ];
    const opp = store.addOpportunity({
      householdId: 'c1',
      ownerId: 'u2',
      title: '田中家 生命保険 見直し',
      stage: 'proposal',
      status: 'open',
      targetPersonIds: ['p1', 'p2'],
      productCategories: ['life', 'medical'],
      proposalProducts: products,
      confidence: 'A',
      needsAnalysisDone: false,
      illustrationProvided: false,
      tags: [],
      memo: 'テストメモ',
    });

    expect(opp.ownerId).toBe('u2');
    expect(opp.targetPersonIds).toEqual(['p1', 'p2']);
    expect(opp.proposalProducts).toHaveLength(2);
    expect(opp.confidence).toBe('A');
    // totalMonthlyPremium は addOpportunity が自動計算
    expect(opp.totalMonthlyPremium).toBe(7000);
    // stageHistory の changedByUserId は ownerId
    expect(opp.stageHistory[0].changedByUserId).toBe('u2');
    // storeに保存されている
    const stored = useAppStore.getState().opportunities.find(o => o.id === opp.id);
    expect(stored).toBeTruthy();
    expect(stored!.confidence).toBe('A');
  });

  it('確度未設定・提案商品0件でも案件を生成できる', () => {
    const store = useAppStore.getState();
    const opp = store.addOpportunity({
      householdId: 'c1',
      ownerId: 'u1',
      title: '最小案件',
      stage: 'approach',
      status: 'open',
      targetPersonIds: [],
      productCategories: [],
      proposalProducts: [],
      needsAnalysisDone: false,
      illustrationProvided: false,
      tags: [],
      memo: '',
    });
    expect(opp.confidence).toBeUndefined();
    expect(opp.proposalProducts).toEqual([]);
    expect(opp.totalMonthlyPremium).toBeUndefined();
  });
});
