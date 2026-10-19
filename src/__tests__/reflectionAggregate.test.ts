import { describe, it, expect } from 'vitest';
import {
  sumMonthlyPremium,
  toAnnual,
  diffReflection,
} from '../utils/reflectionAggregate';
import type { Policy } from '../types';

function mkPolicy(id: string, monthlyPremium: number, status: Policy['status']): Policy {
  return {
    id,
    householdId: 'h1',
    ownerId: 'u1',
    contractorPersonId: 'p1',
    insuredPersonIds: ['p1'],
    insurer: 'X生命',
    productName: 'テスト保険',
    productCategory: 'life',
    status,
    startDate: '2026-01-01',
    monthlyPremium,
    payMode: 'monthly',
    hasCashValue: false,
    coverages: [],
    tags: [],
    memo: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('sumMonthlyPremium', () => {
  it('confirmed は pending(申込中) を除外', () => {
    const policies = [
      mkPolicy('a', 1000, 'inforce'),
      mkPolicy('b', 2000, 'pending'),
      mkPolicy('c', 500, 'inforce'),
    ];
    expect(sumMonthlyPremium(policies, 'confirmed')).toBe(1500);
  });
  it('projected は pending も含む', () => {
    const policies = [
      mkPolicy('a', 1000, 'inforce'),
      mkPolicy('b', 2000, 'pending'),
    ];
    expect(sumMonthlyPremium(policies, 'projected')).toBe(3000);
  });
  it('空配列は 0', () => {
    expect(sumMonthlyPremium([], 'confirmed')).toBe(0);
    expect(sumMonthlyPremium([], 'projected')).toBe(0);
  });
});

describe('toAnnual', () => {
  it('月払 × 12', () => {
    expect(toAnnual(1000)).toBe(12000);
    expect(toAnnual(0)).toBe(0);
  });
});

describe('diffReflection', () => {
  it('after − before を件数/月払/年換算で返す（confirmed）', () => {
    const before = [mkPolicy('a', 1000, 'inforce')];
    const after = [
      mkPolicy('a', 1000, 'inforce'),
      mkPolicy('b', 500, 'inforce'),
    ];
    const d = diffReflection(before, after, 'confirmed');
    expect(d.count).toBe(1);
    expect(d.monthly).toBe(500);
    expect(d.annual).toBe(6000);
  });
  it('confirmed は pending を差分母集団から除外', () => {
    const before: Policy[] = [];
    const after = [mkPolicy('b', 2000, 'pending')];
    const d = diffReflection(before, after, 'confirmed');
    expect(d.count).toBe(0); // pending は confirmed に数えない
    expect(d.monthly).toBe(0);
    expect(d.annual).toBe(0);
  });
  it('projected は pending を含めて差分', () => {
    const before: Policy[] = [];
    const after = [mkPolicy('b', 2000, 'pending')];
    const d = diffReflection(before, after, 'projected');
    expect(d.count).toBe(1);
    expect(d.monthly).toBe(2000);
    expect(d.annual).toBe(24000);
  });
});
