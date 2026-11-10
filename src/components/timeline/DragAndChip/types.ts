import type { BlockType } from "../../../types";

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

export interface UseDragAndChipResult {
  dragState: DragState | null;
  chipVisible: boolean;
  onTimelineMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTimelineTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  confirmChip: (type: BlockType) => {
    startMin: number;
    endMin: number;
    type: BlockType;
  };
  confirmWithoutType: () => { startMin: number; endMin: number };
  cancelDrag: () => void;
}
