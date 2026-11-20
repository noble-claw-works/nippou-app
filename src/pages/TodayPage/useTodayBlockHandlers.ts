import { useState, useCallback } from "react";
import { BLOCK_LABELS, minutesToTime, timeToMinutes } from "../../utils";
import type { BlockType, TimeBlock, DailyReport } from "../../types/index";
import type { Toast } from "../../store";
import { DAY_END, SNAP } from "../../components/timeline/DragAndChip";
import type { BlockModalState } from "../../components/today/BlockModal";
import { canEditActual, canEditPlanned, isReadOnly } from "./reportHelpers";

interface UseBlockHandlersOptions {
  report: DailyReport | null;
  addBlock: (reportId: string, block: Omit<TimeBlock, "id">) => void;
  updateBlock: (
    reportId: string,
    blockId: string,
    updates: Partial<TimeBlock>,
  ) => void;
  deleteBlock: (reportId: string, blockId: string) => void;
  addToast: (toast: Omit<Toast, "id">) => void;
  plannedDnC: {
    confirmChip: (t: BlockType) => { startMin: number; endMin: number };
    confirmWithoutType: () => { startMin: number; endMin: number };
    cancelDrag: () => void;
  };
  actualDnC: {
    confirmChip: (t: BlockType) => { startMin: number; endMin: number };
    confirmWithoutType: () => { startMin: number; endMin: number };
  };
}

