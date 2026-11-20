// =====================================================
// miniTimeline.test.ts - MGR-3 一覧カードのミニタイムライン
// =====================================================
import { describe, it, expect } from 'vitest';
import { calcMiniTimelineSegments } from '../utils';

describe('MGR-3 calcMiniTimelineSegments', () => {
  it('空配列は空配列を返す', () => {
    expect(calcMiniTimelineSegments([])).toEqual([]);
  });

  it('1:1 対応を保つ (入力順を維持)', () => {
    const segs = calcMiniTimelineSegments([
      { startTime: '09:00', endTime: '10:00' },
      { startTime: '11:00', endTime: '12:00' },
    ]);
    expect(segs).toHaveLength(2);
    expect(segs[0].startTime).toBe('09:00');
    expect(segs[1].startTime).toBe('11:00');
  });

  it('既定 08:00-20:00 で 12:00 開始は 33.33% の位置', () => {
    const [seg] = calcMiniTimelineSegments([{ startTime: '12:00', endTime: '13:00' }]);
    // span = 720, start - 480 = 240, 240/720 = 33.33
    expect(seg.leftPct).toBeCloseTo(33.33, 1);
    expect(seg.widthPct).toBeCloseTo(8.33, 1);
    expect(seg.hidden).toBe(false);
  });

  it('開始 8:00 は 0% から', () => {
    const [seg] = calcMiniTimelineSegments([{ startTime: '08:00', endTime: '09:00' }]);
    expect(seg.leftPct).toBe(0);
    expect(seg.hidden).toBe(false);
  });

  it('20:00 終了は 100% まで', () => {
    const [seg] = calcMiniTimelineSegments([{ startTime: '19:00', endTime: '20:00' }]);
    expect(seg.leftPct + seg.widthPct).toBeCloseTo(100, 1);
    expect(seg.hidden).toBe(false);
  });

  it('範囲外（早朝・深夜）は hidden=true', () => {
    const segs = calcMiniTimelineSegments([
      { startTime: '06:00', endTime: '07:30' },
      { startTime: '20:30', endTime: '22:00' },
    ]);
    expect(segs[0].hidden).toBe(true);
    expect(segs[1].hidden).toBe(true);
  });

  it('範囲またぎはクリップされる (07:00-09:00 → 08:00-09:00)', () => {
    const [seg] = calcMiniTimelineSegments([{ startTime: '07:00', endTime: '09:00' }]);
    expect(seg.leftPct).toBe(0);
    // 09:00 - 08:00 = 60 / 720 = 8.33
    expect(seg.widthPct).toBeCloseTo(8.33, 1);
    expect(seg.hidden).toBe(false);
  });

  it('dayStart > dayEnd の異常は全 hidden', () => {
    const segs = calcMiniTimelineSegments([{ startTime: '12:00', endTime: '13:00' }], 600, 600);
    expect(segs[0].hidden).toBe(true);
  });
});
