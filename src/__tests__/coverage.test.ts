// =====================================================
// coverage.test.ts — Phase 3: Coverage CRUD / getCoverageMatrix
// =====================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store';
import type { Person, PolicyStatus } from '../types';

function makePersonSeed(id: string, householdId: string, relation: Person['relation'] = 'head'): Person {
  const now = new Date().toISOString();
  return { id, householdId, name: `Person ${id}`, relation, memo: '', createdAt: now, updatedAt: now };
}

function makePolicy(householdId: string, personId: string, status: PolicyStatus = 'inforce') {
  const store = useAppStore.getState();
  return store.addPolicy({
    householdId,
    ownerId: 'u1',
    contractorPersonId: personId,
    insuredPersonIds: [personId],
    insurer: 'テスト生命',
    productName: 'テスト保険',
    productCategory: 'life',
    status,
    startDate: '2025-01-01',
    monthlyPremium: 10000,
    payMode: 'monthly',
    hasCashValue: false,
    coverages: [],
    tags: [],
    memo: '',
  });
}

function resetStore() {
  useAppStore.setState({
    policies: [],
    policyStatusHistory: [],
    persons: [],
    currentUserId: 'u1',
    currentRole: 'general',
  });
}

// ── Coverage CRUD ─────────────────────────────────────

describe('Coverage CRUD', () => {
  beforeEach(resetStore);

  it('addCoverage: Coverage を追加できる', () => {
    const policy = makePolicy('c1', 'p1');
    const cov = useAppStore.getState().addCoverage(policy.id, {
      type: 'death',
      label: '死亡保険金',
      insuredPersonId: 'p1',
      isMain: true,
      faceAmount: 30000000,
      unit: 'JPY',
      memo: '',
    });
    expect(cov.id).toBeDefined();
    expect(cov.policyId).toBe(policy.id);
    expect(cov.faceAmount).toBe(30000000);
  });

  it('updateCoverage: Coverage を更新できる', () => {
    const policy = makePolicy('c1', 'p1');
    const cov = useAppStore.getState().addCoverage(policy.id, {
      type: 'medical_hospital', label: '入院給付金', insuredPersonId: 'p1', isMain: true, memo: '',
    });
    useAppStore.getState().updateCoverage(cov.id, { unitAmount: 10000, unit: 'day' });
    const updated = useAppStore.getState().policies.find(p => p.id === policy.id);
    expect(updated?.coverages[0].unitAmount).toBe(10000);
    expect(updated?.coverages[0].unit).toBe('day');
  });

  it('deleteCoverage: Coverage を削除できる', () => {
    const policy = makePolicy('c1', 'p1');
    const cov = useAppStore.getState().addCoverage(policy.id, {
      type: 'cancer', label: 'がん診断', insuredPersonId: 'p1', isMain: true, memo: '',
    });
    useAppStore.getState().deleteCoverage(cov.id);
    const updated = useAppStore.getState().policies.find(p => p.id === policy.id);
    expect(updated?.coverages).toHaveLength(0);
  });
});

// ── getCoverageMatrix ─────────────────────────────────

describe('getCoverageMatrix', () => {
  beforeEach(() => {
    resetStore();
    // 世帯員を登録
    useAppStore.setState({
      persons: [
        makePersonSeed('p_head', 'c1', 'head'),
        makePersonSeed('p_spouse', 'c1', 'spouse'),
      ],
    });
  });

  it('加入有無を正しく集計する', () => {
    const policy = makePolicy('c1', 'p_head');
    useAppStore.getState().addCoverage(policy.id, {
      type: 'death', label: '死亡保険金', insuredPersonId: 'p_head', isMain: true,
      faceAmount: 10000000, unit: 'JPY', memo: '',
    });

    const matrix = useAppStore.getState().getCoverageMatrix('c1');
    const headRow = matrix.find(m => m.personId === 'p_head');
    expect(headRow?.coverageTypes.has('death')).toBe(true);
    expect(headRow?.coverageTypes.has('cancer')).toBe(false);
  });

  it('合計保険金額を計算する', () => {
    const pol1 = makePolicy('c1', 'p_head');
    const pol2 = makePolicy('c1', 'p_head');
    useAppStore.getState().addCoverage(pol1.id, {
      type: 'death', label: '死亡保険金1', insuredPersonId: 'p_head', isMain: true,
      faceAmount: 10000000, unit: 'JPY', memo: '',
    });
    useAppStore.getState().addCoverage(pol2.id, {
      type: 'death', label: '死亡保険金2', insuredPersonId: 'p_head', isMain: false,
      faceAmount: 5000000, unit: 'JPY', memo: '',
    });

    const matrix = useAppStore.getState().getCoverageMatrix('c1');
    const headRow = matrix.find(m => m.personId === 'p_head');
    expect(headRow?.totalFaceByType['death']).toBe(15000000);
  });

  it('lapsed/surrendered の契約は集計対象外', () => {
    const policy = makePolicy('c1', 'p_head', 'surrendered');
    useAppStore.getState().addCoverage(policy.id, {
      type: 'death', label: '死亡保険金', insuredPersonId: 'p_head', isMain: true,
      faceAmount: 10000000, unit: 'JPY', memo: '',
    });

    const matrix = useAppStore.getState().getCoverageMatrix('c1');
    const headRow = matrix.find(m => m.personId === 'p_head');
    expect(headRow?.coverageTypes.has('death')).toBe(false);
  });

  it('配偶者に医療保障がある場合は配偶者行に反映される', () => {
    const policy = makePolicy('c1', 'p_spouse');
    useAppStore.getState().addCoverage(policy.id, {
      type: 'medical_hospital', label: '入院給付金', insuredPersonId: 'p_spouse', isMain: true,
      unitAmount: 5000, unit: 'day', memo: '',
    });

    const matrix = useAppStore.getState().getCoverageMatrix('c1');
    const spouseRow = matrix.find(m => m.personId === 'p_spouse');
    expect(spouseRow?.coverageTypes.has('medical_hospital')).toBe(true);

    const headRow = matrix.find(m => m.personId === 'p_head');
    expect(headRow?.coverageTypes.has('medical_hospital')).toBe(false);
  });

  it('全世帯員分の行が返る', () => {
    const matrix = useAppStore.getState().getCoverageMatrix('c1');
    expect(matrix).toHaveLength(2); // p_head + p_spouse
    expect(matrix.map(m => m.personId)).toContain('p_head');
    expect(matrix.map(m => m.personId)).toContain('p_spouse');
  });
});
