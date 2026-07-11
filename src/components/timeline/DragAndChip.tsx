/* eslint-disable react-refresh/only-export-components */
// DragAndChip は定数・関数・コンポーネントを集約したタイムライン専用ユーティリティ。
// 分離するとインポーター(TodayPage等)の修正が大規模になるため file-level で抑制。
import { useEffect, useRef, useState, useCallback } from 'react';
import { BLOCK_EMOJIS, BLOCK_LABELS } from '../../utils';
import type { BlockType } from '../../types';

// ─── constants ───────────────────────────────────────────────────────────────
export const DAY_START = 6 * 60;   // 6:00
export const DAY_END   = 22 * 60 + 30; // 22:30
export const HOUR_PX   = 64;
export const SNAP      = 15;

export const BLOCK_TYPES: BlockType[] = [
  'visit', 'office', 'phone', 'travel', 'break', 'meeting', 'lunch',
];

const HOTKEYS: Record<string, BlockType> = {
  '1': 'visit', '2': 'office', '3': 'phone', '4': 'travel',
  '5': 'break', '6': 'meeting', '7': 'lunch',
};

const STORAGE_KEY = 'nippou_last_chip';

// ─── helpers ─────────────────────────────────────────────────────────────────
export function minuteToY(min: number): number {
  return ((min - DAY_START) / 60) * HOUR_PX;
}

export function yToMinute(y: number, containerTop: number): number {
  const relY = y - containerTop;
  const raw = DAY_START + (relY / HOUR_PX) * 60;
  return Math.round(raw / SNAP) * SNAP;
}

/** 時間帯で「おすすめ」種別を返す */
function getRecommendedTypes(nowMin: number): BlockType[] {
  if (nowMin >= 8 * 60 + 30 && nowMin < 10 * 60)  return ['meeting'];
  if (nowMin >= 10 * 60       && nowMin < 12 * 60)  return ['visit'];
  if (nowMin >= 12 * 60       && nowMin < 13 * 60)  return ['lunch'];
  if (nowMin >= 13 * 60       && nowMin < 17 * 60)  return ['visit', 'office'];
  if (nowMin >= 17 * 60)                             return ['office'];
  return [];
}

function getLastChip(): BlockType | null {
  try { return localStorage.getItem(STORAGE_KEY) as BlockType | null; } catch { return null; }
}
function saveLastChip(t: BlockType) {
  try { localStorage.setItem(STORAGE_KEY, t); } catch { /* noop */ }
}

/** 仮ブロックの時間範囲を "HH:MM - HH:MM ⏱Xh Ym" でフォーマット */
function formatRange(startMin: number, endMin: number): string {
  const dur = endMin - startMin;
  const h = Math.floor(dur / 60);
  const m = dur % 60;
  const fmt = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
  const durStr = h > 0 && m > 0 ? `${h}h${m}m` : h > 0 ? `${h}h` : `${m}m`;
  return `${fmt(startMin)} - ${fmt(endMin)} ⏱${durStr}`;
}

// ─── types ────────────────────────────────────────────────────────────────────
export interface DragState {
  active: boolean;
  startMin: number;
  endMin: number;
  /** pixel top of the timeline container (for popover positioning) */
  containerTop: number;
  /** pixel left of the timeline container */
  containerLeft: number;
  /** pixel width of the timeline container */
  containerWidth: number;
}

export interface ChipPopoverProps {
  dragState: DragState;
  onSelectChip: (type: BlockType) => void;
  onOpenWithoutType: () => void;
  onCancel: () => void;
  isMobile: boolean;
}