export function useTodayBlockHandlers({
  report,
  addBlock,
  updateBlock,
  deleteBlock,
  addToast,
  plannedDnC,
  actualDnC,
}: UseBlockHandlersOptions) {
  const [blockModal, setBlockModal] = useState<BlockModalState>({
    open: false,
    block: {},
    isNew: true,
    col: "actual",
    focusCustomer: false,
  });
  const [continueInput, setContinueInput] = useState(false);
  const [showLongBlock, setShowLongBlock] = useState(false);
  const [pendingLong, setPendingLong] = useState<{
    startMin: number;
    endMin: number;
    type?: BlockType;
    col?: "planned" | "actual";
  } | null>(null);

  const openFromDrag = useCallback(
    (
      startMin: number,
      endMin: number,
      type?: BlockType,
      col: "planned" | "actual" = "actual",
    ) => {
      const pa =
        col === "planned"
          ? { isPlanned: true, isActual: false }
          : { isPlanned: false, isActual: true };
      const block: Partial<TimeBlock> = {
        type,
        startTime: minutesToTime(startMin),
        endTime: minutesToTime(Math.min(endMin, DAY_END)),
        title: type ? BLOCK_LABELS[type] : "",
        memo: "",
        ...pa,
        attachments: [],
      };
      setBlockModal({
        open: true,
        col,
        block,
        isNew: true,
        focusCustomer: !!type,
      });
    },
    [],
  );

  const withLongCheck = useCallback(
    (
      startMin: number,
      endMin: number,
      type: BlockType | undefined,
      col: "planned" | "actual",
    ) => {
      if (endMin - startMin >= 8 * 60) {
        setPendingLong({ startMin, endMin, type, col });
        setShowLongBlock(true);
      } else openFromDrag(startMin, endMin, type, col);
    },
    [openFromDrag],
  );

  const handleChipSelected = useCallback(
    (t: BlockType) => {
      const { startMin, endMin } = plannedDnC.confirmChip(t);
      withLongCheck(startMin, endMin, t, "planned");
    },
    [plannedDnC, withLongCheck],
  );

  const handleDragWithoutType = useCallback(() => {
    const { startMin, endMin } = plannedDnC.confirmWithoutType();
    withLongCheck(startMin, endMin, undefined, "planned");
  }, [plannedDnC, withLongCheck]);

  const handleActualChipSelected = useCallback(
    (t: BlockType) => {
      const { startMin, endMin } = actualDnC.confirmChip(t);
      withLongCheck(startMin, endMin, t, "actual");
    },
    [actualDnC, withLongCheck],
  );

  const handleActualWithoutType = useCallback(() => {
    const { startMin, endMin } = actualDnC.confirmWithoutType();
    withLongCheck(startMin, endMin, undefined, "actual");
  }, [actualDnC, withLongCheck]);

  const handleOpenBlock = useCallback(
    (block?: TimeBlock, col: "planned" | "actual" = "actual") => {
      if (!report) return;
      if (isReadOnly(report)) {
        addToast({
          type: "warning",
          message: "提出済みの日報は変更できません",
        });
        return;
      }
      if (col === "actual" && !canEditActual(report)) {
        addToast({
          type: "warning",
          message: "実績の入力は「予定を確定する」後に行えます",
        });
        return;
      }
      if (block) {
        setBlockModal({
          open: true,
          col: block.isPlanned ? "planned" : "actual",
          block: { ...block },
          isNew: false,
          focusCustomer: false,
        });
      } else {
        const nowH = new Date().getHours(),
          nowM = Math.floor(new Date().getMinutes() / SNAP) * SNAP;
        const s = nowH * 60 + nowM,
          e = Math.min(s + 60, DAY_END);
        const pa =
          col === "planned"
            ? { isPlanned: true, isActual: false }
            : { isPlanned: false, isActual: true };
        setBlockModal({
          open: true,
          col,
          block: {
            startTime: minutesToTime(s),
            endTime: minutesToTime(e),
            title: "",
            memo: "",
            ...pa,
            attachments: [],
          },
          isNew: true,
          focusCustomer: true,
        });
      }
    },
    [report, addToast],
  );

  const handleSaveBlock = useCallback(() => {
    if (!report) return;
    if (blockModal.col === "actual" && !canEditActual(report)) {
      addToast({
        type: "warning",
        message: "実績の入力は「実績入力中」のみ可能です",
      });
      return;
    }
    if (blockModal.col === "planned" && !canEditPlanned(report)) {
      addToast({ type: "warning", message: "提出済みの日報は変更できません" });
      return;
    }
    const b = blockModal.block;
    if (!b.startTime || !b.endTime || !b.type) {
      addToast({
        type: "error",
        message: "アクティビティ種別と時間は必須です",
      });
      return;
    }
    if (blockModal.isNew) {
      addBlock(report.id, b as Omit<TimeBlock, "id">);
      addToast({ type: "success", message: "時間ブロックを追加しました" });
    } else {
      updateBlock(report.id, b.id!, b);
      addToast({ type: "success", message: "時間ブロックを更新しました" });
    }
    if (continueInput) {
      const endMin = timeToMinutes(b.endTime!);
      setBlockModal({
        open: true,
        block: {
          type: b.type,
          startTime: b.endTime!,
          endTime: minutesToTime(Math.min(endMin + 60, DAY_END)),
          title: b.type ? BLOCK_LABELS[b.type] : "",
          memo: "",
          isPlanned: blockModal.col === "planned",
          isActual: blockModal.col === "actual",
          attachments: [],
        },
        isNew: true,
        col: blockModal.col,
        focusCustomer: false,
      });
    } else {
      setBlockModal({
        open: false,
        block: {},
        isNew: true,
        col: "actual",
        focusCustomer: false,
      });
    }
  }, [report, blockModal, continueInput, addBlock, updateBlock, addToast]);

  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      if (!report) return;
      if (isReadOnly(report)) {
        addToast({
          type: "warning",
          message: "提出済みの日報は変更できません",
        });
        return;
      }
      deleteBlock(report.id, blockId);
      addToast({
        type: "info",
        message: "削除しました",
        undoFn: () =>
          addToast({ type: "info", message: "（元に戻す機能はモックです）" }),
      });
      setBlockModal({
        open: false,
        block: {},
        isNew: true,
        col: "actual",
        focusCustomer: false,
      });
    },
    [report, deleteBlock, addToast],
  );

  const handleActualize = useCallback(
    (block: TimeBlock) => {
      if (!report) return;
      if (!canEditActual(report)) {
        addToast({
          type: "warning",
          message:
            "実績化は「実績入力中」のみ可能です。「予定を確定する」を押してください",
        });
        return;
      }
      addBlock(report.id, {
        reportId: block.reportId,
        type: block.type,
        startTime: block.startTime,
        endTime: block.endTime,
        title: block.title,
        memo: block.memo,
        customerId: block.customerId,
        isPlanned: false,
        isActual: true,
        plannedBlockId: block.id,
        attachments: block.attachments.map((a) => ({ ...a })),
      });
      addToast({
        type: "success",
        message:
          "✅ 実績ブロックを生成しました。ドラッグで時間を調整できます。",
      });
    },
    [report, addBlock, addToast],
  );

  const confirmLongBlock = useCallback(() => {
    setShowLongBlock(false);
    if (pendingLong) {
      openFromDrag(
        pendingLong.startMin,
        pendingLong.endMin,
        pendingLong.type,
        pendingLong.col ?? "actual",
      );
      setPendingLong(null);
    }
  }, [pendingLong, openFromDrag]);

  const cancelLongBlock = useCallback(() => {
    setShowLongBlock(false);
    setPendingLong(null);
    plannedDnC.cancelDrag();
  }, [plannedDnC]);

  return {
    blockModal,
    setBlockModal,
    continueInput,
    setContinueInput,
    showLongBlock,
    pendingLong,
    handleChipSelected,
    handleDragWithoutType,
    handleActualChipSelected,
    handleActualWithoutType,
    handleOpenBlock,
    handleSaveBlock,
    handleDeleteBlock,
    handleActualize,
    confirmLongBlock,
    cancelLongBlock,
  };
}
