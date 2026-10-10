// =====================================================
// policy.test.ts — Phase 3: 保険契約 CRUD / ステータス遷移
// =====================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store';
import type { Policy } from '../types';

function resetStore() {
  useAppStore.setState({
    policies: [],
    policyStatusHistory: [],
    opportunities: [],
    persons: [],
    currentUserId: 'u1',
    currentRole: 'general',
  });
}

function makePolicy(overrides: Partial<Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>> = {}): Omit<Policy, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    householdId: 'c1',
    ownerId: 'u1',
    contractorPersonId: 'p1',
    insuredPersonIds: ['p1'],
    insurer: '日本生命',
    productName: 'テスト保険',
    productCategory: 'life',
    status: 'pending',
    startDate: '2025-01-01',
    monthlyPremium: 10000,
    payMode: 'monthly',
    hasCashValue: false,
    coverages: [],
    tags: [],
    memo: '',
    ...overrides,
  };
}

// ── CRUD ──────────────────────────────────────────────

describe('Policy CRUD', () => {
  beforeEach(resetStore);

  it('addPolicy: 契約を追加できる', () => {
    const store = useAppStore.getState();
    const policy = store.addPolicy(makePolicy());
    expect(policy.id).toBeDefined();
    expect(policy.productName).toBe('テスト保険');
    expect(useAppStore.getState().policies).toHaveLength(1);
  });

  it('updatePolicy: 契約を更新できる', () => {
    const store = useAppStore.getState();
    const policy = store.addPolicy(makePolicy());
    useAppStore.getState().updatePolicy(policy.id, { productName: '更新後保険', monthlyPremium: 20000 });
    const updated = useAppStore.getState().policies.find(p => p.id === policy.id);
    expect(updated?.productName).toBe('更新後保険');
    expect(updated?.monthlyPremium).toBe(20000);
  });

  it('deletePolicy: 契約を削除できる', () => {
    const store = useAppStore.getState();
    const policy = store.addPolicy(makePolicy());
    useAppStore.getState().deletePolicy(policy.id);
    expect(useAppStore.getState().policies).toHaveLength(0);
  });
});

// ── Coverage CRUD ──────────────────────────────────────

describe('Coverage CRUD', () => {
  beforeEach(resetStore);

  it('addCoverage: 保障を追加できる', () => {
    const store = useAppStore.getState();
    const policy = store.addPolicy(makePolicy());
    const cov = useAppStore.getState().addCoverage(policy.id, {
      type: 'death',
      label: '死亡保険金',
      insuredPersonId: 'p1',
      isMain: true,
      faceAmount: 10000000,
      unit: 'JPY',
      memo: '',
    });
    expect(cov.id).toBeDefined();
    expect(cov.policyId).toBe(policy.id);
    const updatedPolicy = useAppStore.getState().policies.find(p => p.id === policy.id);
    expect(updatedPolicy?.coverages).toHaveLength(1);
    expect(updatedPolicy?.coverages[0].label).toBe('死亡保険金');
  });

  it('updateCoverage: 保障を更新できる', () => {
    const store = useAppStore.getState();
    const policy = store.addPolicy(makePolicy());
    const cov = useAppStore.getState().addCoverage(policy.id, {
      type: 'death', label: '死亡保険金', insuredPersonId: 'p1', isMain: true, memo: '',
    });
    useAppStore.getState().updateCoverage(cov.id, { label: '更新後ラベル', faceAmount: 20000000 });
    const updatedPolicy = useAppStore.getState().policies.find(p => p.id === policy.id);
    expect(updatedPolicy?.coverages[0].label).toBe('更新後ラベル');
    expect(updatedPolicy?.coverages[0].faceAmount).toBe(20000000);
  });

  it('deleteCoverage: 保障を削除できる', () => {
    const store = useAppStore.getState();
    const policy = store.addPolicy(makePolicy());
    const cov = useAppStore.getState().addCoverage(policy.id, {
      type: 'death', label: '死亡保険金', insuredPersonId: 'p1', isMain: true, memo: '',
    });
    useAppStore.getState().deleteCoverage(cov.id);
    const updatedPolicy = useAppStore.getState().policies.find(p => p.id === policy.id);
    expect(updatedPolicy?.coverages).toHaveLength(0);
  });
});

// ── issuePoliciesFromOpportunity ──────────────────────

