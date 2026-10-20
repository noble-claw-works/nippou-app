import { describe, it, expect } from 'vitest';
import type { TimeBlock } from '../types';

// ─── Helper: create a minimal TimeBlock ──────────────────────────────────────
function makeBlock(overrides: Partial<TimeBlock> = {}): TimeBlock {
  return {
    id: 'b1',
    reportId: 'r1',
    type: 'visit',
    startTime: '09:00',
    endTime: '10:00',
    title: 'テスト訪問',
    memo: '',
    isPlanned: true,
    isActual: false,
    attachments: [],
    ...overrides,
  };
}

// ─── plannedBlockId deep copy verification ────────────────────────────────────
describe('plannedBlockId deep copy (actualize logic)', () => {
  it('実績化で生成した attachments は元ブロックとは別オブジェクトである', () => {
    const planned = makeBlock({
      attachments: [
        { id: 'a1', name: 'file.pdf', size: 1024, type: 'application/pdf', url: '/file.pdf', uploadedBy: 'u1', uploadedAt: '2025-01-01T00:00:00Z' },
      ],
    });

    // actualizeロジックのシミュレーション
    const actualAttachments = planned.attachments.map(a => ({ ...a }));
    const actualBlock: Omit<TimeBlock, 'id'> = {
      reportId:       planned.reportId,
      type:           planned.type,
      startTime:      planned.startTime,
      endTime:        planned.endTime,
      title:          planned.title,
      memo:           planned.memo,
      customerId:     planned.customerId,
      isPlanned:      false,
      isActual:       true,
      plannedBlockId: planned.id,
      attachments:    actualAttachments,
    };

    // plannedBlockId が保持される
    expect(actualBlock.plannedBlockId).toBe('b1');

    // attachments は shallow copy (別オブジェクト)
    expect(actualBlock.attachments).not.toBe(planned.attachments);
    expect(actualBlock.attachments[0]).not.toBe(planned.attachments[0]);

    // 内容は同じ
    expect(actualBlock.attachments[0].id).toBe(planned.attachments[0].id);
  });

  it('plannedBlockId は予定ブロックには設定されない', () => {
    const block = makeBlock({ isPlanned: true, isActual: false });
    expect(block.plannedBlockId).toBeUndefined();
  });
});

// ─── isPlanned / isActual 排他性検証 ─────────────────────────────────────────
describe('isPlanned / isActual exclusivity', () => {
  it('予定ブロックは isPlanned=true, isActual=false', () => {
    const block = makeBlock({ isPlanned: true, isActual: false });
    expect(block.isPlanned).toBe(true);
    expect(block.isActual).toBe(false);
  });

  it('実績ブロックは isPlanned=false, isActual=true', () => {
    const block = makeBlock({ isPlanned: false, isActual: true });
    expect(block.isPlanned).toBe(false);
    expect(block.isActual).toBe(true);
  });

  it('予定ブロックを実績列でフィルタしても表示されない', () => {
    const blocks: TimeBlock[] = [
      makeBlock({ id: 'b1', isPlanned: true,  isActual: false }),
      makeBlock({ id: 'b2', isPlanned: false, isActual: true  }),
      makeBlock({ id: 'b3', isPlanned: false, isActual: true  }),
    ];

    const plannedBlocks = blocks.filter(b => b.isPlanned);
    const actualBlocks  = blocks.filter(b => b.isActual);

    expect(plannedBlocks.map(b => b.id)).toEqual(['b1']);
    expect(actualBlocks.map(b => b.id)).toEqual(['b2', 'b3']);
  });

  it('実績化後のブロックは plannedBlockId を持つ', () => {
    const actual = makeBlock({ id: 'b2', isPlanned: false, isActual: true, plannedBlockId: 'b1' });
    expect(actual.plannedBlockId).toBe('b1');
  });
});

// ─── 訪問結果フィールドの型検証 ──────────────────────────────────────────────
describe('visit result fields on TimeBlock', () => {
  it('デフォルトでは訪問結果フィールドは undefined', () => {
    const block = makeBlock();
    expect(block.collected).toBeUndefined();
    expect(block.nextAppointment).toBeUndefined();
    expect(block.proposal).toBeUndefined();
    expect(block.result).toBeUndefined();
  });

  it('訪問結果フィールドを設定できる', () => {
    const block = makeBlock({
      collected: true,
      nextAppointment: '2025-07-15',
      proposal: '保険商品A',
      result: 'ポジティブな反応',
    });
    expect(block.collected).toBe(true);
    expect(block.nextAppointment).toBe('2025-07-15');
    expect(block.proposal).toBe('保険商品A');
    expect(block.result).toBe('ポジティブな反応');
  });

  it('visit 以外のブロックに訪問結果フィールドを設定しても型エラーにならない', () => {
    // TypeScript レベルで optional なので、office でも設定可能
    const block = makeBlock({ type: 'office', collected: false });
    expect(block.type).toBe('office');
    expect(block.collected).toBe(false);
  });
});
