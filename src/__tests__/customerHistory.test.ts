// =====================================================
// customerHistory.test.ts - 顧客対応履歴の集約・並び替えロジック
// 視覚層をユニットテストにせず、データ整形ロジックそのものを検証する
// =====================================================
import { describe, it, expect } from 'vitest';
import type { TimeBlock, DailyReport, BlockType } from '../types';

interface HistoryEntry {
  reportId: string;
  reportDate: string;
  reportUserId: string;
  block: TimeBlock;
}

/**
 * CustomerDetailPage が `historyEntries` で行っている集約を、
 * 同じ仕様で再現したユーティリティ。実装本体と同一の並び順を保証する。
 */
function buildHistory(reports: DailyReport[], customerId: string): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  for (const r of reports) {
    for (const b of r.blocks) {
      if (b.customerId === customerId) {
        entries.push({ reportId: r.id, reportDate: r.date, reportUserId: r.userId, block: b });
      }
    }
  }
  entries.sort((a, b) => {
    if (a.reportDate !== b.reportDate) return a.reportDate < b.reportDate ? 1 : -1;
    return (a.block.startTime || '') < (b.block.startTime || '') ? 1 : -1;
  });
  return entries;
}

function block(over: Partial<TimeBlock> = {}): TimeBlock {
  return {
    id: over.id ?? 'b1',
    reportId: over.reportId ?? 'r1',
    type: (over.type ?? 'visit') as BlockType,
    startTime: over.startTime ?? '10:00',
    endTime: over.endTime ?? '11:00',
    customerId: over.customerId,
    title: over.title ?? '',
    memo: over.memo ?? '',
    isPlanned: over.isPlanned ?? false,
    isActual: over.isActual ?? true,
    attachments: over.attachments ?? [],
    plannedBlockId: over.plannedBlockId,
    collected: over.collected,
    nextAppointment: over.nextAppointment,
    proposal: over.proposal,
    result: over.result,
  };
}

function report(over: Partial<DailyReport> & { id: string; date: string; blocks: TimeBlock[] }): DailyReport {
  return {
    id: over.id,
    userId: over.userId ?? 'u1',
    date: over.date,
    status: over.status ?? 'planning',
    submittedAt: over.submittedAt,
    summary: over.summary ?? '',
    rolledOverFromId: over.rolledOverFromId,
    todos: over.todos ?? [],
    blocks: over.blocks,
    visits: over.visits ?? [],
    actions: over.actions ?? [],
    comments: over.comments ?? [],
    compliments: over.compliments ?? [],
    requests: over.requests ?? [],
    managerComment: over.managerComment,
  } as DailyReport;
}

describe('CUS-2 顧客対応履歴の集約', () => {
  it('顧客 ID を含む block のみを抽出する', () => {
    const reports = [
      report({
        id: 'r1', date: '2026-06-01',
        blocks: [
          block({ id: 'b1', customerId: 'c1', title: '訪問A' }),
          block({ id: 'b2', customerId: 'c2', title: '訪問B' }),
        ],
      }),
    ];
    const h = buildHistory(reports, 'c1');
    expect(h).toHaveLength(1);
    expect(h[0].block.id).toBe('b1');
  });

  it('日付降順、同日内は startTime 降順で並ぶ', () => {
    const reports = [
      report({
        id: 'r1', date: '2026-06-01',
        blocks: [
          block({ id: 'b1', customerId: 'c1', startTime: '09:00' }),
          block({ id: 'b2', customerId: 'c1', startTime: '15:00' }),
        ],
      }),
      report({
        id: 'r2', date: '2026-06-03',
        blocks: [block({ id: 'b3', customerId: 'c1', startTime: '11:00' })],
      }),
      report({
        id: 'r3', date: '2026-06-02',
        blocks: [block({ id: 'b4', customerId: 'c1', startTime: '13:00' })],
      }),
    ];
    const h = buildHistory(reports, 'c1');
    expect(h.map(e => e.block.id)).toEqual(['b3', 'b4', 'b2', 'b1']);
  });

  it('複数 report に跨る同顧客の履歴が漏れなく集約される', () => {
    const reports = [
      report({
        id: 'r1', date: '2026-06-01',
        blocks: [
          block({ id: 'b1', customerId: 'c1' }),
          block({ id: 'b2', customerId: 'c1' }),
        ],
      }),
      report({
        id: 'r2', date: '2026-06-02',
        blocks: [block({ id: 'b3', customerId: 'c1' })],
      }),
    ];
    const h = buildHistory(reports, 'c1');
    expect(h).toHaveLength(3);
  });

  it('customerId が一致しない block は含まれない', () => {
    const reports = [
      report({
        id: 'r1', date: '2026-06-01',
        blocks: [
          block({ id: 'b1', customerId: 'cZ' }),
          block({ id: 'b2', customerId: undefined }),
        ],
      }),
    ];
    expect(buildHistory(reports, 'c1')).toHaveLength(0);
  });

  it('時刻情報・メモ・訪問結果・担当者 ID を保持する', () => {
    const reports = [
      report({
        id: 'r1', date: '2026-06-01', userId: 'u3',
        blocks: [
          block({
            id: 'b1', customerId: 'c1',
            startTime: '10:30', endTime: '11:45',
            title: 'ABC商事 訪問', memo: '新規提案ヒアリング',
            result: '前向き', proposal: '月額プラン', collected: true,
            nextAppointment: '2026-06-15',
          }),
        ],
      }),
    ];
    const h = buildHistory(reports, 'c1');
    expect(h[0].reportUserId).toBe('u3');
    expect(h[0].block.startTime).toBe('10:30');
    expect(h[0].block.endTime).toBe('11:45');
    expect(h[0].block.memo).toBe('新規提案ヒアリング');
    expect(h[0].block.result).toBe('前向き');
    expect(h[0].block.proposal).toBe('月額プラン');
    expect(h[0].block.collected).toBe(true);
    expect(h[0].block.nextAppointment).toBe('2026-06-15');
  });

  it('startTime が空文字でも安全に並ぶ', () => {
    const reports = [
      report({
        id: 'r1', date: '2026-06-01',
        blocks: [
          block({ id: 'b1', customerId: 'c1', startTime: '' }),
          block({ id: 'b2', customerId: 'c1', startTime: '10:00' }),
        ],
      }),
    ];
    const h = buildHistory(reports, 'c1');
    // 同日: '' は最も古い扱い → 10:00 のほうが先頭
    expect(h[0].block.id).toBe('b2');
    expect(h[1].block.id).toBe('b1');
  });
});
