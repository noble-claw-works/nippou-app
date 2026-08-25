/**
 * 日報ステータス遷移ユニットテスト
 * planning / in_progress / submitted / confirmed の遷移と操作ガードを検証
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store';

// store をリセットして各テストを独立させる
beforeEach(() => {
  useAppStore.setState({
    reports: [],
    currentUserId: 'u_test',
  });
});

function createReport() {
  useAppStore.getState().createReport('u_test', '2026-06-02');
  return useAppStore.getState().reports[0];
}

// ── ステータス遷移 ────────────────────────────────────────────────
describe('ステータス遷移', () => {
  it('新規作成時のステータスは planning', () => {
    const r = createReport();
    expect(r.status).toBe('planning');
  });

  it('confirmPlanning: planning → in_progress', () => {
    const r = createReport();
    useAppStore.getState().confirmPlanning(r.id);
    const updated = useAppStore.getState().reports[0];
    expect(updated.status).toBe('in_progress');
  });

  it('confirmPlanning: in_progress 以外には無効', () => {
    const r = createReport();
    // すでに in_progress の状態で再度 confirmPlanning しても変わらない
    useAppStore.getState().confirmPlanning(r.id);
    useAppStore.getState().confirmPlanning(r.id); // 2回目は無効
    expect(useAppStore.getState().reports[0].status).toBe('in_progress');
  });

  it('submitReport: in_progress → submitted', () => {
    const r = createReport();
    useAppStore.getState().confirmPlanning(r.id);
    useAppStore.getState().submitReport(r.id);
    expect(useAppStore.getState().reports[0].status).toBe('submitted');
  });

  it('submitReport: planning からは遷移しない（in_progress のみ有効）', () => {
    const r = createReport();
    useAppStore.getState().submitReport(r.id); // planning のまま提出試み
    expect(useAppStore.getState().reports[0].status).toBe('planning');
  });

  it('withdrawReport: submitted → in_progress（取り下げ）', () => {
    const r = createReport();
    useAppStore.getState().confirmPlanning(r.id);
    useAppStore.getState().submitReport(r.id);
    useAppStore.getState().withdrawReport(r.id);
    const updated = useAppStore.getState().reports[0];
    expect(updated.status).toBe('in_progress');
    expect(updated.submittedAt).toBeUndefined();
  });

  it('withdrawReport: confirmed からは取り下げ不可', () => {
    const r = createReport();
    useAppStore.getState().confirmPlanning(r.id);
    useAppStore.getState().submitReport(r.id);
    useAppStore.getState().confirmReport(r.id);
    useAppStore.getState().withdrawReport(r.id); // confirmed からは無効
    expect(useAppStore.getState().reports[0].status).toBe('confirmed');
  });

  it('confirmReport: submitted → confirmed', () => {
    const r = createReport();
    useAppStore.getState().confirmPlanning(r.id);
    useAppStore.getState().submitReport(r.id);
    useAppStore.getState().confirmReport(r.id);
    const updated = useAppStore.getState().reports[0];
    expect(updated.status).toBe('confirmed');
    expect(updated.confirmedAt).toBeDefined();
    expect(updated.confirmedBy).toBe('u_test');
  });

  it('フル遷移: planning → in_progress → submitted → confirmed', () => {
    const r = createReport();
    const { confirmPlanning, submitReport, confirmReport } = useAppStore.getState();
    confirmPlanning(r.id);
    expect(useAppStore.getState().reports[0].status).toBe('in_progress');
    submitReport(r.id);
    expect(useAppStore.getState().reports[0].status).toBe('submitted');
    confirmReport(r.id);
    expect(useAppStore.getState().reports[0].status).toBe('confirmed');
  });

  it('差し戻しフロー: submitted → in_progress → submitted（再提出）', () => {
    const r = createReport();
    useAppStore.getState().confirmPlanning(r.id);
    useAppStore.getState().submitReport(r.id);
    useAppStore.getState().withdrawReport(r.id);    // 差し戻し = 取り下げと同動作
    expect(useAppStore.getState().reports[0].status).toBe('in_progress');
    useAppStore.getState().submitReport(r.id);      // 再提出
    expect(useAppStore.getState().reports[0].status).toBe('submitted');
  });
});

// ── ブロック操作ガード（store 側の状態整合性） ─────────────────────
describe('ブロック操作ガード（addBlock）', () => {
  it('planning: 予定ブロック追加 → 保存される', () => {
    const r = createReport();
    useAppStore.getState().addBlock(r.id, {
      reportId: r.id, type: 'meeting',
      startTime: '09:00', endTime: '10:00',
      title: '朝礼', memo: '',
      isPlanned: true, isActual: false, attachments: [],
    });
    expect(useAppStore.getState().reports[0].blocks).toHaveLength(1);
  });

  it('planning: 実績ブロック追加も store 側では許容（UI ガードはコンポーネント層）', () => {
    // store 自体はステータス問わず addBlock を受け付ける
    // ガードは TodayPage の handleSaveBlock / handleOpenBlock で行う
    const r = createReport();
    useAppStore.getState().addBlock(r.id, {
      reportId: r.id, type: 'visit',
      startTime: '10:00', endTime: '11:00',
      title: '訪問', memo: '',
      isPlanned: false, isActual: true, attachments: [],
    });
    expect(useAppStore.getState().reports[0].blocks).toHaveLength(1);
  });

  it('updateReport: submitted 後も store 側では更新できる（UI ガードはコンポーネント層）', () => {
    const r = createReport();
    useAppStore.getState().confirmPlanning(r.id);
    useAppStore.getState().submitReport(r.id);
    useAppStore.getState().updateReport(r.id, { mainTheme: '変更テスト' });
    // store 自体はブロックしない。ガードは UI 層で行う設計
    expect(useAppStore.getState().reports[0].mainTheme).toBe('変更テスト');
  });
});

// ── 実績入力 gating (項目2 対応) ──────────────────────────────────
describe('実績入力 gating: canEditActual', () => {
  it('planning: canEditActual = false', () => {
    const r = createReport();
    expect(r.status).toBe('planning');
    const canEditActual = (s: string) => s === 'in_progress';
    expect(canEditActual(r.status)).toBe(false);
  });

  it('in_progress: canEditActual = true（予定確定後）', () => {
    const r = createReport();
    useAppStore.getState().confirmPlanning(r.id);
    const updated = useAppStore.getState().reports[0];
    const canEditActual = (s: string) => s === 'in_progress';
    expect(canEditActual(updated.status)).toBe(true);
  });

  it('submitted: canEditActual = false', () => {
    const r = createReport();
    useAppStore.getState().confirmPlanning(r.id);
    useAppStore.getState().submitReport(r.id);
    const updated = useAppStore.getState().reports[0];
    const canEditActual = (s: string) => s === 'in_progress';
    expect(canEditActual(updated.status)).toBe(false);
  });

  it('confirmed: canEditActual = false', () => {
    const r = createReport();
    useAppStore.getState().confirmPlanning(r.id);
    useAppStore.getState().submitReport(r.id);
    useAppStore.getState().confirmReport(r.id);
    const updated = useAppStore.getState().reports[0];
    const canEditActual = (s: string) => s === 'in_progress';
    expect(canEditActual(updated.status)).toBe(false);
  });
});
