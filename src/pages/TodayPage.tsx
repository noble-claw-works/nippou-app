import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { Plus, Clock, Send, Eye, X, Check } from 'lucide-react';
import { useAppStore } from '../store';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  BLOCK_COLORS, BLOCK_EMOJIS, BLOCK_LABELS, MOOD_EMOJIS,
  timeToMinutes, minutesToTime, formatDate,
} from '../utils';
import type { BlockType, MoodType, ManagerSignal, TimeBlock } from '../types';
import {
  ChipPopover, useDragAndChip,
  DAY_START, DAY_END, HOUR_PX, SNAP, BLOCK_TYPES, minuteToY,
} from '../components/timeline/DragAndChip';
import { useBlockDrag } from '../components/timeline/useBlockDrag';

// ─── helpers ─────────────────────────────────────────────────────────────────
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

interface BlockModalState {
  open: boolean;
  block: Partial<TimeBlock>;
  isNew: boolean;
  /** which column opened this dialog — determines isPlanned/isActual */
  col: 'planned' | 'actual';
  /** when true, auto-focus customer field; when false, focus type chips */
  focusCustomer: boolean;
}

// ─── component ────────────────────────────────────────────────────────────────
export function TodayPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayDisplay = formatDate(today);
  const {
    getTodayReport, createReport, updateReport, updateBlock, deleteBlock, addBlock,
    addTodo, toggleTodo, deleteTodo, submitReport, withdrawReport,
    customers, currentUserId, addToast, trackingSession, startTracking, stopTracking, discardTracking,
  } = useAppStore();

  const isMobile = useIsMobile();
  const timelineRef = useRef<HTMLDivElement>(null);
  const actualColRef = useRef<HTMLDivElement>(null);

  const [report, setReport] = useState(() => getTodayReport());
  const [showStartModal, setShowStartModal]   = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showTrackModal, setShowTrackModal]   = useState(false);
  const [showLongBlockConfirm, setShowLongBlockConfirm] = useState(false);
  const [pendingLongBlock, setPendingLongBlock] = useState<{ startMin: number; endMin: number; type?: BlockType } | null>(null);

  const [blockModal, setBlockModal] = useState<BlockModalState>({
    open: false, block: {}, isNew: true, col: 'actual', focusCustomer: false,
  });
  const [continueInput, setContinueInput] = useState(false);
  const customerSelectRef = useRef<HTMLSelectElement>(null);
  const typeChipRef = useRef<HTMLButtonElement>(null);

  const [trackType, setTrackType]       = useState<BlockType>('visit');
  const [trackCustomer, setTrackCustomer] = useState('');
  const [elapsedSecs, setElapsedSecs]   = useState(0);
  const timerRef = useRef<number | undefined>(undefined);

  // ── D&C hook ───────────────────────────────────────────────────────────────
  const onReportRequired = useCallback((): boolean => {
    if (!getTodayReport()) {
      addToast({ type: 'warning', message: '先に日報を作成してください' });
      setShowStartModal(true);
      return false;
    }
    return true;
  }, [getTodayReport, addToast]);

  const {
    dragState, chipVisible,
    onTimelineMouseDown, onTimelineTouchStart,
    confirmChip, confirmWithoutType, cancelDrag,
  } = useDragAndChip(timelineRef, onReportRequired);

  // ── block move / resize ────────────────────────────────────────────────────
  const { blockDragState, startDrag } = useBlockDrag({
    containerRef: timelineRef,
    actualRef: actualColRef,
    onCommit: (blockId, startMin, endMin) => {
      if (!report) return;
      updateBlock(report.id, blockId, {
        startTime: minutesToTime(startMin),
        endTime:   minutesToTime(endMin),
      });
    },
  });

  // ── report polling ─────────────────────────────────────────────────────────
  useEffect(() => {
    const r = getTodayReport();
    if (!r) setShowStartModal(true);
    setReport(r);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setReport(getTodayReport()), 500);
    return () => clearInterval(interval);
  }, []);

  // ── tracking timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (trackingSession) {
      timerRef.current = setInterval(() => {
        setElapsedSecs(Math.floor((Date.now() - new Date(trackingSession.startedAt).getTime()) / 1000));
      }, 1000) as unknown as number;
    } else {
      clearInterval(timerRef.current);
      setElapsedSecs(0);
    }
    return () => clearInterval(timerRef.current);
  }, [trackingSession]);

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // ── auto-focus after dialog open ───────────────────────────────────────────
  useEffect(() => {
    if (!blockModal.open) return;
    const id = setTimeout(() => {
      if (blockModal.focusCustomer) {
        customerSelectRef.current?.focus();
      } else {
        typeChipRef.current?.focus();
      }
    }, 80);
    return () => clearTimeout(id);
  }, [blockModal.open, blockModal.focusCustomer]);

  // ── D&C chip selection ─────────────────────────────────────────────────────
  const handleChipSelected = (type: BlockType) => {
    const { startMin, endMin } = confirmChip(type);
    // 8h check
    if (endMin - startMin >= 8 * 60) {
      setPendingLongBlock({ startMin, endMin, type });
      setShowLongBlockConfirm(true);
      return;
    }
    openDialogFromDrag(startMin, endMin, type);
  };

  const handleDragWithoutType = () => {
    const { startMin, endMin } = confirmWithoutType();
    if (endMin - startMin >= 8 * 60) {
      setPendingLongBlock({ startMin, endMin });
      setShowLongBlockConfirm(true);
      return;
    }
    openDialogFromDrag(startMin, endMin, undefined);
  };

  const openDialogFromDrag = (startMin: number, endMin: number, type?: BlockType, col: 'planned' | 'actual' = 'actual') => {
    const pa = col === 'planned'
      ? { isPlanned: true,  isActual: false }
      : { isPlanned: false, isActual: true  };
    setBlockModal({
      open: true,
      col,
      block: {
        type: type ?? 'visit',
        startTime: minutesToTime(startMin),
        endTime:   minutesToTime(Math.min(endMin, DAY_END)),
        title: type ? BLOCK_LABELS[type] : '',
        memo: '', ...pa, attachments: [],
      },
      isNew: true,
      focusCustomer: !!type,
    });
  };

  const handleLongBlockConfirm = () => {
    setShowLongBlockConfirm(false);
    if (pendingLongBlock) {
      openDialogFromDrag(pendingLongBlock.startMin, pendingLongBlock.endMin, pendingLongBlock.type);
      setPendingLongBlock(null);
    }
  };

  // ── quick chip (existing C route) ──────────────────────────────────────────
  const handleChipClick = (type: BlockType, col: 'planned' | 'actual' = 'actual') => {
    if (!report) { addToast({ type: 'warning', message: '先に日報を作成してください' }); return; }
    const nowH = new Date().getHours();
    const nowM = Math.floor(new Date().getMinutes() / SNAP) * SNAP;
    const startMin = nowH * 60 + nowM;
    const endMin   = Math.min(startMin + 60, DAY_END);
    const pa = col === 'planned'
      ? { isPlanned: true,  isActual: false }
      : { isPlanned: false, isActual: true  };
    setBlockModal({
      open: true,
      col,
      block: {
        type,
        startTime: minutesToTime(startMin),
        endTime:   minutesToTime(endMin),
        title: BLOCK_LABELS[type], memo: '', ...pa, attachments: [],
      },
      isNew: true,
      focusCustomer: true,
    });
  };

  // ── 予定 → 実績化ワンタップ ─────────────────────────────────────────
  const handleActualize = (block: TimeBlock) => {
    if (!report) return;
    // 予定ブロックのスナップショットで実績ブロックを新規生成。
    // attachments はディープコピーして独立データにする。
    const actualBlock: Omit<TimeBlock, 'id'> = {
      reportId:      block.reportId,
      type:          block.type,
      startTime:     block.startTime,
      endTime:       block.endTime,
      title:         block.title,
      memo:          block.memo,
      customerId:    block.customerId,
      isPlanned:     false,
      isActual:      true,
      plannedBlockId: block.id,   // リンクを保持
      attachments:   block.attachments.map(a => ({ ...a })),  // shallow clone each attachment
    };
    addBlock(report.id, actualBlock);
    addToast({ type: 'success', message: '✅ 実績ブロックを生成しました。ドラッグで時間を調整できます。' });
  };

  // ── block modal ────────────────────────────────────────────────────────────
  const handleOpenBlock = (block?: TimeBlock, col: 'planned' | 'actual' = 'actual') => {
    if (block) {
      const c: 'planned' | 'actual' = block.isPlanned ? 'planned' : 'actual';
      setBlockModal({ open: true, col: c, block: { ...block }, isNew: false, focusCustomer: false });
    } else {
      const nowH = new Date().getHours();
      const nowM = Math.floor(new Date().getMinutes() / SNAP) * SNAP;
      const startMin = nowH * 60 + nowM;
      const endMin   = Math.min(startMin + 60, DAY_END);
      const pa = col === 'planned'
        ? { isPlanned: true,  isActual: false }
        : { isPlanned: false, isActual: true  };
      setBlockModal({
        open: true,
        col,
        block: {
          type: 'visit',
          startTime: minutesToTime(startMin),
          endTime:   minutesToTime(endMin),
          title: '', memo: '', ...pa, attachments: [],
        },
        isNew: true,
        focusCustomer: false,
      });
    }
  };

  const handleSaveBlock = () => {
    if (!report) return;
    const b = blockModal.block;
    if (!b.startTime || !b.endTime || !b.type) return;
    if (blockModal.isNew) {
      addBlock(report.id, b as Omit<TimeBlock, 'id'>);
      addToast({ type: 'success', message: '時間ブロックを追加しました' });
    } else {
      updateBlock(report.id, b.id!, b);
      addToast({ type: 'success', message: '時間ブロックを更新しました' });
    }
    if (continueInput) {
      // 保存して続けて入力: keep dialog open with cleared fields
      const endMin = timeToMinutes(b.endTime!);
      setBlockModal({
        open: true,
        block: {
          type: b.type,
          startTime: b.endTime!,
          endTime: minutesToTime(Math.min(endMin + 60, DAY_END)),
          title: '', memo: '', isPlanned: false, isActual: true, attachments: [],
        },
        isNew: true,
        col: blockModal.col,
        focusCustomer: true,
      });
    } else {
      setBlockModal({ open: false, block: {}, isNew: true, col: 'actual', focusCustomer: false });
    }
  };

  const handleDeleteBlock = (blockId: string) => {
    if (!report) return;
    deleteBlock(report.id, blockId);
    addToast({ type: 'info', message: '削除しました', undoFn: () => addToast({ type: 'info', message: '（元に戻す機能はモックです）' }) });
    setBlockModal({ open: false, block: {}, isNew: true, col: 'actual', focusCustomer: false });
  };

  const handleStopTracking = () => {
    const block = stopTracking();
    if (block && report) {
      addBlock(report.id, { ...block, reportId: report.id });
      addToast({ type: 'success', message: 'タイムトラッキングを終了し、ブロックを追加しました' });
    }
  };

  const handleStartReport = (mode: 'copy_prev' | 'template' | 'blank') => {
    const r = createReport(currentUserId, today);
    setShowStartModal(false);
    addToast({ type: 'success', message: '日報を作成しました' });
    if (mode === 'copy_prev') addToast({ type: 'info', message: '前日の予定を引き継ぎました（モック）' });
    setReport(r);
  };

  const handleSubmit = () => {
    if (!report) return;
    submitReport(report.id);
    setShowSubmitModal(false);
    addToast({ type: 'success', message: '日報を提出しました ✓' });
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Tracking Banner */}
      {trackingSession && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-medium text-red-700">
            🔴 トラッキング中: {BLOCK_EMOJIS[trackingSession.blockType]} {BLOCK_LABELS[trackingSession.blockType]}
            {trackingSession.customerId && ` - ${customers.find(c => c.id === trackingSession.customerId)?.name}`}
          </span>
          <span className="text-sm font-mono text-red-600">⏱ {formatElapsed(elapsedSecs)}</span>
          <div className="flex-1" />
          <button onClick={handleStopTracking}
            className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700">⏹ 終了</button>
          <button onClick={discardTracking}
            className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">破棄</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-gray-900">{todayDisplay}</h1>
              {report && <StatusBadge status={report.status} />}
            </div>
            <button onClick={() => setShowTrackModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              <Clock className="w-3.5 h-3.5" /> トラッキング開始
            </button>
          </div>

          {!report ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-gray-600 mb-4">今日の日報を始めましょう</p>
              <button onClick={() => setShowStartModal(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                日報を作成する
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Timeline */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-gray-700">📅 タイムライン</span>
                      <span className="ml-2 text-xs text-gray-400">← 空白をドラッグして素早く入力</span>
                    </div>
                  </div>

                  {/* ── 2列タイムライングリッド ─────────────────────────────── */}
                  {/* 列ヘッダー */}
                  <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: '40px 1fr 1px 1fr' }}>
                    <div />
                    <div className="px-2 py-1.5 flex items-center justify-between bg-indigo-50">
                      <span className="text-xs font-semibold text-indigo-600">📋 予定</span>
                      <button onClick={() => handleOpenBlock(undefined, 'planned')}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-indigo-600 hover:bg-indigo-100 rounded">
                        <Plus className="w-3 h-3" /> 追加
                      </button>
                    </div>
                    <div className="bg-gray-200" />
                    <div className="px-2 py-1.5 flex items-center justify-between bg-emerald-50">
                      <span className="text-xs font-semibold text-emerald-600">✅ 実績</span>
                      <button onClick={() => handleOpenBlock(undefined, 'actual')}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-emerald-600 hover:bg-emerald-100 rounded">
                        <Plus className="w-3 h-3" /> 追加
                      </button>
                    </div>
                  </div>

                  {/* タイムライン本体（時刻軸 + 左=予定列 + 右=実績列） */}
                  <div className="flex" style={{ height: `${((DAY_END - DAY_START) / 60) * HOUR_PX + 32}px` }}>

                    {/* 時刻軸 */}
                    <div className="relative flex-shrink-0" style={{ width: '40px' }}>
                      {Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }).map((_, i) => {
                        const min = DAY_START + i * 60;
                        const h = Math.floor(min / 60);
                        const m = min % 60;
                        return (
                          <div key={i} style={{ top: `${minuteToY(min) + 8}px` }}
                            className="absolute right-1 text-[10px] text-gray-400 leading-none pointer-events-none">
                            {h}:{String(m).padStart(2, '0')}
                          </div>
                        );
                      })}
                    </div>

                    {/* 予定列 */}
                    <div
                      ref={timelineRef}
                      className="relative flex-1 border-r border-gray-100 select-none bg-indigo-50/20"
                      style={{ cursor: dragState?.active ? 'ns-resize' : 'crosshair' }}
                      onMouseDown={onTimelineMouseDown}
                      onTouchStart={onTimelineTouchStart}
                    >
                      {/* 横罫線 */}
                      {Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }).map((_, i) => (
                        <div key={i} style={{ top: `${minuteToY(DAY_START + i * 60) + 8}px` }}
                          className="absolute left-0 right-0 border-t border-gray-100 pointer-events-none" />
                      ))}

                      {/* 予定ブロック（isPlanned=true） */}
                      {report.blocks.filter(b => b.isPlanned).map(block => {
                        const isDragging = blockDragState?.blockId === block.id;
                        const startMin = isDragging ? blockDragState!.startMin : timeToMinutes(block.startTime);
                        const endMin   = isDragging ? blockDragState!.endMin   : timeToMinutes(block.endTime);
                        const top    = minuteToY(startMin) + 8;
                        const height = Math.max(((endMin - startMin) / 60) * HOUR_PX - 4, 24);
                        const colorClass = BLOCK_COLORS[block.type];
                        const origStart = timeToMinutes(block.startTime);
                        const origEnd   = timeToMinutes(block.endTime);
                        const isPlannedOnly = block.isPlanned && !block.isActual;
                        return (
                          <div
                            key={block.id}
                            data-block="true"
                            style={{
                              top: `${top}px`, height: `${height}px`,
                              left: '4px', right: '4px',
                              cursor: isDragging ? 'grabbing' : 'grab',
                              opacity: isDragging ? 0.85 : 1,
                              zIndex: isDragging ? 20 : 10,
                              transition: isDragging ? 'none' : 'box-shadow 0.15s',
                            }}
                            className={`absolute rounded-lg px-2 py-1 select-none group hover:shadow-md border-dashed ${colorClass}`}
                            onMouseDown={e => { startDrag(e, block.id, 'move', origStart, origEnd); }}
                            onClick={e => { if (isDragging) { e.stopPropagation(); return; } handleOpenBlock(block, 'planned'); }}
                          >
                            <div className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize z-10"
                              onMouseDown={e => startDrag(e, block.id, 'resizeTop', origStart, origEnd)} />
                            <div className="flex items-center gap-1 text-xs font-medium truncate pointer-events-none">
                              <span>{BLOCK_EMOJIS[block.type]}</span>
                              <span className="truncate">{block.title || BLOCK_LABELS[block.type]}</span>
                            </div>
                            <div className="text-[10px] text-current opacity-70 pointer-events-none">
                              {minutesToTime(startMin)}–{minutesToTime(endMin)}
                            </div>
                            {/* ✅ 実績化ボタン */}
                            {isPlannedOnly && height >= 32 && (
                              <button
                                className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-md shadow hover:bg-emerald-600 transition-all z-20"
                                onMouseDown={e => e.stopPropagation()}
                                onClick={e => { e.stopPropagation(); handleActualize(block); }}
                                title="実績ブロックを生成"
                              >
                                ✅ 実績化
                              </button>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-10"
                              onMouseDown={e => startDrag(e, block.id, 'resizeBottom', origStart, origEnd)} />
                          </div>
                        );
                      })}

                      {/* D&C 仮ブロック（予定列で操作） */}
                      {dragState?.active && (
                        <div
                          style={{
                            top: `${minuteToY(dragState.startMin) + 8}px`,
                            height: `${Math.max(((dragState.endMin - dragState.startMin) / 60) * HOUR_PX - 4, 20)}px`,
                            left: '4px', right: '4px',
                          }}
                          className="absolute rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/60 pointer-events-none z-10 flex items-start px-2 py-1"
                        >
                          <span className="text-xs text-blue-600 font-medium mt-0.5 truncate">
                            {`${minutesToTime(dragState.startMin)} - ${minutesToTime(dragState.endMin)}`}
                            {' ⏱'}
                            {(() => { const dur = dragState.endMin - dragState.startMin; const h = Math.floor(dur / 60); const m = dur % 60; return h > 0 && m > 0 ? `${h}h${m}m` : h > 0 ? `${h}h` : `${m}m`; })()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 実績列 */}
                    <div ref={actualColRef} className="relative flex-1 select-none bg-emerald-50/20">
                      {/* 横罫線 */}
                      {Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }).map((_, i) => (
                        <div key={i} style={{ top: `${minuteToY(DAY_START + i * 60) + 8}px` }}
                          className="absolute left-0 right-0 border-t border-gray-100 pointer-events-none" />
                      ))}

                      {/* 実績ブロック（isActual=true） */}
                      {report.blocks.filter(b => b.isActual).map(block => {
                        const isDragging = blockDragState?.blockId === block.id;
                        const startMin = isDragging ? blockDragState!.startMin : timeToMinutes(block.startTime);
                        const endMin   = isDragging ? blockDragState!.endMin   : timeToMinutes(block.endTime);
                        const top    = minuteToY(startMin) + 8;
                        const height = Math.max(((endMin - startMin) / 60) * HOUR_PX - 4, 24);
                        const colorClass = BLOCK_COLORS[block.type];
                        const origStart = timeToMinutes(block.startTime);
                        const origEnd   = timeToMinutes(block.endTime);
                        return (
                          <div
                            key={block.id}
                            data-block="true"
                            style={{
                              top: `${top}px`, height: `${height}px`,
                              left: '4px', right: '4px',
                              cursor: isDragging ? 'grabbing' : 'grab',
                              opacity: isDragging ? 0.85 : 1,
                              zIndex: isDragging ? 20 : 10,
                              transition: isDragging ? 'none' : 'box-shadow 0.15s',
                            }}
                            className={`absolute rounded-lg px-2 py-1 select-none group hover:shadow-md border-solid ${colorClass}`}
                            onMouseDown={e => { startDrag(e, block.id, 'move', origStart, origEnd, 'actual'); }}
                            onClick={e => { if (isDragging) { e.stopPropagation(); return; } handleOpenBlock(block, 'actual'); }}
                          >
                            <div className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize z-10"
                              onMouseDown={e => startDrag(e, block.id, 'resizeTop', origStart, origEnd, 'actual')} />
                            <div className="flex items-center gap-1 text-xs font-medium truncate pointer-events-none">
                              <span>{BLOCK_EMOJIS[block.type]}</span>
                              <span className="truncate">{block.title || BLOCK_LABELS[block.type]}</span>
                            </div>
                            <div className="text-[10px] text-current opacity-70 pointer-events-none">
                              {minutesToTime(startMin)}–{minutesToTime(endMin)}
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-10"
                              onMouseDown={e => startDrag(e, block.id, 'resizeBottom', origStart, origEnd, 'actual')} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Side Cards */}
              <div className="space-y-4">
                {/* TODO Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">✅ TODO</span>
                    <button onClick={() => {
                      const text = prompt('TODO を入力');
                      if (text) addTodo(report.id, text);
                    }} className="p-1 rounded hover:bg-gray-100">
                      <Plus className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {report.todos.length === 0 && <p className="text-xs text-gray-400">TODOがありません</p>}
                    {report.todos.map(todo => (
                      <div key={todo.id} className="flex items-center gap-2 group">
                        <button onClick={() => toggleTodo(report.id, todo.id)}
                          className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${todo.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                          {todo.completed && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <span className={`flex-1 text-sm ${todo.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {todo.text}
                        </span>
                        <button onClick={() => deleteTodo(report.id, todo.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-100 rounded">
                          <X className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Visits */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <span className="text-sm font-semibold text-gray-700 block mb-3">👥 顧客対応</span>
                  {report.blocks.filter(b => b.customerId).length === 0 ? (
                    <p className="text-xs text-gray-400">ブロックに顧客を設定してください</p>
                  ) : (
                    <div className="space-y-2">
                      {report.blocks.filter(b => b.customerId).map(block => (
                        <div key={block.id} className="flex items-center gap-2 text-sm">
                          <span>{BLOCK_EMOJIS[block.type]}</span>
                          <span className="text-gray-700 truncate">
                            {customers.find(c => c.id === block.customerId)?.name ?? block.customerId}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mood */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <span className="text-sm font-semibold text-gray-700 block mb-3">🌤 振り返り</span>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">朝の気分</p>
                      <div className="flex gap-2">
                        {(['sunny', 'partly_cloudy', 'cloudy', 'rainy'] as MoodType[]).map(m => (
                          <button key={m} onClick={() => updateReport(report.id, { morningMood: m })}
                            className={`text-lg p-1 rounded-lg ${report.morningMood === m ? 'bg-blue-50 ring-2 ring-blue-400' : 'hover:bg-gray-50'}`}>
                            {MOOD_EMOJIS[m]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">終わりの気分</p>
                      <div className="flex gap-2">
                        {(['sunny', 'partly_cloudy', 'cloudy', 'rainy'] as MoodType[]).map(m => (
                          <button key={m} onClick={() => updateReport(report.id, { eveningMood: m })}
                            className={`text-lg p-1 rounded-lg ${report.eveningMood === m ? 'bg-blue-50 ring-2 ring-blue-400' : 'hover:bg-gray-50'}`}>
                            {MOOD_EMOJIS[m]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">上長への合図</p>
                      <div className="flex gap-2">
                        {([['consult', '💬 相談したい'], ['listen', '👂 聞いて'], ['ok', '👍 今は大丈夫']] as [ManagerSignal, string][]).map(([v, label]) => (
                          <button key={v!} onClick={() => updateReport(report.id, { managerSignal: v })}
                            className={`px-2 py-1 text-xs rounded-lg border ${report.managerSignal === v ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      {report && (
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-4">
          <span className="text-xs text-gray-400">💾 自動保存</span>
          <div className="flex items-center gap-2">
            {['draft', 'submitted', 'confirmed'].map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-full ${
                  (s === 'draft' && ['draft', 'submitted', 'confirmed'].includes(report.status)) ||
                  (s === 'submitted' && ['submitted', 'confirmed'].includes(report.status)) ||
                  (s === 'confirmed' && report.status === 'confirmed')
                    ? 'bg-blue-500' : 'bg-gray-200'
                }`} />
                <span className="text-xs text-gray-500">{['下書き', '提出済', '確認済'][i]}</span>
                {i < 2 && <div className="w-6 h-0.5 bg-gray-200" />}
              </div>
            ))}
          </div>
          <div className="flex-1" />
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            <Eye className="w-3.5 h-3.5" /> プレビュー
          </button>
          {report.status === 'draft' && (
            <button onClick={() => setShowSubmitModal(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Send className="w-3.5 h-3.5" /> 提出する
            </button>
          )}
          {report.status === 'submitted' && (
            <button onClick={() => { withdrawReport(report.id); addToast({ type: 'info', message: '日報を取り下げました' }); }}
              className="px-4 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              取り下げ
            </button>
          )}
        </div>
      )}

      {/* ── D&C Chip Popover ─────────────────────────────────────────────────── */}
      {chipVisible && dragState && (
        <ChipPopover
          dragState={dragState}
          onSelectChip={handleChipSelected}
          onOpenWithoutType={handleDragWithoutType}
          onCancel={cancelDrag}
          isMobile={isMobile}
        />
      )}

      {/* ── Long block confirmation ───────────────────────────────────────────── */}
      <ConfirmDialog
        open={showLongBlockConfirm}
        title="長い時間ブロック"
        message="8時間以上のブロックを作成しますか？誤操作の可能性があります。"
        confirmLabel="作成する"
        onConfirm={handleLongBlockConfirm}
        confirmVariant="primary"
        onClose={() => { setShowLongBlockConfirm(false); setPendingLongBlock(null); cancelDrag(); }}
      />

      {/* Start Modal */}
      <Modal open={showStartModal} onClose={() => setShowStartModal(false)}
        title="今日の日報をどう始めますか？" size="sm"
        closeOnBackdrop={false}>
        <div className="space-y-2">
          {[
            { id: 'copy_prev', emoji: '📋', title: '前日の予定をコピー', sub: 'おすすめ' },
            { id: 'template', emoji: '🧩', title: 'テンプレートから始める', sub: '' },
            { id: 'blank', emoji: '✨', title: '白紙から始める', sub: '' },
          ].map(opt => (
            <button key={opt.id} onClick={() => handleStartReport(opt.id as any)}
              className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 text-left transition-colors">
              <span className="text-2xl">{opt.emoji}</span>
              <div>
                <span className="text-sm font-medium text-gray-800">{opt.title}</span>
                {opt.sub && <span className="ml-2 text-xs text-blue-600 font-medium">[{opt.sub}]</span>}
              </div>
            </button>
          ))}
        </div>
      </Modal>

      {/* Submit Modal */}
      {report && (
        <Modal open={showSubmitModal} onClose={() => setShowSubmitModal(false)}
          title="提出前の確認" size="sm" closeOnBackdrop={false}
          footer={
            <>
              <button onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                ← 戻る
              </button>
              <button onClick={handleSubmit}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                ✓ 提出する
              </button>
            </>
          }>
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">📊 時間ブロック</span>
                <span className="font-medium">{report.blocks.length} 件</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">✅ TODO</span>
                <span className="font-medium">完了 {report.todos.filter(t => t.completed).length} / {report.todos.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">🌤 気分</span>
                <span className="font-medium">
                  {report.morningMood ? MOOD_EMOJIS[report.morningMood] : '未設定'} →
                  {report.eveningMood ? MOOD_EMOJIS[report.eveningMood] : '未設定'}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600">上長（佐藤 健一）に提出します。</p>
          </div>
        </Modal>
      )}

      {/* Block Modal */}
      <Modal open={blockModal.open} onClose={() => setBlockModal(s => ({ ...s, open: false }))}
        title={blockModal.isNew
          ? (blockModal.col === 'planned' ? '📋 予定を追加' : '✅ 実績を追加')
          : (blockModal.col === 'planned' ? '📋 予定を編集' : '✅ 実績を編集')
        } size="sm"
        footer={
          <>
            {!blockModal.isNew && (
              <button onClick={() => handleDeleteBlock(blockModal.block.id!)}
                className="mr-auto px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                🗑 削除
              </button>
            )}
            <button onClick={() => setBlockModal(s => ({ ...s, open: false }))}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              キャンセル
            </button>
            <button onClick={handleSaveBlock}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              ✓ 保存
            </button>
          </>
        }>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">開始時刻</label>
              <input type="time" value={blockModal.block.startTime ?? ''} step={900}
                onChange={e => setBlockModal(s => ({ ...s, block: { ...s.block, startTime: e.target.value } }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">終了時刻</label>
              <input type="time" value={blockModal.block.endTime ?? ''} step={900}
                onChange={e => setBlockModal(s => ({ ...s, block: { ...s.block, endTime: e.target.value } }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">アクティビティ種別</label>
            <div className="flex flex-wrap gap-2">
              {BLOCK_TYPES.map((type, idx) => (
                <button
                  key={type}
                  ref={idx === 0 && !blockModal.focusCustomer ? typeChipRef : undefined}
                  onClick={() => setBlockModal(s => ({ ...s, block: { ...s.block, type } }))}
                  className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${blockModal.block.type === type ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {BLOCK_EMOJIS[type]} {BLOCK_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">顧客（任意）</label>
            <select
              ref={customerSelectRef}
              value={blockModal.block.customerId ?? ''}
              onChange={e => setBlockModal(s => ({ ...s, block: { ...s.block, customerId: e.target.value || undefined } }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="">選択しない</option>
              {customers.filter(c => c.status === 'active').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">内容</label>
            <input type="text" value={blockModal.block.title ?? ''}
              onChange={e => setBlockModal(s => ({ ...s, block: { ...s.block, title: e.target.value } }))}
              placeholder="活動内容を入力"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">メモ</label>
            <textarea value={blockModal.block.memo ?? ''}
              onChange={e => setBlockModal(s => ({ ...s, block: { ...s.block, memo: e.target.value } }))}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
          </div>
          {blockModal.isNew && (
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={continueInput}
                onChange={e => setContinueInput(e.target.checked)}
                className="rounded border-gray-300" />
              ☑ 保存して続けて入力
            </label>
          )}
        </div>
      </Modal>

      {/* Tracking Modal */}
      <Modal open={showTrackModal} onClose={() => setShowTrackModal(false)}
        title="何を始めますか？" size="sm"
        footer={
          <>
            <button onClick={() => setShowTrackModal(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg">
              キャンセル
            </button>
            <button onClick={() => {
              startTracking(trackType, trackCustomer || undefined);
              setShowTrackModal(false);
              addToast({ type: 'success', message: 'トラッキングを開始しました' });
            }}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              ▶ 開始する
            </button>
          </>
        }>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">種別を選択</label>
            <div className="flex flex-wrap gap-2">
              {BLOCK_TYPES.map(type => (
                <button key={type} onClick={() => setTrackType(type)}
                  className={`px-3 py-2 text-xs rounded-xl border transition-colors ${trackType === type ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {BLOCK_EMOJIS[type]} {BLOCK_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">顧客（任意）</label>
            <select value={trackCustomer}
              onChange={e => setTrackCustomer(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">選択しない</option>
              {customers.filter(c => c.status === 'active').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
