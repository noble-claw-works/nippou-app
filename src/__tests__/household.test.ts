// household.test.ts — Household 型 / アクション テスト (Phase 1)
import { describe, it, expect } from 'vitest';
import type { Customer, Household } from '../types';

describe('Household 型互換性', () => {
  it('Customer は Household の alias として代入可能', () => {
    const h: Household = {
      id: 'h1',
      name: 'テスト家',
      type: 'individual',
      area: '東京',
      primaryUserId: 'u1',
      familyMemo: '',
      tags: [],
      memo: '',
      status: 'active',
    };
    // Customer alias として扱える
    const c: Customer = h;
    expect(c.id).toBe('h1');
    expect(c.name).toBe('テスト家');
  });

  it('Household に familyMemo フィールドがある', () => {
    const h: Household = {
      id: 'h2',
      name: '田中家',
      type: 'individual',
      area: '袋井',
      primaryUserId: 'u1',
      familyMemo: '夫婦+子2名',
      tags: ['生命保険'],
      memo: '',
      status: 'active',
    };
    expect(h.familyMemo).toBe('夫婦+子2名');
  });

  it('Household に headPersonId フィールドがある (optional)', () => {
    const h: Household = {
      id: 'h3',
      name: '鈴木家',
      type: 'individual',
      area: '磐田',
      primaryUserId: 'u1',
      headPersonId: 'p_h3_head',
      familyMemo: '',
      tags: [],
      memo: '',
      status: 'active',
    };
    expect(h.headPersonId).toBe('p_h3_head');
  });
});
