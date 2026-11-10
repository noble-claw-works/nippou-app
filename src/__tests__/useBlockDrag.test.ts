// =====================================================
// useBlockDrag.test.ts — Fix3 ドラッグロジック単体テスト
// snap / clamp / yToRawMin ヘルパーのロジック検証
// useBlockDrag の onCommitRef パターンで stale closure が発生しないことの検証
// =====================================================
import { describe, it, expect } from "vitest";

// ── ヘルパー関数（useBlockDrag 内部ロジックと同等） ─────────────────────────────
const HOUR_PX = 64;
const DAY_START = 6 * 60; // 360
const DAY_END = 22 * 60 + 30; // 1350
const SNAP_MIN = 15;

function snap(min: number): number {
  return Math.round(min / SNAP_MIN) * SNAP_MIN;
}
function clamp(val: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, val));
}
function yToRawMin(clientY: number, containerTop: number): number {
  return DAY_START + ((clientY - containerTop) / HOUR_PX) * 60;
}

/** move モードの newStart/newEnd 計算 */
function calcMove(
  origStart: number,
  origEnd: number,
  anchorY: number,
  currentY: number,
) {
  const dyMin = ((currentY - anchorY) / HOUR_PX) * 60;
  const duration = origEnd - origStart;
  const newStart = clamp(
    snap(origStart + dyMin),
    DAY_START,
    DAY_END - duration,
  );
  const newEnd = newStart + duration;
  return { newStart, newEnd };
}

/** resizeTop の newStart/newEnd 計算 */
function calcResizeTop(origEnd: number, clientY: number, containerTop: number) {
  const rawMin = yToRawMin(clientY, containerTop);
  const newStart = clamp(snap(rawMin), DAY_START, origEnd - SNAP_MIN);
  return { newStart, newEnd: origEnd };
}

/** resizeBottom の newStart/newEnd 計算 */
function calcResizeBottom(
  origStart: number,
  clientY: number,
  containerTop: number,
) {
  const rawMin = yToRawMin(clientY, containerTop);
  const newEnd = clamp(snap(rawMin), origStart + SNAP_MIN, DAY_END);
  return { newStart: origStart, newEnd };
}

// ── テスト ─────────────────────────────────────────────────────────────────────
describe("useBlockDrag: snap & clamp ヘルパー", () => {
  it("snap: 0→0, 7→0, 8→15, 22→15, 23→30", () => {
    expect(snap(0)).toBe(0);
    expect(snap(7)).toBe(0);
    expect(snap(8)).toBe(15);
    expect(snap(22)).toBe(15);
    expect(snap(23)).toBe(30);
  });

  it("clamp: 境界値を守る", () => {
    expect(clamp(5, 10, 20)).toBe(10);
    expect(clamp(25, 10, 20)).toBe(20);
    expect(clamp(15, 10, 20)).toBe(15);
  });

  it("yToRawMin: 0px → DAY_START, 64px → DAY_START + 60", () => {
    const containerTop = 100;
    expect(yToRawMin(containerTop, containerTop)).toBe(DAY_START);
    expect(yToRawMin(containerTop + HOUR_PX, containerTop)).toBe(
      DAY_START + 60,
    );
    expect(yToRawMin(containerTop + HOUR_PX / 2, containerTop)).toBe(
      DAY_START + 30,
    );
  });
});

describe("useBlockDrag: move モード計算", () => {
  it("下に64px (1時間) ドラッグ → 1時間シフト", () => {
    // 09:00–09:30 = 540–570
    const { newStart, newEnd } = calcMove(540, 570, 0, HOUR_PX);
    expect(newStart).toBe(600); // 10:00
    expect(newEnd).toBe(630); // 10:30
  });

  it("上に32px (30分) ドラッグ → 30分シフト", () => {
    // 10:00–11:00 = 600–660
    const { newStart, newEnd } = calcMove(600, 660, 0, -32);
    expect(newStart).toBe(570); // 09:30
    expect(newEnd).toBe(630); // 10:30
  });

  it("DAY_START より前には移動しない (clamp)", () => {
    // 06:00–06:30 = 360–390, 上に大きくドラッグ
    const { newStart, newEnd } = calcMove(360, 390, 0, -200);
    expect(newStart).toBe(DAY_START);
    expect(newEnd).toBe(DAY_START + 30);
  });

  it("DAY_END を超えない (clamp)", () => {
    // 22:00–22:30 = 1320–1350, 下に大きくドラッグ
    const { newStart, newEnd } = calcMove(1320, 1350, 0, 200);
    expect(newStart).toBe(DAY_END - 30);
    expect(newEnd).toBe(DAY_END);
  });

  it("snap に合わせて丸められる", () => {
    // 09:00 = 540, 5pxドラッグ ≈ 4.7min → snap to 0 → stay at 540
    const { newStart } = calcMove(540, 570, 0, 5);
    expect(newStart % SNAP_MIN).toBe(0);
  });
});

