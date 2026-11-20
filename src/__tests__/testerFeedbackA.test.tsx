import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { DateInput } from '../components/common/DateInput';
import { DATE_MAX, DATE_MIN, validateDateValue } from '../utils/dateInput';
import { isNextActionOverdue } from '../utils/nextActionOverdue';
import { parseAnnualIncome } from '../utils/annualIncome';
import { createHouseholdWithHead } from '../utils/createHouseholdWithHead';
import { stickyCellBg } from '../utils/stickyCellBg';
import { emptyProposalProduct, validateProposalProduct } from '../components/opportunity/proposalProductMeta';

describe('A1: date 入力の範囲検証', () => {
  it('validateDateValue', () => {
    expect(validateDateValue('')).toBeNull();
    expect(validateDateValue('2026-11-20')).toBeNull();
    expect(validateDateValue('0001-01-01')).toContain(DATE_MIN);
    expect(validateDateValue('9999-12-31')).toContain(DATE_MAX);
    expect(validateDateValue('2026-02-30')).not.toBeNull();
    expect(validateDateValue('', true)).not.toBeNull();
  });
  it('DateInput は min/max を持ち、範囲外は親へ流さずエラー表示', () => {
    const onChange = vi.fn();
    function Host() {
      const [v, setV] = useState('2026-01-01');
      return <DateInput aria-label="d" value={v} onChange={(e) => { setV(e.target.value); onChange(e.target.value); }} />;
    }
    render(<Host />);
    const input = screen.getByLabelText('d') as HTMLInputElement;
    expect(input.min).toBe(DATE_MIN);
    expect(input.max).toBe(DATE_MAX);
    fireEvent.change(input, { target: { value: '0001-01-01' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('範囲');
    fireEvent.change(input, { target: { value: '2027-05-05' } });
    expect(onChange).toHaveBeenCalledWith('2027-05-05');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('A3: sticky 契約者列は不透明背景', () => {
  it('どの状態でも透過でない', () => {
    for (const v of [{ expired: false, near: false }, { expired: true, near: false }, { expired: false, near: true }]) {
      expect(stickyCellBg(v)).toMatch(/^bg-(white|red-50|orange-50)$/);
    }
  });
});

describe('A4: 月払額 0 以下', () => {
  it('0 と負数でエラー文言', () => {
    for (const n of [0, -1]) {
      const e = validateProposalProduct({ ...emptyProposalProduct(), productName: 'a', insurer: 'b', monthlyPremium: n });
      expect(e.monthlyPremium).toBe('0より大きい金額を入力してください');
    }
    expect(validateProposalProduct({ ...emptyProposalProduct(), productName: 'a', insurer: 'b', monthlyPremium: 1 }).monthlyPremium).toBeUndefined();
  });
});

describe('A5: 次アクション期限超過', () => {
  const now = new Date(2026, 10, 20, 12, 0);
  it('今日より前のみ true', () => {
    expect(isNextActionOverdue('2026-11-19', now)).toBe(true);
    expect(isNextActionOverdue('2026-11-20', now)).toBe(false);
    expect(isNextActionOverdue('2026-11-21', now)).toBe(false);
    expect(isNextActionOverdue(undefined, now)).toBe(false);
  });
});

describe('B6: 世帯主年収', () => {
  it('parseAnnualIncome', () => {
    expect(parseAnnualIncome('')).toEqual({});
    expect(parseAnnualIncome('500')).toEqual({ value: 500 });
    expect(parseAnnualIncome('-1').error).toBeTruthy();
    expect(parseAnnualIncome('abc').error).toBeTruthy();
  });
  it('世帯作成時に世帯主へ年収を渡す', () => {
    const addPerson = vi.fn(() => ({ id: 'p1' }));
    const deps = {
      addCustomer: vi.fn(() => ({ id: 'h1' })),
      addPerson,
      updateCustomer: vi.fn(),
    } as unknown as Parameters<typeof createHouseholdWithHead>[0];
    createHouseholdWithHead(deps, { name: '山田', type: 'individual' as never, primaryUserId: 'u', annualIncome: 600 });
    expect(addPerson).toHaveBeenCalledWith('h1', expect.objectContaining({ relation: 'head', annualIncome: 600 }));
  });
});
