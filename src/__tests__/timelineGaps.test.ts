// =====================================================
// timelineGaps.test.ts - スキマ時間（gap）検出ロジック
// =====================================================
import { describe, it, expect } from 'vitest';
import { buildTimelineWithGaps, formatGapDuration, type TimelineGap } from '../utils';

type B = { id: string; startTime: string; endTime: string };
const b = (id: string, s: string, e: string): B => ({ id, startTime: s, endTime: e });

describe('GAP-1 buildTimelineWithGaps', () => {
  it('空配列は空配列を返す', () => {
    expect(buildTimelineWithGaps([])).toEqual([]);
  });

  it('単一ブロックは gap を生まない', () => {
    const r = buildTimelineWithGaps([b('1', '09:00', '10:00')]);
    expect(r).toHaveLength(1);
    expect(r[0].kind).toBe('block');
  });

  it('連続するブロックの間に gap がない場合は挿入されない', () => {
    const r = buildTimelineWithGaps([
      b('1', '09:00', '10:00'),
      b('2', '10:00', '11:00'),
    ]);
    expect(r).toHaveLength(2);
    expect(r.every(i => i.kind === 'block')).toBe(true);
  });

  it('画像例: 09:00-09:30, 10:00-11:00, 12:00-13:00, 14:00-17:00 で 3 つの gap が出る', () => {
    const r = buildTimelineWithGaps([
      b('asa', '09:00', '09:30'),
      b('hou', '10:00', '11:00'),
      b('lun', '12:00', '13:00'),
      b('jim', '14:00', '17:00'),
    ]);
    expect(r.map(i => i.kind)).toEqual(['block', 'gap', 'block', 'gap', 'block', 'gap', 'block']);
    const gaps = r.filter((i): i is TimelineGap => i.kind === 'gap');
    expect(gaps).toEqual([
      { kind: 'gap', startTime: '09:30', endTime: '10:00', durationMin: 30 },
      { kind: 'gap', startTime: '11:00', endTime: '12:00', durationMin: 60 },
      { kind: 'gap', startTime: '13:00', endTime: '14:00', durationMin: 60 },
    ]);
  });

  it('startTime 降順で渡しても昇順に整列される', () => {
    const r = buildTimelineWithGaps([
      b('late', '14:00', '15:00'),
      b('early', '09:00', '10:00'),
    ]);
    const blocks = r.filter(i => i.kind === 'block');
    expect((blocks[0] as { block: B }).block.id).toBe('early');
    expect((blocks[1] as { block: B }).block.id).toBe('late');
  });

  it('minGapMin 未満の隙間は無視される（既定 5 分）', () => {
    const r = buildTimelineWithGaps([
      b('1', '09:00', '09:58'),
      b('2', '10:00', '11:00'), // 2 分の隙間
    ]);
    expect(r.every(i => i.kind === 'block')).toBe(true);
  });

  it('minGapMin を 1 に下げると小さい gap も検出する', () => {
    const r = buildTimelineWithGaps(
      [
        b('1', '09:00', '09:58'),
        b('2', '10:00', '11:00'),
      ],
      1,
    );
    const gaps = r.filter((i): i is TimelineGap => i.kind === 'gap');
    expect(gaps).toHaveLength(1);
    expect(gaps[0].durationMin).toBe(2);
  });
});

describe('GAP-1 formatGapDuration', () => {
  it('60 分未満は「N分」', () => {
    expect(formatGapDuration(30)).toBe('30分');
    expect(formatGapDuration(59)).toBe('59分');
  });
  it('ちょうどの時間は「N時間」', () => {
    expect(formatGapDuration(60)).toBe('1時間');
    expect(formatGapDuration(180)).toBe('3時間');
  });
  it('時間+分は「N時間M分」', () => {
    expect(formatGapDuration(75)).toBe('1時間15分');
    expect(formatGapDuration(125)).toBe('2時間5分');
  });
});
