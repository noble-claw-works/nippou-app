import { useEffect, useRef, useState, useCallback } from "react";
import type { BlockType } from "../../../types";
import { DAY_END, SNAP } from "./constants";
import { yToMinute } from "./helpers";
import type { DragState, UseDragAndChipResult } from "./types";

export function useDragAndChip(
  containerRef: React.RefObject<HTMLDivElement | null>,
  onReportRequired: () => boolean,
): UseDragAndChipResult {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [chipVisible, setChipVisible] = useState(false);
  const dragRef = useRef<{
    dragging: boolean;
    startMin: number;
    startY: number;
    containerTop: number;
    containerLeft: number;
    containerWidth: number;
  } | null>(null);

  const getContainerRect = useCallback(() => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    return { top: rect.top, left: rect.left, width: rect.width };
  }, [containerRef]);

  // ── mouse events ──────────────────────────────────────────────────────────
  const onTimelineMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if (!onReportRequired()) return;
      if ((e.target as HTMLElement).closest("[data-block]")) return;

      const rect = getContainerRect();
      if (!rect) return;
      const startMin = yToMinute(e.clientY, rect.top);

      dragRef.current = {
        dragging: false,
        startMin,
        startY: e.clientY,
        containerTop: rect.top,
        containerLeft: rect.left,
        containerWidth: rect.width,
      };
      e.preventDefault();
    },
    [onReportRequired, getContainerRect],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const d = dragRef.current;
      const delta = Math.abs(e.clientY - d.startY);

      if (!d.dragging && delta < 5) return;
      d.dragging = true;

      const rect = getContainerRect();
      if (!rect) return;
      let endMin = yToMinute(e.clientY, rect.top);
      if (endMin <= d.startMin) endMin = d.startMin + SNAP;
      endMin = Math.max(d.startMin + SNAP, endMin);

      setDragState({
        active: true,
        startMin: d.startMin,
        endMin,
        containerTop: rect.top,
        containerLeft: rect.left,
        containerWidth: rect.width,
      });
    };

    const onMouseUp = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;

      if (!d.dragging) {
        dragRef.current = null;
        setDragState(null);
        setChipVisible(false);
        return;
      }

      const rect = getContainerRect();
      if (!rect) {
        dragRef.current = null;
        return;
      }

      let endMin = yToMinute(e.clientY, rect.top);
      const rawDur = endMin - d.startMin;

      if (rawDur < 5) {
        dragRef.current = null;
        setDragState(null);
        setChipVisible(false);
        return;
      }

      if (rawDur < SNAP) endMin = d.startMin + SNAP;
      endMin = Math.min(endMin, DAY_END);

      dragRef.current = null;
      setDragState({
        active: true,
        startMin: d.startMin,
        endMin,
        containerTop: rect.top,
        containerLeft: rect.left,
        containerWidth: rect.width,
      });
      setChipVisible(true);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [getContainerRect]);

  // ── touch events ──────────────────────────────────────────────────────────
  const touchRef = useRef<{
    startY: number;
    startMin: number;
    moved: boolean;
    longPressTimer: ReturnType<typeof setTimeout> | null;
  } | null>(null);

  const onTimelineTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!onReportRequired()) return;
      if ((e.target as HTMLElement).closest("[data-block]")) return;

      const touch = e.touches[0];
      const rect = getContainerRect();
      if (!rect) return;
      const startMin = yToMinute(touch.clientY, rect.top);

      touchRef.current = {
        startY: touch.clientY,
        startMin,
        moved: false,
        longPressTimer: null,
      };
    },
    [onReportRequired, getContainerRect],
  );

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      const td = touchRef.current;
      if (!td) return;
      const touch = e.touches[0];
      const delta = Math.abs(touch.clientY - td.startY);
      if (delta > 10) td.moved = true;

      const rect = getContainerRect();
      if (!rect) return;
      let endMin = yToMinute(touch.clientY, rect.top);
      if (endMin <= td.startMin) endMin = td.startMin + SNAP;

      setDragState({
        active: true,
        startMin: td.startMin,
        endMin,
        containerTop: rect.top,
        containerLeft: rect.left,
        containerWidth: rect.width,
      });
    };

    const onTouchEnd = (e: TouchEvent) => {
      const td = touchRef.current;
      if (!td) return;

      const touch = e.changedTouches[0];
      const rect = getContainerRect();
      if (!rect) {
        touchRef.current = null;
        return;
      }

      let endMin = yToMinute(touch.clientY, rect.top);
      const rawDur = endMin - td.startMin;

      if (!td.moved || rawDur < 5) {
        endMin = td.startMin + SNAP;
        touchRef.current = null;
        setDragState({
          active: true,
          startMin: td.startMin,
          endMin,
          containerTop: rect.top,
          containerLeft: rect.left,
          containerWidth: rect.width,
        });
        setChipVisible(true);
        return;
      }

      if (rawDur < SNAP) endMin = td.startMin + SNAP;
      endMin = Math.min(endMin, DAY_END);
      touchRef.current = null;
      setDragState({
        active: true,
        startMin: td.startMin,
        endMin,
        containerTop: rect.top,
        containerLeft: rect.left,
        containerWidth: rect.width,
      });
      setChipVisible(true);
    };

    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [getContainerRect]);

  // ── actions ──────────────────────────────────────────────────────────────
  const confirmChip = useCallback(
    (type: BlockType) => {
      const s = dragState!;
      setChipVisible(false);
      setDragState(null);
      return { startMin: s.startMin, endMin: s.endMin, type };
    },
    [dragState],
  );

  const confirmWithoutType = useCallback(() => {
    const s = dragState!;
    setChipVisible(false);
    setDragState(null);
    return { startMin: s.startMin, endMin: s.endMin };
  }, [dragState]);

  const cancelDrag = useCallback(() => {
    setDragState(null);
    setChipVisible(false);
    dragRef.current = null;
    touchRef.current = null;
  }, []);

  return {
    dragState,
    chipVisible,
    onTimelineMouseDown,
    onTimelineTouchStart,
    confirmChip,
    confirmWithoutType,
    cancelDrag,
  };
}
