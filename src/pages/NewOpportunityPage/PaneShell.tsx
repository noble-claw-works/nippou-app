// PaneShell.tsx — 新規案件作成の各ペインの枠（番号付き見出し＋無効時の薄表示と案内）
// 11/08 指示書 design.md §1.7。PC は 3 列の 1 列、スマホは縦に並ぶカード。

import type { ReactNode } from 'react';

interface Props {
  no: 1 | 2 | 3;
  title: string;
  disabled?: boolean;
  disabledHint?: string;
  /** 見出しの id（スマホでのスクロール先） */
  headingId?: string;
  children: ReactNode;
}

export function PaneShell({ no, title, disabled = false, disabledHint, headingId, children }: Props) {
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col min-h-0 bg-white rounded-lg border border-gray-200 lg:rounded-none lg:border-0 lg:border-r lg:last:border-r-0 lg:h-full"
    >
      <h2
        id={headingId}
        className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 text-sm font-semibold text-gray-800 shrink-0"
      >
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs">
          {no}
        </span>
        {title}
      </h2>
      {disabled && disabledHint && (
        <p className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-100 shrink-0">{disabledHint}</p>
      )}
      <div
        aria-disabled={disabled || undefined}
        className={`flex-1 min-h-0 lg:overflow-y-auto ${disabled ? 'opacity-50 pointer-events-none select-none' : ''}`}
      >
        {children}
      </div>
    </section>
  );
}
