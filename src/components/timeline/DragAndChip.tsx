/* eslint-disable react-refresh/only-export-components */
// DragAndChip は定数・関数・コンポーネントを集約したタイムライン専用ユーティリティ。
// 分離するとインポーター(TodayPage等)の修正が大規模になるため file-level で抑制。
// 実装は DragAndChip/ サブディレクトリに分割済み。

// ─── constants ───────────────────────────────────────────────────────────────
export {
  DAY_START,
  DAY_END,
  HOUR_PX,
  SNAP,
  BLOCK_TYPES,
} from "./DragAndChip/constants";

// ─── helpers ─────────────────────────────────────────────────────────────────
export { minuteToY, yToMinute } from "./DragAndChip/helpers";

// ─── types ────────────────────────────────────────────────────────────────────
export type {
  DragState,
  ChipPopoverProps,
  UseDragAndChipResult,
} from "./DragAndChip/types";

// ─── components & hooks ───────────────────────────────────────────────────────
export { ChipPopover } from "./DragAndChip/ChipPopover";
export { useDragAndChip } from "./DragAndChip/useDragAndChip";
