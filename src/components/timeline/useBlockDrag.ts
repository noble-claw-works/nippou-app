/**
 * useBlockDrag — 既存ブロックの「移動」と「端リサイズ」を担う hook
 *
 * 操作種別:
 *   move   : ブロック本体ドラッグ → 開始・終了時刻を同量シフト
 *   resizeTop    : 上端 8px ハンドル → 開始時刻を変更
 *   resizeBottom : 下端 8px ハンドル → 終了時刻を変更
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { HOUR_PX, DAY_START, DAY_END, SNAP } from './DragAndChip';

export type DragMode = 'move' | 'resizeTop' | 'resizeBottom';

export interface BlockDragState {
  blockId: string;
  mode: DragMode;
  startMin: number;   // preview start
  endMin: number;     // preview end
}

interface UseBlockDragOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onCommit: (blockId: string, startMin: number, endMin: number) => void;
}

/** スナップ付き分 → クランプ */
function snap(min: number): number {
  return Math.round(min / SNAP) * SNAP;
}
function clamp(min: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, min));
}
function yToRawMin(clientY: number, containerTop: number): number {
  return DAY_START + ((clientY - containerTop) / HOUR_PX) * 60;
}

export function useBlockDrag({ containerRef, onCommit }: UseBlockDragOptions) {
  const [dragState, setDragState] = useState<BlockDragState | null>(null);

  // ref holds mutable drag context (avoids stale closures in document listeners)
  const ctx = useRef<{
    mode: DragMode;
    blockId: string;
    origStart: number;
    origEnd: number;
    anchorClientY: number;       // mousedown Y
    containerTop: number;
  } | null>(null);

  // ── start drag ────────────────────────────────────────────────────────────
  const startDrag = useCallback((
    e: React.MouseEvent,
    blockId: string,
    mode: DragMode,
    origStart: number,
    origEnd: number,
  ) => {
    e.stopPropagation();   // prevent new-block creation in parent mousedown
    e.preventDefault();
    const containerTop = containerRef.current?.getBoundingClientRect().top ?? 0;
    ctx.current = { mode, blockId, origStart, origEnd, anchorClientY: e.clientY, containerTop };
    setDragState({ blockId, mode, startMin: origStart, endMin: origEnd });
  }, [containerRef]);

  // ── mouse move / up on document ───────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const c = ctx.current;
      if (!c) return;

      // recompute containerTop live (in case of scroll)
      const containerTop = containerRef.current?.getBoundingClientRect().top ?? c.containerTop;
      const dyMin = ((e.clientY - c.anchorClientY) / HOUR_PX) * 60;
      const duration = c.origEnd - c.origStart;

      let newStart = c.origStart;
      let newEnd   = c.origEnd;

      if (c.mode === 'move') {
        newStart = clamp(snap(c.origStart + dyMin), DAY_START, DAY_END - duration);
        newEnd   = newStart + duration;
      } else if (c.mode === 'resizeTop') {
        const rawMin = yToRawMin(e.clientY, containerTop);
        newStart = clamp(snap(rawMin), DAY_START, c.origEnd - SNAP);
        newEnd   = c.origEnd;
      } else {
        // resizeBottom
        const rawMin = yToRawMin(e.clientY, containerTop);
        newEnd   = clamp(snap(rawMin), c.origStart + SNAP, DAY_END);
        newStart = c.origStart;
      }

      setDragState({ blockId: c.blockId, mode: c.mode, startMin: newStart, endMin: newEnd });
    };

    const onUp = () => {
      const c = ctx.current;
      if (!c) return;
      // read latest preview from state via functional update
      setDragState(prev => {
        if (prev) onCommit(prev.blockId, prev.startMin, prev.endMin);
        return null;
      });
      ctx.current = null;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [containerRef, onCommit]);

  return { blockDragState: dragState, startDrag };
}
