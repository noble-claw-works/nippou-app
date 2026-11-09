// newOpportunity3pane.draft.test.ts — 新規案件作成（3ペイン）の下書き・作成値（11/08 指示書 T1/T2/T6/T8/T9）
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '../store';
import type { ProposalProduct } from '../types';
import {
  makeInitialDraft,
  isDraftDirty,
  validateDraft,
  buildOpportunityInput,
  sumMonthlyPremium,
  formatMonthlyTotal,
  resolveDefaultOwnerId,
  toggleIn,
  type OpportunityDraft,
} from '../pages/NewOpportunityPage/newOpportunityDraft';
import { useNewOpportunityDraft } from '../pages/NewOpportunityPage/useNewOpportunityDraft';

const P1: ProposalProduct = { id: 'pp1', productCategory: 'life', productName: '収入保障', insurer: 'ソニー生命', insuredPersonId: 'p1', monthlyPremium: 4800, memo: '' };
const P2: ProposalProduct = { id: 'pp2', productCategory: 'medical', productName: '医療保険', insurer: 'アフラック', insuredPersonId: 'p2', monthlyPremium: 3200, memo: '' };

describe('T1 isDraftDirty', () => {
  const base = makeInitialDraft('u1');
  it('初期値では false', () => {
    expect(isDraftDirty(base)).toBe(false);
  });
  const cases: [string, Partial<OpportunityDraft>][] = [
    ['案件名', { title: '見直し' }],
    ['対象者', { targetPersonIds: ['p1'] }],
    ['確度', { confidence: 'A' as OpportunityDraft['confidence'] }],
    ['検討カテゴリ', { categories: ['life'] }],
    ['提案商品', { proposalProducts: [P1] }],
    ['メモ', { memo: 'メモ' }],
  ];
  it.each(cases)('%s を変えると true', (_label, patch) => {
    expect(isDraftDirty({ ...base, ...patch })).toBe(true);
  });
  it('担当者・初期ステージだけ変えても false', () => {
    expect(isDraftDirty({ ...base, ownerId: 'u2', stage: 'proposal' })).toBe(false);
  });
  it('空白だけの案件名・メモは未入力扱い', () => {
    expect(isDraftDirty({ ...base, title: '  ', memo: ' ' })).toBe(false);
  });
});

describe('T2 reset', () => {
  it('全項目が初期値（担当者=既定担当）に戻り提案商品が 0 件になる', () => {
    const { result } = renderHook(() => useNewOpportunityDraft('u1'));
    act(() => {
      result.current.update({ title: 'x', ownerId: 'u2', stage: 'proposal', proposalProducts: [P1, P2], memo: 'm', categories: ['life'], targetPersonIds: ['p1'] });
      result.current.setError('案件名は必須です');
    });
    expect(result.current.isDirty).toBe(true);
    act(() => { result.current.reset(); });
    expect(result.current.draft).toEqual(makeInitialDraft('u1'));
    expect(result.current.draft.proposalProducts).toHaveLength(0);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.error).toBe('');
  });
  it('既定担当: ログインユーザーが一覧にいればその人、いなければ先頭', () => {
    expect(resolveDefaultOwnerId('u2', [{ id: 'u1' }, { id: 'u2' }])).toBe('u2');
    expect(resolveDefaultOwnerId('zz', [{ id: 'u1' }, { id: 'u2' }])).toBe('u1');
    expect(resolveDefaultOwnerId('zz', [])).toBe('zz');
  });
});

describe('T6 合計月払', () => {
  it('4,800＋3,200 → 8,000', () => {
    expect(sumMonthlyPremium([P1, P2])).toBe(8000);
    expect(formatMonthlyTotal(sumMonthlyPremium([P1, P2]))).toBe('合計月払 ¥8,000 / 月');
  });
  it('0 件 → 0', () => {
    expect(sumMonthlyPremium([])).toBe(0);
    expect(formatMonthlyTotal(0)).toBe('合計月払 ¥0 / 月');
  });
  it('toggleIn は足し引きする', () => {
    expect(toggleIn(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleIn(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('T8 作成', () => {
  beforeEach(() => {
    useAppStore.setState({ opportunities: [], currentUserId: 'u1', currentRole: 'general' });
  });
  it('案件名・担当者・世帯が空なら作成しない', () => {
    const d = makeInitialDraft('u1');
    expect(validateDraft(d, 'c1')).toBe('案件名は必須です');
    expect(validateDraft({ ...d, title: '見直し', ownerId: '' }, 'c1')).toBe('担当者は必須です');
    expect(validateDraft({ ...d, title: '見直し' }, '')).toBe('世帯を選択してください');
    expect(validateDraft({ ...d, title: '見直し' }, 'c1')).toBeNull();
  });
  it('そろえば addOpportunity に提案商品とカテゴリが渡り新 ID が返る', () => {
    const d: OpportunityDraft = { ...makeInitialDraft('u2'), title: ' 田中家 見直し ', categories: ['life'], proposalProducts: [P1, P2], targetPersonIds: ['p1'] };
    const opp = useAppStore.getState().addOpportunity(buildOpportunityInput(d, 'c1'));
    expect(opp.id).toBeTruthy();
    const saved = useAppStore.getState().opportunities.find(o => o.id === opp.id)!;
    expect(saved.title).toBe('田中家 見直し');
    expect(saved.ownerId).toBe('u2');
    expect(saved.householdId).toBe('c1');
    expect(saved.proposalProducts).toHaveLength(2);
    expect(saved.productCategories).toEqual(['life', 'medical']);
    expect(saved.targetPersonIds).toEqual(['p1']);
  });
});

describe('T9 作成値の形', () => {
  it('カテゴリは検討カテゴリ＋提案商品カテゴリの重複なし和集合', () => {
    const d: OpportunityDraft = { ...makeInitialDraft('u1'), title: 't', categories: ['medical', 'life'], proposalProducts: [P1, P2] };
    expect(buildOpportunityInput(d, 'c1').productCategories).toEqual(['medical', 'life']);
  });
  it('確度が空なら confidence キー自体を持たない／ありなら渡す', () => {
    const d = { ...makeInitialDraft('u1'), title: 't' };
    expect('confidence' in buildOpportunityInput(d, 'c1')).toBe(false);
    const withConf = buildOpportunityInput({ ...d, confidence: 'A' as OpportunityDraft['confidence'] }, 'c1');
    expect(withConf.confidence).toBe('A');
  });
  it('固定値（open・未実施・tags 空）と前後空白除去', () => {
    const v = buildOpportunityInput({ ...makeInitialDraft('u1'), title: ' t ', memo: ' m ' }, 'c1');
    expect(v).toMatchObject({ status: 'open', needsAnalysisDone: false, illustrationProvided: false, tags: [], title: 't', memo: 'm', stage: 'approach' });
  });
});
