import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OverviewTab } from '../pages/OpportunityDetailPage/OverviewTab';
import { useAppStore } from '../store';
import type { Opportunity } from '../types';

const channels = [
  { id: 'p1', name: '紹介', parentId: null, isActive: true, order: 1 },
  { id: 'c1', name: '住宅会社A', parentId: 'p1', isActive: true, order: 1 },
];

function baseOpp(channelId?: string): Opportunity {
  const any = (useAppStore.getState().opportunities ?? [])[0] as Opportunity;
  return { ...any, id: 'opp-x', channelId } as Opportunity;
}

const noop = () => {};

describe('案件詳細 基本情報: チャネル', () => {
  beforeEach(() => {
    useAppStore.setState({ salesChannels: channels } as never);
  });
  it('表示モードでチャネル名(親 / 子)を出す', () => {
    render(<OverviewTab opp={baseOpp('c1')} editingFields={false} fieldDraft={{}} onToggleEdit={noop} onSaveFields={noop} onFieldDraftChange={noop} onUpdateOpportunity={noop} />);
    expect(screen.getByTestId('opp-channel').textContent).toBe('紹介 / 住宅会社A');
  });
  it('未設定は — を出す', () => {
    render(<OverviewTab opp={baseOpp(undefined)} editingFields={false} fieldDraft={{}} onToggleEdit={noop} onSaveFields={noop} onFieldDraftChange={noop} onUpdateOpportunity={noop} />);
    expect(screen.getByTestId('opp-channel').textContent).toBe('—');
  });
  it('編集モードでチャネル選択(select)を出し、現在値を選択済みにする', () => {
    render(<OverviewTab opp={baseOpp('c1')} editingFields={true} fieldDraft={{ channelId: 'c1' }} onToggleEdit={noop} onSaveFields={noop} onFieldDraftChange={noop} onUpdateOpportunity={noop} />);
    expect(screen.queryByTestId('opp-channel')).toBeNull();
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(selects.some((s) => s.value === 'p1')).toBe(true);
    expect(selects.some((s) => s.value === 'c1')).toBe(true);
  });
});
