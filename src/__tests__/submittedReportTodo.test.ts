/**
 * BUG-B: 提出済み日報の TODO は完全読み取り専用
 *
 * store の toggleTodo / updateTodo / deleteTodo が
 * submitted / confirmed ステータスの日報に対して no-op であることを検証する。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store';

beforeEach(() => {
  useAppStore.setState({
    reports: [],
    currentUserId: 'u_test',
  });
});

/** テスト用日報を作成して in_progress まで遷移し TODO を追加する */
function setupReport(date: string) {
  useAppStore.getState().createReport('u_test', date);
  const r0 = useAppStore.getState().reports.find(r => r.date === date)!;
  useAppStore.getState().confirmPlanning(r0.id);          // planning → in_progress
  useAppStore.getState().addTodo(r0.id, 'テスト TODO');
  return useAppStore.getState().reports.find(r => r.date === date)!;
}

// ── in_progress: 変更可能 ────────────────────────────────────────
describe('in_progress の日報: TODO 操作は有効', () => {
  it('toggleTodo が TODO ステータスを更新する', () => {
    const r = setupReport('2026-06-01');
    const todoId = r.todos[0].id;
    useAppStore.getState().toggleTodo(r.id, todoId);
    const updated = useAppStore.getState().reports.find(rep => rep.id === r.id)!;
    expect(updated.todos[0].status).toBe('doing');
  });

  it('updateTodo がテキストを更新する', () => {
    const r = setupReport('2026-06-01');
    const todoId = r.todos[0].id;
    useAppStore.getState().updateTodo(r.id, todoId, { text: '更新済み' });
    const updated = useAppStore.getState().reports.find(rep => rep.id === r.id)!;
    expect(updated.todos[0].text).toBe('更新済み');
  });

  it('deleteTodo が TODO を削除する', () => {
    const r = setupReport('2026-06-01');
    const todoId = r.todos[0].id;
    useAppStore.getState().deleteTodo(r.id, todoId);
    const updated = useAppStore.getState().reports.find(rep => rep.id === r.id)!;
    expect(updated.todos).toHaveLength(0);
  });
});

// ── submitted: no-op ─────────────────────────────────────────────
describe('submitted の日報: TODO 操作は no-op (BUG-B)', () => {
  it('toggleTodo は no-op', () => {
    const r = setupReport('2026-06-02');
    useAppStore.getState().submitReport(r.id);         // → submitted
    const submitted = useAppStore.getState().reports.find(rep => rep.id === r.id)!;
    const todoId = submitted.todos[0].id;
    const beforeStatus = submitted.todos[0].status;

    useAppStore.getState().toggleTodo(submitted.id, todoId);

    const after = useAppStore.getState().reports.find(rep => rep.id === r.id)!;
    expect(after.todos[0].status).toBe(beforeStatus);   // 変化なし
    expect(after.todos[0].completed).toBe(submitted.todos[0].completed);
  });

  it('updateTodo は no-op', () => {
    const r = setupReport('2026-06-02');
    useAppStore.getState().submitReport(r.id);
    const submitted = useAppStore.getState().reports.find(rep => rep.id === r.id)!;
    const todoId = submitted.todos[0].id;
    const originalText = submitted.todos[0].text;

    useAppStore.getState().updateTodo(submitted.id, todoId, { text: '書き換えNG' });

    const after = useAppStore.getState().reports.find(rep => rep.id === r.id)!;
    expect(after.todos[0].text).toBe(originalText);
  });

  it('deleteTodo は no-op', () => {
    const r = setupReport('2026-06-02');
    useAppStore.getState().submitReport(r.id);
    const submitted = useAppStore.getState().reports.find(rep => rep.id === r.id)!;
    const todoId = submitted.todos[0].id;

    useAppStore.getState().deleteTodo(submitted.id, todoId);

    const after = useAppStore.getState().reports.find(rep => rep.id === r.id)!;
    expect(after.todos).toHaveLength(1);   // 削除されない
  });
});

// ── confirmed: no-op ─────────────────────────────────────────────
describe('confirmed の日報: TODO 操作は no-op (BUG-B)', () => {
  it('toggleTodo は no-op', () => {
    const r = setupReport('2026-06-03');
    useAppStore.getState().submitReport(r.id);
    const s = useAppStore.getState().reports.find(rep => rep.id === r.id)!;
    useAppStore.getState().confirmReport(s.id);         // → confirmed
    const confirmed = useAppStore.getState().reports.find(rep => rep.id === r.id)!;
    const todoId = confirmed.todos[0].id;
    const beforeStatus = confirmed.todos[0].status;

    useAppStore.getState().toggleTodo(confirmed.id, todoId);

    const after = useAppStore.getState().reports.find(rep => rep.id === r.id)!;
    expect(after.todos[0].status).toBe(beforeStatus);
  });

  it('updateTodo は no-op', () => {
    const r = setupReport('2026-06-03');
    useAppStore.getState().submitReport(r.id);
    const s = useAppStore.getState().reports.find(rep => rep.id === r.id)!;
    useAppStore.getState().confirmReport(s.id);
    const confirmed = useAppStore.getState().reports.find(rep => rep.id === r.id)!;
    const todoId = confirmed.todos[0].id;
    const originalText = confirmed.todos[0].text;

    useAppStore.getState().updateTodo(confirmed.id, todoId, { text: '変更NG' });

    const after = useAppStore.getState().reports.find(rep => rep.id === r.id)!;
    expect(after.todos[0].text).toBe(originalText);
  });

  it('deleteTodo は no-op', () => {
    const r = setupReport('2026-06-03');
    useAppStore.getState().submitReport(r.id);
    const s = useAppStore.getState().reports.find(rep => rep.id === r.id)!;
    useAppStore.getState().confirmReport(s.id);
    const confirmed = useAppStore.getState().reports.find(rep => rep.id === r.id)!;
    const todoId = confirmed.todos[0].id;

    useAppStore.getState().deleteTodo(confirmed.id, todoId);

    const after = useAppStore.getState().reports.find(rep => rep.id === r.id)!;
    expect(after.todos).toHaveLength(1);
  });
});
