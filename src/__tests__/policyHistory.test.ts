import { describe, it, expect } from 'vitest';
import { buildValueChange } from '../utils/policyHistory';
import type { Policy, Coverage } from '../types';

function mkCoverage(id: string, faceAmount: number | undefined, isMain: boolean): Coverage {
  return {
    id,
    policyId: 'pol1',
    type: 'death',
    label: '主契約',
    faceAmount,
    insuredPersonId: 'p1',
    isMain,
    memo: '',
  };
}

function mkPolicy(over: Partial<Policy> = {}): Policy {
  return {
    id: 'pol1',
    householdId: 'h1',
    ownerId: 'u1',
    contractorPersonId: 'p1',
    insuredPersonIds: ['p1'],
    insurer: 'X生命',
    productName: 'テスト保険',
    productCategory: 'life',
    status: 'inforce',
    startDate: '2026-01-01',
    monthlyPremium: 1000,
    payMode: 'monthly',
    hasCashValue: false,
    coverages: [mkCoverage('c1', 1000000, true)],
    tags: [],
    memo: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

const OPTS = {
  changedByUserId: 'u1',
  changedAt: '2026-10-19T00:00:00.000Z',
  id: 'vh_fixed',
  opportunityId: 'opp1',
};

describe('buildValueChange', () => {
  it('変更が無ければ null', () => {
    const p = mkPolicy();
    expect(buildValueChange(p, mkPolicy(), OPTS)).toBeNull();
  });

  it('monthlyPremium 変更を差分化', () => {
    const before = mkPolicy({ monthlyPremium: 1000 });
    const after = mkPolicy({ monthlyPremium: 1500 });
    const change = buildValueChange(before, after, OPTS);
    expect(change).not.toBeNull();
    expect(change!.fields).toHaveLength(1);
    expect(change!.fields[0]).toEqual({ field: 'monthlyPremium', before: 1000, after: 1500 });
    expect(change!.id).toBe('vh_fixed');
    expect(change!.changedAt).toBe('2026-10-19T00:00:00.000Z');
    expect(change!.source).toBe('doc4_reflection');
    expect(change!.opportunityId).toBe('opp1');
  });

  it('faceAmount は主契約(isMain) coverage から算出', () => {
    const before = mkPolicy({ coverages: [mkCoverage('c1', 1000000, true), mkCoverage('c2', 500000, false)] });
    const after = mkPolicy({ coverages: [mkCoverage('c1', 2000000, true), mkCoverage('c2', 500000, false)] });
    const change = buildValueChange(before, after, OPTS);
    expect(change!.fields).toHaveLength(1);
    expect(change!.fields[0]).toEqual({ field: 'faceAmount', before: 1000000, after: 2000000 });
  });

  it('副契約(isMain=false)のみの変更は faceAmount 差分に出ない', () => {
    const before = mkPolicy({ coverages: [mkCoverage('c1', 1000000, true), mkCoverage('c2', 500000, false)] });
    const after = mkPolicy({ coverages: [mkCoverage('c1', 1000000, true), mkCoverage('c2', 999999, false)] });
    expect(buildValueChange(before, after, OPTS)).toBeNull();
  });

  it('複数フィールド変更を全て差分化（変更フィールドのみ）', () => {
    const before = mkPolicy({ productName: '旧', insurer: 'A', status: 'pending' });
    const after = mkPolicy({ productName: '新', insurer: 'B', status: 'inforce' });
    const change = buildValueChange(before, after, OPTS);
    const fieldNames = change!.fields.map((f) => f.field).sort();
    expect(fieldNames).toEqual(['insurer', 'productName', 'status']);
  });

  it('主契約が無ければ faceAmount は null 同士で差分なし', () => {
    const before = mkPolicy({ coverages: [] });
    const after = mkPolicy({ coverages: [] });
    expect(buildValueChange(before, after, OPTS)).toBeNull();
  });

  it('source=manual を指定できる', () => {
    const before = mkPolicy({ monthlyPremium: 1000 });
    const after = mkPolicy({ monthlyPremium: 2000 });
    const change = buildValueChange(before, after, { ...OPTS, source: 'manual' });
    expect(change!.source).toBe('manual');
  });
});
