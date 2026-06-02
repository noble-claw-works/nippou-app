import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { useAppStore } from '../store';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { BLOCK_EMOJIS, BLOCK_LABELS, minutesToTime, formatDate, timeToMinutes } from '../utils';
import type { BlockType, TimeBlock } from '../types';
import { DAY_END, SNAP, BLOCK_TYPES, useDragAndChip } from '../components/timeline/DragAndChip';
import { useBlockDrag } from '../components/timeline/useBlockDrag';
import { TimelinePanel } from '../components/today/TimelinePanel';
import { BlockModal, type BlockModalState } from '../components/today/BlockModal';
import { SidePanelCards } from '../components/today/SidePanelCards';
import { TrackingBanner } from '../components/today/TrackingBanner';
import { StatusBar, StatusStepper, SubmitModalContent } from '../components/today/StatusBar';

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mobile;
}

export function TodayPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const {
    getTodayReport, createReport, updateReport, updateBlock, deleteBlock, addBlock,
    addTodo, toggleTodo, deleteTodo, confirmPlanning, submitReport, withdrawReport,
    customers, currentUserId, addToast,
    trackingSession, startTracking, stopTracking, discardTracking,
  } = useAppStore();

  const isMobile      = useIsMobile();
  const timelineRef   = useRef<HTMLDivElement>(null);
  const actualColRef  = useRef<HTMLDivElement>(null);

  // store から直接購読（ポーリング廃止）
  const report = useAppStore(s => s.reports.find(r => r.date === today && r.userId === s.currentUserId) ?? null);
  const [showStartModal, setShowStartModal]   = useState(() => !getTodayReport());
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showTrackModal, setShowTrackModal]   = useState(false);
  const [showLongBlock, setShowLongBlock]     = useState(false);
  const [pendingLong, setPendingLong]         = useState<{ startMin: number; endMin: number; type?: BlockType; col?: 'planned' | 'actual' } | null>(null);
  const [blockModal, setBlockModal]           = useState<BlockModalState>({ open: false, block: {}, isNew: true, col: 'actual', focusCustomer: false });
  const [continueInput, setContinueInput]     = useState(false);
  const [trackType, setTrackType]             = useState<BlockType>('visit');
  const [trackCustomer, setTrackCustomer]     = useState('');
  const [elapsedSecs, setElapsedSecs]         = useState(0);
  const timerRef = useRef<number | undefined>(undefined);

  // ステータスガード
  const canEditPlanned  = (r: typeof report) => !!r && (r.status === 'planning' || r.status === 'in_progress');
  const canEditActual   = (r: typeof report) => !!r && r.status === 'in_progress';
  const isReadOnly      = (r: typeof report) => !!r && (r.status === 'submitted' || r.status === 'confirmed');

  // D&C hooks
  const onReportRequired = useCallback((): boolean => {
    if (!getTodayReport()) { addToast({ type: 'warning', message: '先に日報を作成してください' }); setShowStartModal(true); return false; }
    return true;
  }, [getTodayReport, addToast]);

  const plannedDnC = useDragAndChip(timelineRef, onReportRequired);
  const actualDnC  = useDragAndChip(actualColRef, onReportRequired);

  const { blockDragState, startDrag } = useBlockDrag({
    containerRef: timelineRef, actualRef: actualColRef,
    onCommit: (blockId, startMin, endMin) => {
      if (!report) return;
      updateBlock(report.id, blockId, { startTime: minutesToTime(startMin), endTime: minutesToTime(endMin) });
    },
  });

  useEffect(() => {
    if (trackingSession) {
      timerRef.current = setInterval(() => setElapsedSecs(Math.floor((Date.now() - new Date(trackingSession.startedAt).getTime()) / 1000)), 1000) as unknown as number;
    } else { clearInterval(timerRef.current); setElapsedSecs(0); }
    return () => clearInterval(timerRef.current);
  }, [trackingSession]);

  // Dialog helpers
  const openFromDrag = (startMin: number, endMin: number, type?: BlockType, col: 'planned' | 'actual' = 'actual') => {
    const pa = col === 'planned' ? { isPlanned: true, isActual: false } : { isPlanned: false, isActual: true };
    setBlockModal({ open: true, col, block: { type: type ?? 'visit', startTime: minutesToTime(startMin), endTime: minutesToTime(Math.min(endMin, DAY_END)), title: type ? BLOCK_LABELS[type] : '', memo: '', ...pa, attachments: [] }, isNew: true, focusCustomer: !!type });
  };
  const withLongCheck = (startMin: number, endMin: number, type: BlockType | undefined, col: 'planned' | 'actual') => {
    if (endMin - startMin >= 8 * 60) { setPendingLong({ startMin, endMin, type, col }); setShowLongBlock(true); }
    else openFromDrag(startMin, endMin, type, col);
  };

  const handleChipSelected        = (t: BlockType) => { const { startMin, endMin } = plannedDnC.confirmChip(t);       withLongCheck(startMin, endMin, t,         'planned'); };
  const handleDragWithoutType     = ()              => { const { startMin, endMin } = plannedDnC.confirmWithoutType(); withLongCheck(startMin, endMin, undefined, 'planned'); };
  const handleActualChipSelected  = (t: BlockType) => { const { startMin, endMin } = actualDnC.confirmChip(t);        withLongCheck(startMin, endMin, t,         'actual');  };
  const handleActualWithoutType   = ()              => { const { startMin, endMin } = actualDnC.confirmWithoutType();  withLongCheck(startMin, endMin, undefined, 'actual');  };

  const handleOpenBlock = (block?: TimeBlock, col: 'planned' | 'actual' = 'actual') => {
    if (!report) return;
    // 入力制限ガード
    if (isReadOnly(report)) { addToast({ type: 'warning', message: '提出済みの日報は変更できません' }); return; }
    if (col === 'actual' && !canEditActual(report)) { addToast({ type: 'warning', message: '実績の入力は「予定を確定する」後に行えます' }); return; }
    if (block) {
      setBlockModal({ open: true, col: block.isPlanned ? 'planned' : 'actual', block: { ...block }, isNew: false, focusCustomer: false });
    } else {
      const nowH = new Date().getHours(), nowM = Math.floor(new Date().getMinutes() / SNAP) * SNAP;
      const s = nowH * 60 + nowM, e = Math.min(s + 60, DAY_END);
      const pa = col === 'planned' ? { isPlanned: true, isActual: false } : { isPlanned: false, isActual: true };
      setBlockModal({ open: true, col, block: { type: 'visit', startTime: minutesToTime(s), endTime: minutesToTime(e), title: '', memo: '', ...pa, attachments: [] }, isNew: true, focusCustomer: false });
    }
  };

  const handleSaveBlock = () => {
    if (!report) return;
    // ステータス別入力制限
    if (blockModal.col === 'actual' && !canEditActual(report)) {
      addToast({ type: 'warning', message: '実績の入力は「実績入力中」のみ可能です' }); return;
    }
    if (blockModal.col === 'planned' && !canEditPlanned(report)) {
      addToast({ type: 'warning', message: '提出済みの日報は変更できません' }); return;
    }
    const b = blockModal.block;
    if (!b.startTime || !b.endTime || !b.type) return;
    if (blockModal.isNew) { addBlock(report.id, b as Omit<TimeBlock, 'id'>); addToast({ type: 'success', message: '時間ブロックを追加しました' }); }
    else { updateBlock(report.id, b.id!, b); addToast({ type: 'success', message: '時間ブロックを更新しました' }); }
    if (continueInput) {
      const endMin = timeToMinutes(b.endTime!);
      setBlockModal({ open: true, block: { type: b.type, startTime: b.endTime!, endTime: minutesToTime(Math.min(endMin + 60, DAY_END)), title: '', memo: '', isPlanned: blockModal.col === 'planned', isActual: blockModal.col === 'actual', attachments: [] }, isNew: true, col: blockModal.col, focusCustomer: true });
    } else {
      setBlockModal({ open: false, block: {}, isNew: true, col: 'actual', focusCustomer: false });
    }
  };

  const handleDeleteBlock = (blockId: string) => {
    if (!report) return;
    if (isReadOnly(report)) { addToast({ type: 'warning', message: '提出済みの日報は変更できません' }); return; }
    deleteBlock(report.id, blockId);
    addToast({ type: 'info', message: '削除しました', undoFn: () => addToast({ type: 'info', message: '（元に戻す機能はモックです）' }) });
    setBlockModal({ open: false, block: {}, isNew: true, col: 'actual', focusCustomer: false });
  };

  const handleActualize = (block: TimeBlock) => {
    if (!report) return;
    if (!canEditActual(report)) { addToast({ type: 'warning', message: '実績化は「実績入力中」のみ可能です。「予定を確定する」を押してください' }); return; }
    addBlock(report.id, { reportId: block.reportId, type: block.type, startTime: block.startTime, endTime: block.endTime, title: block.title, memo: block.memo, customerId: block.customerId, isPlanned: false, isActual: true, plannedBlockId: block.id, attachments: block.attachments.map(a => ({ ...a })) });
    addToast({ type: 'success', message: '✅ 実績ブロックを生成しました。ドラッグで時間を調整できます。' });
  };

  const handleStopTracking = () => {
    const block = stopTracking();
    if (block && report) { addBlock(report.id, { ...block, reportId: report.id }); addToast({ type: 'success', message: 'タイムトラッキングを終了し、ブロックを追加しました' }); }
  };

  const handleStartReport = (mode: 'copy_prev' | 'template' | 'blank') => {
    const r = createReport(currentUserId, today);
    setShowStartModal(false);
    addToast({ type: 'success', message: '日報を作成しました' });
    if (mode === 'copy_prev') addToast({ type: 'info', message: '前日の予定を引き継ぎました（モック）' });
  };

  return (
    <div className="flex flex-col h-full">
      {trackingSession && (
        <TrackingBanner
          session={trackingSession} customers={customers} elapsed={elapsedSecs}
          onStop={handleStopTracking} onDiscard={discardTracking}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-4">
          {/* M-1: ヘッダーを圧縮しタイムラインをファーストビューに */}
          <div className="flex items-center justify-between mb-1.5 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm sm:text-lg font-bold text-gray-900 truncate">{formatDate(today)}</h1>
              {report && <StatusBadge status={report.status} />}
            </div>
            <button onClick={() => setShowTrackModal(true)} className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 min-h-[44px] sm:min-h-[32px]">
              <Clock className="w-3.5 h-3.5" /> <span className="hidden sm:inline">トラッキング</span>
            </button>
          </div>

          {/* P1-3: ステッパーをヘッダー直下に配置 */}
          {report && <StatusStepper report={report} />}

          {!report ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-gray-600 mb-4">今日の日報を始めましょう</p>
              <button onClick={() => setShowStartModal(true)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">日報を作成する</button>
            </div>
          ) : (
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4">
              {/* タイムライン: モバイルでは先に表示 */}
              <div className="lg:col-span-2 order-1">
                <TimelinePanel
                  report={report} customers={customers}
                  blockDragState={blockDragState} startDrag={startDrag}
                  plannedDnC={plannedDnC} actualDnC={actualDnC} isMobile={isMobile}
                  plannedRef={timelineRef} actualRef={actualColRef}
                  onOpenBlock={handleOpenBlock} onActualize={handleActualize}
                  onPlannedChipSelected={handleChipSelected} onPlannedDragWithoutType={handleDragWithoutType}
                  onActualChipSelected={handleActualChipSelected} onActualDragWithoutType={handleActualWithoutType}
                />
              </div>
              {/* サイドパネル: モバイルではタイムラインの後 */}
              <div className="order-2">
                <SidePanelCards
                  report={report} customers={customers}
                  onUpdateReport={u => updateReport(report.id, u)}
                  onAddTodo={t => addTodo(report.id, t)}
                  onToggleTodo={id => toggleTodo(report.id, id)}
                  onDeleteTodo={id => deleteTodo(report.id, id)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {report && (
        <StatusBar
          report={report}
          onConfirmPlanning={() => { confirmPlanning(report.id); addToast({ type: 'success', message: '予定を確定しました。実績の入力を始めてください ✨' }); }}
          onShowSubmit={() => setShowSubmitModal(true)}
          onWithdraw={() => { withdrawReport(report.id); addToast({ type: 'info', message: '日報を取り下げました' }); }}
        />
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={showLongBlock} title="長い時間ブロック"
        message="8時間以上のブロックを作成しますか？誤操作の可能性があります。"
        confirmLabel="作成する" confirmVariant="primary"
        onConfirm={() => { setShowLongBlock(false); if (pendingLong) { openFromDrag(pendingLong.startMin, pendingLong.endMin, pendingLong.type, pendingLong.col ?? 'actual'); setPendingLong(null); } }}
        onClose={() => { setShowLongBlock(false); setPendingLong(null); plannedDnC.cancelDrag(); }}
      />

      <Modal open={showStartModal} onClose={() => setShowStartModal(false)} title="今日の日報をどう始めますか？" size="sm" closeOnBackdrop={false}>
        <div className="space-y-2">
          {([{ id: 'copy_prev', emoji: '📋', title: '前日の予定をコピー', sub: 'おすすめ' }, { id: 'template', emoji: '🧩', title: 'テンプレートから始める', sub: '' }, { id: 'blank', emoji: '✨', title: '白紙から始める', sub: '' }] as const).map(opt => (
            <button key={opt.id} onClick={() => handleStartReport(opt.id)} className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 text-left transition-colors">
              <span className="text-2xl">{opt.emoji}</span>
              <div><span className="text-sm font-medium text-gray-800">{opt.title}</span>{opt.sub && <span className="ml-2 text-xs text-blue-600 font-medium">[{opt.sub}]</span>}</div>
            </button>
          ))}
        </div>
      </Modal>

      {report && (
        <Modal open={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="提出前の確認" size="sm" closeOnBackdrop={false}
          footer={<><button onClick={() => setShowSubmitModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">← 戻る</button><button onClick={() => { submitReport(report.id); setShowSubmitModal(false); addToast({ type: 'success', message: '日報を提出しました ✓' }); }} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">✓ 提出する</button></>}>
          <SubmitModalContent report={report} />
        </Modal>
      )}

      <BlockModal state={blockModal} customers={customers} continueInput={continueInput} setContinueInput={setContinueInput} onSave={handleSaveBlock} onDelete={handleDeleteBlock} onClose={() => setBlockModal(s => ({ ...s, open: false }))} onChange={setBlockModal} />

      <Modal open={showTrackModal} onClose={() => setShowTrackModal(false)} title="何を始めますか？" size="sm"
        footer={<><button onClick={() => setShowTrackModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg">キャンセル</button><button onClick={() => { startTracking(trackType, trackCustomer || undefined); setShowTrackModal(false); addToast({ type: 'success', message: 'トラッキングを開始しました' }); }} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">▶ 開始する</button></>}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">種別を選択</label>
            <div className="flex flex-wrap gap-2">
              {BLOCK_TYPES.map(type => (
                <button key={type} onClick={() => setTrackType(type)} className={`px-3 py-2 text-xs rounded-xl border transition-colors ${trackType === type ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {BLOCK_EMOJIS[type]} {BLOCK_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">顧客（任意）</label>
            <select value={trackCustomer} onChange={e => setTrackCustomer(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">選択しない</option>
              {customers.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