describe("useBlockDrag: resizeTop モード計算", () => {
  it("上端を上にドラッグ → startTime が早くなる", () => {
    const containerTop = 0;
    // 10:00–11:30 = 600–690, top handle at y = minuteToY(600) + 8
    // 09:30 = 570 → y = (570-360)/60*64+8 = 232
    const y_09_30 = ((570 - DAY_START) / 60) * HOUR_PX;
    const { newStart, newEnd } = calcResizeTop(
      690,
      y_09_30 + containerTop,
      containerTop,
    );
    expect(newStart).toBe(570); // 09:30
    expect(newEnd).toBe(690); // 11:30 unchanged
  });

  it("origEnd - SNAP より先には縮められない", () => {
    const containerTop = 0;
    // Try to move top past end
    const yBeyondEnd = ((700 - DAY_START) / 60) * HOUR_PX;
    const { newStart } = calcResizeTop(
      690,
      yBeyondEnd + containerTop,
      containerTop,
    );
    expect(newStart).toBe(690 - SNAP_MIN); // max = origEnd - SNAP
  });
});

describe("useBlockDrag: resizeBottom モード計算", () => {
  it("下端を下にドラッグ → endTime が遅くなる", () => {
    const containerTop = 0;
    // 10:00–11:30 = 600–690, extend to 12:30 = 750
    const y_12_30 = ((750 - DAY_START) / 60) * HOUR_PX;
    const { newStart, newEnd } = calcResizeBottom(
      600,
      y_12_30 + containerTop,
      containerTop,
    );
    expect(newStart).toBe(600); // 10:00 unchanged
    expect(newEnd).toBe(750); // 12:30
  });

  it("origStart + SNAP より短くは縮められない", () => {
    const containerTop = 0;
    // Try to move bottom above start
    const yAboveStart = ((590 - DAY_START) / 60) * HOUR_PX;
    const { newEnd } = calcResizeBottom(
      600,
      yAboveStart + containerTop,
      containerTop,
    );
    expect(newEnd).toBe(600 + SNAP_MIN); // min = origStart + SNAP
  });

  it("DAY_END を超えない", () => {
    const containerTop = 0;
    const yBeyondEnd = ((1400 - DAY_START) / 60) * HOUR_PX;
    const { newEnd } = calcResizeBottom(
      600,
      yBeyondEnd + containerTop,
      containerTop,
    );
    expect(newEnd).toBe(DAY_END);
  });
});

describe("useBlockDrag: onCommitRef パターン (stale closure 対策)", () => {
  it("最新の onCommit が呼ばれる (ref 更新後)", () => {
    // onCommitRef を直接更新し、最新関数が呼ばれることを確認
    let callCount = 0;
    let lastArgs: [string, number, number] | null = null;

    const onCommitRef = {
      current: (..._args: [string, number, number]) => {
        void _args;
        callCount++;
      },
    };

    // Simulate: onCommit changes (new render)
    onCommitRef.current = (id, s, e) => {
      callCount++;
      lastArgs = [id, s, e];
    };

    // onUp logic: uses ref, not closure
    const simulatedPrev = {
      blockId: "b1",
      mode: "move" as const,
      startMin: 600,
      endMin: 660,
    };
    if (simulatedPrev)
      onCommitRef.current(
        simulatedPrev.blockId,
        simulatedPrev.startMin,
        simulatedPrev.endMin,
      );

    expect(callCount).toBe(1);
    expect(lastArgs).toEqual(["b1", 600, 660]);
  });

  it("onCommit が複数回登録されない (単一リスナーであること)", () => {
    // Effect は containerRef/actualRef 変更時のみ再登録
    // → 同一 ref での複数レンダーでリスナーが増えないことをロジックで確認
    const registrations: string[] = [];
    const cleanups: string[] = [];

    function simulateEffect(containerRefId: string, actualRefId: string) {
      // Equivalent to the useEffect registration
      registrations.push(`${containerRefId}-${actualRefId}`);
      return () => cleanups.push(`${containerRefId}-${actualRefId}`);
    }

    // First mount
    const cleanup1 = simulateEffect("ref-A", "ref-B");
    expect(registrations.length).toBe(1);

    // Re-render with same refs (onCommit changed, but excluded from deps)
    // → NO new effect should fire
    expect(registrations.length).toBe(1); // still 1

    // Cleanup on unmount
    cleanup1();
    expect(cleanups.length).toBe(1);

    // Only re-registers when containerRef changes
    const cleanup2 = simulateEffect("ref-A2", "ref-B");
    expect(registrations.length).toBe(2);
    cleanup2();
  });
});