// ─── ChipPopover ─────────────────────────────────────────────────────────────
export function ChipPopover({
  dragState, onSelectChip, onOpenWithoutType, onCancel, isMobile,
}: ChipPopoverProps) {
  const popRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const recommended = getRecommendedTypes(nowMin);
  const lastChip    = getLastChip();

  // 種別の並び順: 直近選択を先頭に
  const orderedTypes: BlockType[] = lastChip
    ? [lastChip, ...BLOCK_TYPES.filter(t => t !== lastChip)]
    : BLOCK_TYPES;

  // Enter → おすすめの先頭 or 直近
  const defaultType: BlockType | null = recommended[0] ?? lastChip ?? null;

  // fade-in on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (HOTKEYS[e.key]) {
        e.preventDefault();
        const t = HOTKEYS[e.key];
        saveLastChip(t);
        onSelectChip(t);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (defaultType) {
          saveLastChip(defaultType);
          onSelectChip(defaultType);
        } else {
          onOpenWithoutType();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [defaultType, onSelectChip, onOpenWithoutType, onCancel]);

  // click-outside → open without type
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        onOpenWithoutType();
      }
    };
    // slight delay so the mouseup that ended drag doesn't immediately fire
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => { clearTimeout(id); document.removeEventListener('mousedown', handler); };
  }, [onOpenWithoutType]);

  // ─── PC: absolute position popover ───────────────────────────────────────
  if (!isMobile) {
    const blockTop    = minuteToY(dragState.startMin);
    const blockBottom = minuteToY(dragState.endMin);
    const blockMidY   = (blockTop + blockBottom) / 2;

    // right side by default; flip left if near right edge
    const POPOVER_W = 200;
    const timelineRight = dragState.containerLeft + dragState.containerWidth;
    const spaceRight = window.innerWidth - (dragState.containerLeft + dragState.containerWidth - 8);
    const showLeft = spaceRight < POPOVER_W + 16;

    // vertical: center on block mid, clamped to viewport
    const popH = 340;
    const topIdeal = dragState.containerTop + blockMidY - popH / 2;
    const topClamped = Math.max(8, Math.min(topIdeal, window.innerHeight - popH - 8));

    const leftPos = showLeft
      ? dragState.containerLeft + 52 - POPOVER_W - 8
      : timelineRight - 8 + 8;

    return (
      <div
        ref={popRef}
        role="dialog"
        aria-label="種別を選択してください"
        style={{
          position: 'fixed',
          top: topClamped,
          left: leftPos,
          width: POPOVER_W,
          zIndex: 9999,
          transform: visible ? 'scale(1)' : 'scale(0.95)',
          opacity: visible ? 1 : 0,
          transition: 'transform 150ms ease, opacity 150ms ease',
        }}
        className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
      >
        {/* header */}
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500">種別を選ぶ</p>
          <p className="text-[10px] text-blue-600 font-medium mt-0.5">
            {formatRange(dragState.startMin, dragState.endMin)}
          </p>
        </div>
        {/* chips */}
        <div className="py-1">
          {orderedTypes.map((type, idx) => {
            const isRecommended = recommended.includes(type);
            const isLast        = type === lastChip && idx === 0;
            const hotkey        = Object.entries(HOTKEYS).find(([, v]) => v === type)?.[0];
            return (
              <button
                key={type}
                onClick={() => { saveLastChip(type); onSelectChip(type); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 transition-colors text-left
                  ${isRecommended ? 'border-l-2 border-blue-500 bg-blue-50/50' : ''}`}
                aria-label={`${BLOCK_LABELS[type]}${hotkey ? `。キー${hotkey}` : ''}${isRecommended ? '。おすすめ' : ''}`}
              >
                <span className="text-base">{BLOCK_EMOJIS[type]}</span>
                <span className={`flex-1 font-medium ${isRecommended ? 'text-blue-700' : 'text-gray-700'}`}>
                  {BLOCK_LABELS[type]}
                </span>
                {isRecommended && (
                  <span className="text-[9px] text-blue-600 font-bold bg-blue-100 px-1 rounded">おすすめ</span>
                )}
                {isLast && !isRecommended && (
                  <span className="text-[9px] text-gray-400">直近</span>
                )}
                {hotkey && (
                  <span className="text-[10px] text-gray-300 ml-1">{hotkey}</span>
                )}
              </button>
            );
          })}
        </div>
        {/* footer */}
        <div className="border-t border-gray-100 p-2">
          <button
            onClick={onOpenWithoutType}
            className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
          >
            ✎ 種別未指定でダイアログを開く
          </button>
        </div>
      </div>
    );
  }

  // ─── Mobile: bottom bar ───────────────────────────────────────────────────
  return (
    <div
      ref={popRef}
      role="dialog"
      aria-label="種別を選択してください"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 200ms ease, opacity 200ms ease',
      }}
      className="bg-white border-t border-gray-200 shadow-2xl rounded-t-2xl"
    >
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">種別を選んでください</p>
          <p className="text-xs text-blue-600">{formatRange(dragState.startMin, dragState.endMin)}</p>
        </div>
        <button onClick={onCancel} className="p-2 rounded-full hover:bg-gray-100">
          <span className="text-gray-400 text-lg">✕</span>
        </button>
      </div>
      <div className="flex gap-2 px-4 py-2 overflow-x-auto">
        {orderedTypes.map(type => {
          const isRecommended = recommended.includes(type);
          return (
            <button
              key={type}
              onClick={() => { saveLastChip(type); onSelectChip(type); }}
              style={{ minWidth: 56, minHeight: 56 }}
              className={`flex-shrink-0 flex flex-col items-center justify-center gap-0.5 rounded-xl border text-xs font-medium transition-colors p-2
                ${isRecommended
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-700 active:bg-gray-100'}`}
              aria-label={`${BLOCK_LABELS[type]}${isRecommended ? '。おすすめ' : ''}`}
            >
              <span className="text-xl">{BLOCK_EMOJIS[type]}</span>
              <span>{BLOCK_LABELS[type]}</span>
            </button>
          );
        })}
      </div>
      <div className="px-4 pb-4 pt-1">
        <button
          onClick={onOpenWithoutType}
          className="w-full py-2 text-sm text-gray-500 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
        >
          種別未指定でダイアログを開く
        </button>
      </div>
    </div>
  );
}

// ─── useDragAndChip hook ──────────────────────────────────────────────────────
export interface UseDragAndChipResult {
  dragState: DragState | null;
  chipVisible: boolean;
  onTimelineMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTimelineTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  confirmChip: (type: BlockType) => { startMin: number; endMin: number; type: BlockType };
  confirmWithoutType: () => { startMin: number; endMin: number };
  cancelDrag: () => void;
}

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
  const onTimelineMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (!onReportRequired()) return;
    // only fire on empty area (not on existing blocks)
    if ((e.target as HTMLElement).closest('[data-block]')) return;

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
  }, [onReportRequired, getContainerRect]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const d = dragRef.current;
      const delta = Math.abs(e.clientY - d.startY);

      // need at least ~5px movement to start drag
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
        // treat as click: don't activate D&C
        dragRef.current = null;
        setDragState(null);
        setChipVisible(false);
        return;
      }

      const rect = getContainerRect();
      if (!rect) { dragRef.current = null; return; }

      let endMin = yToMinute(e.clientY, rect.top);
      const rawDur = endMin - d.startMin;

      // < 5 min → treat as click
      if (rawDur < 5) {
        dragRef.current = null;
        setDragState(null);
        setChipVisible(false);
        return;
      }

      // snap to 15min min
      if (rawDur < SNAP) endMin = d.startMin + SNAP;

      // clamp to day bounds
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

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [getContainerRect]);

  // ── touch events ──────────────────────────────────────────────────────────
  const touchRef = useRef<{
    startY: number;
    startMin: number;
    moved: boolean;
    longPressTimer: ReturnType<typeof setTimeout> | null;
  } | null>(null);

  const onTimelineTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!onReportRequired()) return;
    if ((e.target as HTMLElement).closest('[data-block]')) return;

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
  }, [onReportRequired, getContainerRect]);

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
      if (!rect) { touchRef.current = null; return; }

      let endMin = yToMinute(touch.clientY, rect.top);
      const rawDur = endMin - td.startMin;

      if (!td.moved || rawDur < 5) {
        // tap: create 15-min block and show chip bar (路B→F upgrade)
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

    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [getContainerRect]);

  // ── actions ──────────────────────────────────────────────────────────────
  const confirmChip = useCallback((type: BlockType) => {
    const s = dragState!;
    setChipVisible(false);
    setDragState(null);
    return { startMin: s.startMin, endMin: s.endMin, type };
  }, [dragState]);

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
