// newOpportunity3pane.household.test.ts — 新規案件作成（3ペイン）の世帯まわり（11/08 指示書 T3/T4/T5/T7/T10）
import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen, renderHook, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NewOpportunityPage } from '../pages/NewOpportunityPage';
import { useAppStore } from '../store';
import { createHouseholdWithHead } from '../utils/createHouseholdWithHead';
import {
  nextSelection,
  resolveInitialHouseholdId,
  useHouseholdSelection,
} from '../pages/NewOpportunityPage/useHouseholdSelection';
import { PersonInlineAddForm } from '../components/household/PersonInlineAddForm';
import { ProposalProductFormFields } from '../components/opportunity/ProposalProductFormFields';
import { emptyProposalProduct, validateProposalProduct } from '../components/opportunity/proposalProductMeta';

describe('T3 世帯の切替', () => {
  const s0 = { householdId: 'c1', pendingId: null };
  it('未選択・未入力なら即切替', () => {
    expect(nextSelection({ householdId: '', pendingId: null }, { type: 'request', id: 'c2' }, true).state.householdId).toBe('c2');
    const r = nextSelection(s0, { type: 'request', id: 'c2' }, false);
    expect(r.state).toEqual({ householdId: 'c2', pendingId: null });
    expect(r.switched).toBe(true);
    expect(r.reset).toBe(false);
  });
  it('同じ世帯を選んでも何もしない', () => {
    expect(nextSelection(s0, { type: 'request', id: 'c1' }, true).state).toBe(s0);
  });
  it('入力ありなら保留→確認で切替＋reset、取消で元の世帯が残る', () => {
    const pend = nextSelection(s0, { type: 'request', id: 'c2' }, true);
    expect(pend.state).toEqual({ householdId: 'c1', pendingId: 'c2' });
    const ok = nextSelection(pend.state, { type: 'confirm' }, true);
    expect(ok.state).toEqual({ householdId: 'c2', pendingId: null });
    expect(ok.reset).toBe(true);
    const ng = nextSelection(pend.state, { type: 'cancel' }, true);
    expect(ng.state).toEqual({ householdId: 'c1', pendingId: null });
    expect(ng.reset).toBe(false);
  });
  it('フック: 確認ダイアログの onConfirm→onClose 順でも切替が残り下書きが消える', () => {
    const resetDraft = vi.fn();
    const onSwitched = vi.fn();
    const { result } = renderHook(() => useHouseholdSelection({ initialId: 'c1', isDirty: true, resetDraft, onSwitched }));
    act(() => { result.current.requestSelect('c2'); });
    expect(result.current.pendingId).toBe('c2');
    act(() => { result.current.confirmSwitch(); result.current.cancelSwitch(); });
    expect(result.current.householdId).toBe('c2');
    expect(result.current.pendingId).toBeNull();
    expect(resetDraft).toHaveBeenCalledTimes(1);
    act(() => { result.current.requestSelect('c3'); });
    act(() => { result.current.cancelSwitch(); });
    expect(result.current.householdId).toBe('c2');
    expect(resetDraft).toHaveBeenCalledTimes(1);
  });
  it('フック: 新規登録した世帯は未入力なら即選択され justCreatedId が立つ', () => {
    const onSwitched = vi.fn();
    const { result } = renderHook(() => useHouseholdSelection({ initialId: '', isDirty: false, resetDraft: vi.fn(), onSwitched }));
    act(() => { result.current.selectCreated('new1'); });
    expect(result.current.householdId).toBe('new1');
    expect(result.current.justCreatedId).toBe('new1');
    expect(onSwitched).toHaveBeenCalledTimes(1);
  });
});

describe('T4/T5 createHouseholdWithHead', () => {
  const deps = () => {
    const s = useAppStore.getState();
    return { addCustomer: s.addCustomer, addPerson: s.addPerson, updateCustomer: s.updateCustomer };
  };
  const activeCount = () => useAppStore.getState().customers.filter(c => c.status === 'active').length;

  it.each([['individual'], ['corporate']] as const)('T4 区分 %s: 世帯 +1・世帯主 1 名・headPersonId', (type) => {
    const before = activeCount();
    const id = createHouseholdWithHead(deps(), { name: '  新規 太郎  ', type, primaryUserId: 'u1' });
    expect(id).toBeTruthy();
    expect(activeCount()).toBe(before + 1);
    const s = useAppStore.getState();
    const h = s.customers.find(c => c.id === id)!;
    expect(h.name).toBe('新規 太郎');
    expect(h.type).toBe(type);
    expect(h.area).toBe('');
    expect(h.primaryUserId).toBe('u1');
    const members = s.getPersonsByHousehold(id!);
    expect(members).toHaveLength(1);
    expect(members[0].relation).toBe('head');
    expect(members[0].name).toBe('新規 太郎');
    expect(h.headPersonId).toBe(members[0].id);
  });

  it('T5 空白だけの世帯名は失敗し、世帯も世帯員も増えない', () => {
    const s = useAppStore.getState();
    const before = { c: s.customers.length, p: s.persons.length };
    expect(createHouseholdWithHead(deps(), { name: '   ', type: 'individual', primaryUserId: 'u1' })).toBeNull();
    const after = useAppStore.getState();
    expect(after.customers.length).toBe(before.c);
    expect(after.persons.length).toBe(before.p);
  });
});