describe('issuePoliciesFromOpportunity', () => {
  beforeEach(() => {
    useAppStore.setState({
      policies: [],
      policyStatusHistory: [],
      persons: [],
      currentUserId: 'u1',
      currentRole: 'general',
      opportunities: [
        {
          id: 'opp_test',
          householdId: 'c1',
          ownerId: 'u1',
          title: 'テスト商談',
          targetPersonIds: ['p1'],
          stage: 'application',
          status: 'open',
          productCategories: ['life', 'medical'],
          proposalProducts: [
            {
              id: 'pp1',
              productCategory: 'life',
              productName: '終身保険A',
              insurer: '日本生命',
              insuredPersonId: 'p1',
              monthlyPremium: 15000,
              faceAmount: 10000000,
              memo: '',
            },
            {
              id: 'pp2',
              productCategory: 'medical',
              productName: '医療保険B',
              insurer: 'アフラック',
              insuredPersonId: 'p1',
              monthlyPremium: 5000,
              memo: '',
            },
          ],
          needsAnalysisDone: true,
          illustrationProvided: true,
          stageHistory: [],
          tags: [],
          memo: '',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ],
    });
  });

  it('proposalProducts の数だけ Policy が生成される', () => {
    const issued = useAppStore.getState().issuePoliciesFromOpportunity('opp_test', 'u1');
    expect(issued).toHaveLength(2);
    expect(useAppStore.getState().policies).toHaveLength(2);
  });

  it('生成された Policy の status は pending', () => {
    const issued = useAppStore.getState().issuePoliciesFromOpportunity('opp_test', 'u1');
    for (const p of issued) {
      expect(p.status).toBe('pending');
    }
  });

  it('Opportunity のステージが issued に変わる', () => {
    useAppStore.getState().issuePoliciesFromOpportunity('opp_test', 'u1');
    const opp = useAppStore.getState().opportunities.find(o => o.id === 'opp_test');
    expect(opp?.stage).toBe('issued');
    expect(opp?.status).toBe('won');
  });

  it('sourceOpportunityId が設定される', () => {
    const issued = useAppStore.getState().issuePoliciesFromOpportunity('opp_test', 'u1');
    for (const p of issued) {
      expect(p.sourceOpportunityId).toBe('opp_test');
    }
  });

  it('faceAmount のある proposalProduct から Coverage が生成される', () => {
    const issued = useAppStore.getState().issuePoliciesFromOpportunity('opp_test', 'u1');
    const lifePolicy = issued.find(p => p.productCategory === 'life');
    expect(lifePolicy?.coverages).toHaveLength(1);
    expect(lifePolicy?.coverages[0].faceAmount).toBe(10000000);
  });
});

// ── activatePolicy ────────────────────────────────────

describe('activatePolicy', () => {
  beforeEach(resetStore);

  it('pending → inforce 遷移 + 証券番号設定', () => {
    const store = useAppStore.getState();
    const policy = store.addPolicy(makePolicy({ status: 'pending' }));
    useAppStore.getState().activatePolicy(policy.id, 'TEST-001', '2025-06-01', 'u1');
    const updated = useAppStore.getState().policies.find(p => p.id === policy.id);
    expect(updated?.status).toBe('inforce');
    expect(updated?.policyNumber).toBe('TEST-001');
    expect(updated?.startDate).toBe('2025-06-01');
  });

  it('activatePolicy は statusHistory を追記する', () => {
    const store = useAppStore.getState();
    const policy = store.addPolicy(makePolicy({ status: 'pending' }));
    useAppStore.getState().activatePolicy(policy.id, 'TEST-002', '2025-06-01', 'u1');
    const history = useAppStore.getState().policyStatusHistory.filter(h => h.policyId === policy.id);
    expect(history.length).toBeGreaterThan(0);
    expect(history.some(h => h.status === 'inforce')).toBe(true);
  });
});

// ── changePolicyStatus ────────────────────────────────

describe('changePolicyStatus', () => {
  beforeEach(resetStore);

  it('statusHistory にエントリが追加される', () => {
    const store = useAppStore.getState();
    const policy = store.addPolicy(makePolicy({ status: 'inforce' }));
    useAppStore.getState().changePolicyStatus(policy.id, 'surrendered', '解約理由', 'u1');
    const updated = useAppStore.getState().policies.find(p => p.id === policy.id);
    expect(updated?.status).toBe('surrendered');
    const history = useAppStore.getState().policyStatusHistory.filter(h => h.policyId === policy.id);
    expect(history.some(h => h.status === 'surrendered' && h.note === '解約理由')).toBe(true);
  });
});

// ── getPoliciesByHousehold ────────────────────────────

describe('getPoliciesByHousehold', () => {
  beforeEach(resetStore);

  it('世帯フィルタ', () => {
    const store = useAppStore.getState();
    store.addPolicy(makePolicy({ householdId: 'c1', status: 'inforce' }));
    store.addPolicy(makePolicy({ householdId: 'c1', status: 'pending' }));
    store.addPolicy(makePolicy({ householdId: 'c2', status: 'inforce' }));
    const c1Policies = useAppStore.getState().getPoliciesByHousehold('c1');
    expect(c1Policies).toHaveLength(2);
  });

  it('activeOnly: inforce + pending のみ返す', () => {
    const store = useAppStore.getState();
    store.addPolicy(makePolicy({ householdId: 'c1', status: 'inforce' }));
    store.addPolicy(makePolicy({ householdId: 'c1', status: 'pending' }));
    store.addPolicy(makePolicy({ householdId: 'c1', status: 'surrendered' }));
    const active = useAppStore.getState().getPoliciesByHousehold('c1', { activeOnly: true });
    expect(active).toHaveLength(2);
    expect(active.every(p => p.status === 'inforce' || p.status === 'pending')).toBe(true);
  });
});

// ── getPoliciesByPerson ───────────────────────────────

describe('getPoliciesByPerson', () => {
  beforeEach(resetStore);

  it('被保険者で絞り込める', () => {
    const store = useAppStore.getState();
    store.addPolicy(makePolicy({ insuredPersonIds: ['p1'], contractorPersonId: 'p1', status: 'inforce' }));
    store.addPolicy(makePolicy({ insuredPersonIds: ['p2'], contractorPersonId: 'p2', status: 'inforce' }));
    const p1Policies = useAppStore.getState().getPoliciesByPerson('p1');
    expect(p1Policies).toHaveLength(1);
    expect(p1Policies[0].insuredPersonIds).toContain('p1');
  });

  it('activeOnly フィルタ', () => {
    const store = useAppStore.getState();
    store.addPolicy(makePolicy({ insuredPersonIds: ['p1'], contractorPersonId: 'p1', status: 'inforce' }));
    store.addPolicy(makePolicy({ insuredPersonIds: ['p1'], contractorPersonId: 'p1', status: 'surrendered' }));
    const active = useAppStore.getState().getPoliciesByPerson('p1', { activeOnly: true });
    expect(active).toHaveLength(1);
    expect(active[0].status).toBe('inforce');
  });
});
