import { useEffect, useRef, useState } from "react";
import { BLOCK_EMOJIS, BLOCK_LABELS } from "../../../utils";
import type { BlockType } from "../../../types";
import { BLOCK_TYPES, HOTKEYS } from "./constants";
import { getLastChip, saveLastChip, formatRange, minuteToY } from "./helpers";
import type { ChipPopoverProps } from "./types";

const POPOVER_W = 200;

export function ChipPopover({
  dragState,
  onSelectChip,
  onOpenWithoutType,
  onCancel,
  isMobile,
}: ChipPopoverProps) {
  const popRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const lastChip = getLastChip();
  const orderedTypes: BlockType[] = lastChip
    ? [lastChip, ...BLOCK_TYPES.filter((t) => t !== lastChip)]
    : BLOCK_TYPES;
  const defaultType: BlockType | null = lastChip ?? BLOCK_TYPES[0];

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
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (defaultType) {
          saveLastChip(defaultType);
          onSelectChip(defaultType);
        } else {
          onOpenWithoutType();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [defaultType, onSelectChip, onOpenWithoutType, onCancel]);

  // click-outside → open without type
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        onOpenWithoutType();
      }
    };
    const id = setTimeout(
      () => document.addEventListener("mousedown", handler),
      100,
    );
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handler);
    };
  }, [onOpenWithoutType]);

  // ─── PC: absolute position popover ───────────────────────────────────────
  if (!isMobile) {
    const blockTop = minuteToY(dragState.startMin);
    const blockBottom = minuteToY(dragState.endMin);
    const blockMidY = (blockTop + blockBottom) / 2;

    const timelineRight = dragState.containerLeft + dragState.containerWidth;
    const spaceRight =
      window.innerWidth -
      (dragState.containerLeft + dragState.containerWidth - 8);
    const showLeft = spaceRight < POPOVER_W + 16;

    const popH = 340;
    const topIdeal = dragState.containerTop + blockMidY - popH / 2;
    const topClamped = Math.max(
      8,
      Math.min(topIdeal, window.innerHeight - popH - 8),
    );

    const leftPos = showLeft
      ? dragState.containerLeft + 52 - POPOVER_W - 8
      : timelineRight - 8 + 8;

    return (
      <div
        ref={popRef}
        role="dialog"
        aria-label="種別を選択してください"
        style={{
          position: "fixed",
          top: topClamped,
          left: leftPos,
          width: POPOVER_W,
          zIndex: 9999,
          transform: visible ? "scale(1)" : "scale(0.95)",
          opacity: visible ? 1 : 0,
          transition: "transform 150ms ease, opacity 150ms ease",
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
            const isLast = type === lastChip && idx === 0;
            const hotkey = Object.entries(HOTKEYS).find(
              ([, v]) => v === type,
            )?.[0];
            return (
              <button
                key={type}
                onClick={() => {
                  saveLastChip(type);
                  onSelectChip(type);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 transition-colors text-left"
                aria-label={`${BLOCK_LABELS[type]}${hotkey ? `。キー${hotkey}` : ""}`}
              >
                <span className="text-base">{BLOCK_EMOJIS[type]}</span>
                <span className="flex-1 font-medium text-gray-700">
                  {BLOCK_LABELS[type]}
                </span>
                {isLast && (
                  <span className="text-[9px] text-gray-400">直近</span>
                )}
                {hotkey && (
                  <span className="text-[10px] text-gray-300 ml-1">
                    {hotkey}
                  </span>
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
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        transform: visible ? "translateY(0)" : "translateY(100%)",
        opacity: visible ? 1 : 0,
        transition: "transform 200ms ease, opacity 200ms ease",
      }}
      className="bg-white border-t border-gray-200 shadow-2xl rounded-t-2xl"
    >
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">
            種別を選んでください
          </p>
          <p className="text-xs text-blue-600">
            {formatRange(dragState.startMin, dragState.endMin)}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <span className="text-gray-400 text-lg">✕</span>
        </button>
      </div>
      <div className="flex gap-2 px-4 py-2 overflow-x-auto">
        {orderedTypes.map((type) => (
          <button
            key={type}
            onClick={() => {
              saveLastChip(type);
              onSelectChip(type);
            }}
            style={{ minWidth: 56, minHeight: 56 }}
            className="flex-shrink-0 flex flex-col items-center justify-center gap-0.5 rounded-xl border text-xs font-medium transition-colors p-2 border-gray-200 bg-gray-50 text-gray-700 active:bg-gray-100"
            aria-label={BLOCK_LABELS[type]}
          >
            <span className="text-xl">{BLOCK_EMOJIS[type]}</span>
            <span>{BLOCK_LABELS[type]}</span>
          </button>
        ))}
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
