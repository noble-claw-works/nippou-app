/**
 * BUG-B UI レベル保護テスト
 *
 * 既存の submittedReportTodo.test.ts は store 層 (toggleTodo / updateTodo / deleteTodo)
 * の no-op を担保するが、UI 層では依然としてチェックボックスがクリック可能・
 * カーソル pointer のままユーザに「変更できた」錯覚を与える状態だった。
 *
 * このテストは SidePanelCards (TodoCard) の UI レベルで:
 *   - report.status='submitted'/'confirmed' → onToggleTodo / onAddTodo / onDeleteTodo
 *     が一切呼ばれない
 *   - チェックボックスが disabled かつ aria-disabled
 *   - ＋ボタンが非表示
 *   - 🔒 読み取り専用バッジが表示される
 * を検証する。
 *
 * 鳳凰殿 BUG-B (P0) 指摘対応 / 過去データ改ざん相当の経路封鎖。
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SidePanelCards } from '../components/today/SidePanelCards';
import type { DailyReport, Customer, ReportStatus, Todo } from '../types';

function makeTodo(id: string, text: string, status: Todo['status'] = 'todo', dueDate?: string): Todo {
  return {
    id, reportId: 'r1', text, completed: status === 'done', status,
    rolledOver: false, priority: 'medium',
    ...(dueDate ? { dueDate } : {}),
  };
}

function makeReport(status: ReportStatus, todos: Todo[]): DailyReport {
  return {
    id: 'r1', userId: 'u1', date: '2026-06-04', status,
    mainTheme: '', monthlyTheme: '', dailyTheme: '',
    blocks: [], todos, customerVisits: [],
    gratitude: ['', '', ''], morningMood: null, eveningMood: null,
    managerSignal: null, selfComment: '', comments: [], attachments: [],
    submitted: status === 'submitted' || status === 'confirmed',
    createdAt: '2026-06-04T00:00:00Z', updatedAt: '2026-06-04T00:00:00Z',
  };
}

function renderWith(status: ReportStatus) {
  const todos = [
    makeTodo('t1', 'テスト TODO 未完', 'todo'),
    makeTodo('t2', 'テスト TODO 進行中', 'doing'),
    makeTodo('t3', 'テスト TODO 完了', 'done'),
  ];
  const report = makeReport(status, todos);
  const customers: Customer[] = [];
  const onToggleTodo = vi.fn();
  const onAddTodo = vi.fn();
  const onDeleteTodo = vi.fn();
  const onUpdateReport = vi.fn();

  const utils = render(
    <MemoryRouter>
      <SidePanelCards
        report={report}
        customers={customers}
        onUpdateReport={onUpdateReport}
        onAddTodo={onAddTodo}
        onToggleTodo={onToggleTodo}
        onDeleteTodo={onDeleteTodo}
      />
    </MemoryRouter>,
  );
  return { ...utils, onToggleTodo, onAddTodo, onDeleteTodo, onUpdateReport };
}

// title 属性ベースで TODO チェックボックス button を抽出するヘルパ
function findTodoToggleButtons(readOnly: boolean): HTMLButtonElement[] {
  const titleMatcher = readOnly
    ? '提出済み日報の TODO は変更できません'
    : 'クリックで todo → doing → done を巡回';
  return Array.from(document.querySelectorAll<HTMLButtonElement>(`button[title="${titleMatcher}"]`));
}

describe('BUG-B: TodoCard UI 層が submitted/confirmed で読み取り専用', () => {
  describe('status=submitted', () => {
    it('TODO チェックボックスが disabled かつ aria-disabled=true', () => {
      renderWith('submitted');
      const buttons = findTodoToggleButtons(true);
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach(btn => {
        expect(btn.disabled).toBe(true);
        expect(btn.getAttribute('aria-disabled')).toBe('true');
      });
    });

    it('チェックボックスをクリックしても onToggleTodo が呼ばれない', () => {
      const { onToggleTodo } = renderWith('submitted');
      const buttons = findTodoToggleButtons(true);
      buttons.forEach(btn => fireEvent.click(btn));
      expect(onToggleTodo).not.toHaveBeenCalled();
    });

    it('🔒 読み取り専用バッジが表示される', () => {
      renderWith('submitted');
      expect(screen.getByText(/🔒 読み取り専用/)).toBeTruthy();
    });

    it('TODO 追加ボタン（＋）が非表示で onAddTodo が呼ばれない', () => {
      const { onAddTodo } = renderWith('submitted');
      // ＋ボタンは title="TODO を追加" で識別
      const addButton = screen.queryByTitle('TODO を追加');
      expect(addButton).toBeNull();
      expect(onAddTodo).not.toHaveBeenCalled();
    });

    it('削除ボタン (X) が DOM 上に存在しない', () => {
      renderWith('submitted');
      // X アイコンを持つ削除ボタンは hover で opacity-100 になるが、isReadOnly では描画自体されない
      const deleteButtons = document.querySelectorAll('button.opacity-0.group-hover\\:opacity-100');
      expect(deleteButtons.length).toBe(0);
    });
  });

  describe('status=confirmed', () => {
    it('TODO チェックボックスが disabled', () => {
      renderWith('confirmed');
      const buttons = findTodoToggleButtons(true);
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach(btn => {
        expect(btn.disabled).toBe(true);
      });
    });

    it('クリックしても onToggleTodo / onDeleteTodo が呼ばれない', () => {
      const { onToggleTodo, onDeleteTodo } = renderWith('confirmed');
      const buttons = findTodoToggleButtons(true);
      buttons.forEach(btn => fireEvent.click(btn));
      expect(onToggleTodo).not.toHaveBeenCalled();
      expect(onDeleteTodo).not.toHaveBeenCalled();
    });
  });

  describe('status=planning (対照: 編集可能)', () => {
    it('TODO チェックボックスが enabled', () => {
      renderWith('planning');
      const buttons = findTodoToggleButtons(false);
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach(btn => {
        expect(btn.disabled).toBe(false);
      });
    });

    it('チェックボックスクリックで onToggleTodo が呼ばれる', () => {
      const { onToggleTodo } = renderWith('planning');
      const buttons = findTodoToggleButtons(false);
      fireEvent.click(buttons[0]);
      expect(onToggleTodo).toHaveBeenCalledTimes(1);
    });

    it('TODO 追加ボタン (＋) が表示される', () => {
      renderWith('planning');
      const addButton = screen.queryByTitle('TODO を追加');
      expect(addButton).not.toBeNull();
    });

    it('🔒 読み取り専用バッジが表示されない', () => {
      renderWith('planning');
      expect(screen.queryByText(/🔒 読み取り専用/)).toBeNull();
    });
  });

  describe('status=in_progress (対照: 編集可能)', () => {
    it('チェックボックスが enabled で onToggleTodo が呼ばれる', () => {
      const { onToggleTodo } = renderWith('in_progress');
      const buttons = findTodoToggleButtons(false);
      expect(buttons.length).toBeGreaterThan(0);
      fireEvent.click(buttons[0]);
      expect(onToggleTodo).toHaveBeenCalledTimes(1);
    });
  });
});

// ─── BUG-B 残存: 期限切れ TODO の UI 保護テスト ────────────────────────────────
describe('BUG-B 残存: 期限切れ TODO は status=planning でも読み取り専用', () => {
  const PAST_DATE = '2026-06-01'; // 確実に過去
  const TODAY_DATE = new Date().toISOString().split('T')[0];

  function renderWithOverdueTodo(reportStatus: ReportStatus) {
    const todos = [
      makeTodo('t-overdue', '法人アポ取り', 'todo', PAST_DATE),  // 期限切れ
      makeTodo('t-today', '今日期限タスク', 'todo', TODAY_DATE),  // 今日期限 (変更可)
      makeTodo('t-nodue', '期限なしタスク', 'todo'),              // 期限なし (変更可)
    ];
    const report = makeReport(reportStatus, todos);
    const onToggleTodo = vi.fn();
    const onAddTodo = vi.fn();
    const onDeleteTodo = vi.fn();
    const onUpdateReport = vi.fn();

    render(
      <MemoryRouter>
        <SidePanelCards
          report={report}
          customers={[]}
          onUpdateReport={onUpdateReport}
          onAddTodo={onAddTodo}
          onToggleTodo={onToggleTodo}
          onDeleteTodo={onDeleteTodo}
        />
      </MemoryRouter>,
    );
    return { onToggleTodo, onAddTodo, onDeleteTodo };
  }

  it('期限切れ TODO チェックボックスは disabled かつ aria-disabled=true', () => {
    renderWithOverdueTodo('planning');
    // 期限切れ TODO は「期限切れの TODO は変更できません」というタイトルを持つ
    const overdueBtn = document.querySelector<HTMLButtonElement>(
      'button[title="期限切れの TODO は変更できません"]',
    );
    expect(overdueBtn).not.toBeNull();
    expect(overdueBtn!.disabled).toBe(true);
    expect(overdueBtn!.getAttribute('aria-disabled')).toBe('true');
  });

  it('期限切れ TODO をクリックしても onToggleTodo が呼ばれない', () => {
    const { onToggleTodo } = renderWithOverdueTodo('planning');
    const overdueBtn = document.querySelector<HTMLButtonElement>(
      'button[title="期限切れの TODO は変更できません"]',
    );
    expect(overdueBtn).not.toBeNull();
    fireEvent.click(overdueBtn!);
    expect(onToggleTodo).not.toHaveBeenCalled();
  });

  it('今日期限の TODO は変更可能 (status=planning)', () => {
    const { onToggleTodo } = renderWithOverdueTodo('planning');
    // 今日期限のボタンは「クリックで todo → doing → done を巡回」というタイトル
    const todayBtns = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button[title="クリックで todo → doing → done を巡回"]'),
    );
    expect(todayBtns.length).toBeGreaterThan(0);
    fireEvent.click(todayBtns[0]);
    expect(onToggleTodo).toHaveBeenCalledTimes(1);
  });

  it('status=in_progress でも期限切れ TODO は変更不可', () => {
    const { onToggleTodo } = renderWithOverdueTodo('in_progress');
    const overdueBtn = document.querySelector<HTMLButtonElement>(
      'button[title="期限切れの TODO は変更できません"]',
    );
    expect(overdueBtn).not.toBeNull();
    expect(overdueBtn!.disabled).toBe(true);
    fireEvent.click(overdueBtn!);
    expect(onToggleTodo).not.toHaveBeenCalled();
  });
});
