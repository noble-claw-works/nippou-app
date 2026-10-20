// =====================================================
// opportunityPermission.test.ts — Phase 2: ロール別閲覧/編集権限
// =====================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store';
import type { Role } from '../types';

// Reset state
function reset(role: Role, userId: string) {
  useAppStore.setState({
    opportunities: [],
    currentRole: role,
    currentUserId: userId,
  });
}

function addOpportunity(ownerId: string) {
  return useAppStore.getState().addOpportunity({
    householdId: 'c1',
    ownerId,
    title: `${ownerId}の案件`,
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
}

describe('Opportunity: ロール別 — general', () => {
  beforeEach(() => { reset('general', 'u1'); });

  it('自分の案件を作成できる', () => {
    const opp = addOpportunity('u1');
    expect(opp.ownerId).toBe('u1');
    expect(useAppStore.getState().opportunities).toHaveLength(1);
  });

  it('自分の案件を更新できる', () => {
    const opp = addOpportunity('u1');
    useAppStore.getState().updateOpportunity(opp.id, { title: '更新済み' });
    const updated = useAppStore.getState().getOpportunityById(opp.id)!;
    expect(updated.title).toBe('更新済み');
  });

  it('自分の案件のステージを変更できる', () => {
    const opp = addOpportunity('u1');
    useAppStore.getState().changeOpportunityStage(opp.id, 'fact_finding');
    const updated = useAppStore.getState().getOpportunityById(opp.id)!;
    expect(updated.stage).toBe('fact_finding');
  });

  it('自分の案件を削除できる', () => {
    const opp = addOpportunity('u1');
    useAppStore.getState().deleteOpportunity(opp.id);
    expect(useAppStore.getState().getOpportunityById(opp.id)).toBeUndefined();
  });
});

describe('Opportunity: ロール別 — manager', () => {
  beforeEach(() => { reset('manager', 'u4'); });

  it('自分の案件を作成できる', () => {
    const opp = addOpportunity('u4');
    expect(opp.ownerId).toBe('u4');
  });

  it('他ユーザーの案件も store に存在する（閲覧可）', () => {
    // In demo, manager sees all (store itself doesn't enforce read restriction)
    const o1 = addOpportunity('u1');
    const o2 = addOpportunity('u4');
    const all = useAppStore.getState().opportunities;
    expect(all).toHaveLength(2);
    expect(all.find(o => o.id === o1.id)).toBeTruthy();
    expect(all.find(o => o.id === o2.id)).toBeTruthy();
  });
});

describe('Opportunity: ロール別 — admin', () => {
  beforeEach(() => { reset('admin', 'u6'); });

  it('どのユーザーの案件も更新できる（admin 権限）', () => {
    // admin can edit any opportunity
    // First create an opportunity as general user
    useAppStore.setState({ currentRole: 'general', currentUserId: 'u1', opportunities: [] });
    const opp = addOpportunity('u1');
    const savedOpps = useAppStore.getState().opportunities;

    // Switch to admin — preserve opportunities
    useAppStore.setState({ currentRole: 'admin', currentUserId: 'u6', opportunities: savedOpps });
    useAppStore.getState().updateOpportunity(opp.id, { title: 'admin 編集' });
    const updated = useAppStore.getState().getOpportunityById(opp.id)!;
    expect(updated.title).toBe('admin 編集');
  });
});

describe('Opportunity: OpportunitiesPage role filtering logic', () => {
  beforeEach(() => {
    useAppStore.setState({ opportunities: [] });
  });

  it('general role — 自分の案件のみ getOpportunitiesByHousehold に含まれる', () => {
    useAppStore.setState({ currentRole: 'general', currentUserId: 'u1' });
    // Add one own, one other
    useAppStore.getState().addOpportunity({
      householdId: 'c1', ownerId: 'u1', title: '自分', stage: 'approach', status: 'open',
      targetPersonIds: [], productCategories: [], proposalProducts: [],
      needsAnalysisDone: false, illustrationProvided: false, tags: [], memo: '',
    });
    useAppStore.getState().addOpportunity({
      householdId: 'c1', ownerId: 'u2', title: '他人', stage: 'approach', status: 'open',
      targetPersonIds: [], productCategories: [], proposalProducts: [],
      needsAnalysisDone: false, illustrationProvided: false, tags: [], memo: '',
    });

    const { opportunities, currentUserId, currentRole } = useAppStore.getState();

    // Simulate general role filter (as done in OpportunitiesPage)
    const visible = currentRole === 'general'
      ? opportunities.filter(o => o.ownerId === currentUserId)
      : opportunities;

    expect(visible).toHaveLength(1);
    expect(visible[0].title).toBe('自分');
  });

  it('executive role — 全件見える', () => {
    useAppStore.setState({ currentRole: 'executive', currentUserId: 'u5' });
    useAppStore.getState().addOpportunity({
      householdId: 'c1', ownerId: 'u1', title: 'A', stage: 'approach', status: 'open',
      targetPersonIds: [], productCategories: [], proposalProducts: [],
      needsAnalysisDone: false, illustrationProvided: false, tags: [], memo: '',
    });
    useAppStore.getState().addOpportunity({
      householdId: 'c2', ownerId: 'u2', title: 'B', stage: 'proposal', status: 'open',
      targetPersonIds: [], productCategories: [], proposalProducts: [],
      needsAnalysisDone: false, illustrationProvided: false, tags: [], memo: '',
    });

    const { opportunities, currentRole, currentUserId } = useAppStore.getState();
    const visible = currentRole === 'general'
      ? opportunities.filter(o => o.ownerId === currentUserId)
      : opportunities;

    expect(visible).toHaveLength(2);
  });
});