describe('T7 URL 初期選択', () => {
  const ids = ['c1', 'c2'];
  it('customerId／householdId があればその世帯', () => {
    expect(resolveInitialHouseholdId('c1', null, ids)).toBe('c1');
    expect(resolveInitialHouseholdId(undefined, 'c2', ids)).toBe('c2');
    expect(resolveInitialHouseholdId('c1', 'c2', ids)).toBe('c1');
  });
  it('無い・active に無い世帯は未選択', () => {
    expect(resolveInitialHouseholdId(undefined, null, ids)).toBe('');
    expect(resolveInitialHouseholdId('zz', null, ids)).toBe('');
  });
});

describe('T10 S1 共通部品の描画', () => {
  it('PersonInlineAddForm: 見出し・続柄 6 件（既定 配偶者）・ボタン', () => {
    render(createElement(PersonInlineAddForm, { householdId: 'h1', onDone: () => {} }));
    expect(screen.getByText('構成員を追加')).toBeTruthy();
    for (const label of ['世帯主', '配偶者', '子', '親', '兄弟姉妹', 'その他']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: '配偶者' }).className).toContain('blue');
    expect(screen.getByRole('button', { name: '世帯主' }).className).not.toContain('bg-blue');
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeTruthy();
    expect((screen.getByRole('button', { name: '追加する' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('PersonInlineAddForm: 見出しと続柄既定値を差し替えられる', () => {
    render(createElement(PersonInlineAddForm, { householdId: 'h1', title: '世帯員を追加', defaultRelation: 'child', onDone: () => {} }));
    expect(screen.getByText('世帯員を追加')).toBeTruthy();
    expect(screen.getByRole('button', { name: '子' }).className).toContain('blue');
  });
  it('ProposalProductFormFields: 7 ラベルと 3 つの検証文言', () => {
    render(createElement(ProposalProductFormFields, {
      value: emptyProposalProduct(), onChange: () => {}, householdId: 'h1', datalistId: 'dl-test',
      errors: validateProposalProduct(emptyProposalProduct()),
    }));
    for (const label of ['カテゴリ', '商品名', '保険会社', '被保険者', '月払', '保険金額', 'メモ']) {
      expect(screen.getAllByText(new RegExp(label)).length).toBeGreaterThan(0);
    }
    for (const msg of ['商品名は必須です', '保険会社は必須です', '月払額を入力してください']) {
      expect(screen.getByText(msg)).toBeTruthy();
    }
  });
});

describe('ページ結線（3ペイン）', () => {
  const renderPage = (path: string) =>
    render(
      createElement(MemoryRouter, { initialEntries: [path] },
        createElement(Routes, null,
          createElement(Route, { path: '/opportunities/new', element: createElement(NewOpportunityPage) }),
          createElement(Route, { path: '/households/:customerId/opportunities/new', element: createElement(NewOpportunityPage) }),
          createElement(Route, { path: '/opportunities/:id', element: createElement('div', null, 'DETAIL') }),
        ),
      ),
    );
  const disabledPanes = (c: HTMLElement) => c.querySelectorAll('[aria-disabled="true"]').length;

  it('世帯未選択では②③が無効、選ぶと有効になり、案件名で作成できる', () => {
    useAppStore.setState({ currentUserId: 'u1', currentRole: 'general' });
    const { container } = renderPage('/opportunities/new');
    expect(disabledPanes(container)).toBe(2);
    expect(screen.getByText('← 世帯を選ぶか、新規世帯を登録してください')).toBeTruthy();
    const create = screen.getByRole('button', { name: '作成する' }) as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    const first = useAppStore.getState().customers.find(c => c.status === 'active')!;
    fireEvent.click(container.querySelector(`[data-household-id="${first.id}"]`)!);
    expect(disabledPanes(container)).toBe(0);
    expect(create.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/案件名/), { target: { value: '結線テスト案件' } });
    expect(create.disabled).toBe(false);
    const before = useAppStore.getState().opportunities.length;
    fireEvent.click(create);
    expect(useAppStore.getState().opportunities.length).toBe(before + 1);
    expect(screen.getByText('DETAIL')).toBeTruthy();
  });

  it('URL の customerId で初期選択され、入力後の世帯切替は確認ダイアログが出る', () => {
    const act2 = useAppStore.getState().customers.filter(c => c.status === 'active');
    const { container } = renderPage(`/households/${act2[0].id}/opportunities/new`);
    expect(disabledPanes(container)).toBe(0);
    expect(container.querySelector(`[data-household-id="${act2[0].id}"]`)!.getAttribute('aria-pressed')).toBe('true');
    fireEvent.change(screen.getByLabelText(/案件名/), { target: { value: 'x' } });
    fireEvent.click(container.querySelector(`[data-household-id="${act2[1].id}"]`)!);
    expect(screen.getByText('世帯を切り替えますか？')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '切り替える' }));
    expect(container.querySelector(`[data-household-id="${act2[1].id}"]`)!.getAttribute('aria-pressed')).toBe('true');
    expect((screen.getByLabelText(/案件名/) as HTMLInputElement).value).toBe('');
  });
});
