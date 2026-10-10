import { useState, useEffect, useRef, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { useAppStore } from "../store";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { minutesToTime } from "../utils";
import type { BlockType } from "../types";
import { useDragAndChip } from "../components/timeline/DragAndChip";
import { useBlockDrag } from "../components/timeline/useBlockDrag";
import { TimelinePanel } from "../components/today/TimelinePanel";
import { BlockModal } from "../components/today/BlockModal";
import { SidePanelCards } from "../components/today/SidePanelCards";
import { ManagerCommentSection } from "../components/today/ManagerCommentSection";
import { TrackingBanner } from "../components/today/TrackingBanner";
import { StatusBar } from "../components/today/StatusBar";
import { useIsMobile } from "./TodayPage/useIsMobile";
import { useTrackingTimer } from "./TodayPage/useTrackingTimer";
import { canEditActual, canDragActual } from "./TodayPage/reportHelpers";
import { useTodayBlockHandlers } from "./TodayPage/useTodayBlockHandlers";
import { StartReportModal } from "./TodayPage/StartReportModal";
import { TrackingModal } from "./TodayPage/TrackingModal";
import { SubmitModal } from "./TodayPage/SubmitModal";
import { TodayStatusBanners } from "./TodayPage/TodayStatusBanners";
import { TodayHeader } from "./TodayPage/TodayHeader";

export function TodayPage() {
  const navigate = useNavigate();
  const today = format(new Date(), "yyyy-MM-dd");
  const {
    getTodayReport,
    createReport,
    updateReport,
    updateBlock,
    deleteBlock,
    addBlock,
    addTodo,
    toggleTodo,
    deleteTodo,
    confirmPlanning,
    submitReport,
    withdrawReport,
    customers,
    currentUserId,
    currentRole,
    addToast,
    trackingSession,
    startTracking,
    stopTracking,
    discardTracking,
    reports,
  } = useAppStore();

  // MGR-1 + MGR-5: 上長ビューは原則 /report-admin へだが、`?self=1` 付きなら自身の日報作成を許可
  const [searchParams] = useSearchParams();
  const selfMode = searchParams.get("self") === "1";
  useEffect(() => {
    if (
      (currentRole === "manager" || currentRole === "executive") &&
      !selfMode
    ) {
      navigate("/report-admin", { replace: true });
    }
  }, [currentRole, navigate, selfMode]);

  // D2: 日報が存在する日付のソート済一覧（該当ユーザーの分のみ）
  const myReportDates = [
    ...new Set(
      reports
        .filter((r) => r.userId === currentUserId)
        .map((r) => r.date)
        .sort(),
    ),
  ];
  const todayIdx = myReportDates.indexOf(today);
  const prevReportDate = todayIdx > 0 ? myReportDates[todayIdx - 1] : null;
  const nextReportDate =
    todayIdx >= 0 && todayIdx < myReportDates.length - 1
      ? myReportDates[todayIdx + 1]
      : null;

  const isMobile = useIsMobile();
  const timelineRef = useRef<HTMLDivElement>(null);
  const actualColRef = useRef<HTMLDivElement>(null);

  // store から直接購読（ポーリング廃止）
  const report = useAppStore(
    (s) =>
      s.reports.find((r) => r.date === today && r.userId === s.currentUserId) ??
      null,
  );

  // ADR-B4 v2 要件9: 今日の報告が未入力のアクティブ商談
  const unreportedOpps = useAppStore(
    useShallow((s) => {
      const todayReported = new Set(
        s.oppActivityReports
          .filter((r) => r.reportDate === today && r.userId === s.currentUserId)
          .map((r) => r.opportunityId),
      );
      return s.opportunities
        .filter(
          (o) =>
            o.ownerId === s.currentUserId &&
            o.status === "open" &&
            !todayReported.has(o.id),
        )
        .slice(0, 3);
    }),
  );

  const [showStartModal, setShowStartModal] = useState(() => !getTodayReport());
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackType, setTrackType] = useState<BlockType>("visit");
  const [trackCustomer, setTrackCustomer] = useState("");

  const elapsedSecs = useTrackingTimer(trackingSession);

  // D&C hooks
  const onReportRequired = useCallback((): boolean => {
    if (!getTodayReport()) {
      addToast({ type: "warning", message: "先に日報を作成してください" });
      setShowStartModal(true);
      return false;
    }
    return true;
  }, [getTodayReport, addToast]);

  const plannedDnC = useDragAndChip(timelineRef, onReportRequired);
  const actualDnC = useDragAndChip(actualColRef, onReportRequired);

  const { blockDragState, startDrag } = useBlockDrag({
    containerRef: timelineRef,
    actualRef: actualColRef,
    onCommit: (blockId, startMin, endMin) => {
      if (!report) return;
      updateBlock(report.id, blockId, {
        startTime: minutesToTime(startMin),
        endTime: minutesToTime(endMin),
      });
    },
  });

  const {
    blockModal,
    setBlockModal,
    continueInput,
    setContinueInput,
    showLongBlock,
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
  } = useTodayBlockHandlers({
    report,
    addBlock,
    updateBlock,
    deleteBlock,
    addToast,
    plannedDnC,
    actualDnC,
  });

  const handleStopTracking = () => {
    const block = stopTracking();
    if (block && report) {
      addBlock(report.id, { ...block, reportId: report.id });
      addToast({
        type: "success",
        message: "タイムトラッキングを終了し、ブロックを追加しました",
      });
    }
  };

  const handleStartReport = (mode: "copy_prev" | "template" | "blank") => {
    createReport(currentUserId, today);
    setShowStartModal(false);
    addToast({ type: "success", message: "日報を作成しました" });
    if (mode === "copy_prev")
      addToast({
        type: "info",
        message: "前日の予定を引き継ぎました（モック）",
      });
  };

  return (
    <div className="flex flex-col h-full">
      {trackingSession && (
        <TrackingBanner
          session={trackingSession}
          customers={customers}
          elapsed={elapsedSecs}
          onStop={handleStopTracking}
          onDiscard={discardTracking}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-4">
          <TodayHeader
            today={today}
            report={report}
            prevReportDate={prevReportDate}
            nextReportDate={nextReportDate}
            onNavigatePrev={() =>
              prevReportDate && navigate(`/reports/${prevReportDate}`)
            }
            onNavigateNext={() =>
              nextReportDate && navigate(`/reports/${nextReportDate}`)
            }
            onShowTrackModal={() => setShowTrackModal(true)}
          />

          <TodayStatusBanners
            report={report}
            unreportedOpps={unreportedOpps}
            onShowSubmit={() => setShowSubmitModal(true)}
            onWithdraw={() => {
              if (report) {
                withdrawReport(report.id);
                addToast({ type: "info", message: "日報を取り下げました" });
              }
            }}
          />

          {!report ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-gray-600 mb-4">今日の日報を始めましょう</p>
              <button
                onClick={() => setShowStartModal(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                日報を作成する
              </button>
            </div>
          ) : (
            <div className="flex flex-col md:grid md:grid-cols-3 gap-4">
              {/* タイムライン: モバイルでは先に表示 */}
              <div className="md:col-span-2 order-1">
                <TimelinePanel
                  report={report}
                  blockDragState={blockDragState}
                  startDrag={startDrag}
                  plannedDnC={plannedDnC}
                  actualDnC={actualDnC}
                  isMobile={isMobile}
                  plannedRef={timelineRef}
                  actualRef={actualColRef}
                  onOpenBlock={handleOpenBlock}
                  onActualize={handleActualize}
                  onPlannedChipSelected={handleChipSelected}
                  onPlannedDragWithoutType={handleDragWithoutType}
                  onActualChipSelected={handleActualChipSelected}
                  onActualDragWithoutType={handleActualWithoutType}
                  isActualEnabled={canEditActual(report)}
                  canDragActual={canDragActual(report)}
                />
              </div>
              {/* サイドパネル: モバイルではタイムラインの後 */}
              <div className="order-2">
                <SidePanelCards
                  report={report}
                  customers={customers}
                  onUpdateReport={(u) => updateReport(report.id, u)}
                  onAddTodo={(t, p) => addTodo(report.id, t, p)}
                  onToggleTodo={(id) => toggleTodo(report.id, id)}
                  onDeleteTodo={(id) => deleteTodo(report.id, id)}
                  canEditActual={canEditActual(report)}
                />
                {/* P0-1: 上長コメント */}
                <ManagerCommentSection
                  dayKey={report.date}
                  submitted={
                    report.status === "submitted" ||
                    report.status === "confirmed"
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {report && (
        <StatusBar
          report={report}
          onConfirmPlanning={() => {
            confirmPlanning(report.id);
            addToast({
              type: "success",
              message: "予定を確定しました。実績の入力を始めてください ✨",
            });
          }}
          onShowSubmit={() => setShowSubmitModal(true)}
          onWithdraw={() => {
            withdrawReport(report.id);
            addToast({ type: "info", message: "日報を取り下げました" });
          }}
        />
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={showLongBlock}
        title="長い時間ブロック"
        message="8時間以上のブロックを作成しますか？誤操作の可能性があります。"
        confirmLabel="作成する"
        confirmVariant="primary"
        onConfirm={confirmLongBlock}
        onClose={cancelLongBlock}
      />

      <StartReportModal
        open={showStartModal}
        onClose={() => setShowStartModal(false)}
        onStart={handleStartReport}
      />

      {report && (
        <SubmitModal
          report={report}
          open={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          onSubmit={() => {
            submitReport(report.id);
            setShowSubmitModal(false);
            addToast({ type: "success", message: "日報を提出しました ✓" });
          }}
        />
      )}

      <BlockModal
        state={blockModal}
        customers={customers}
        continueInput={continueInput}
        setContinueInput={setContinueInput}
        onSave={handleSaveBlock}
        onDelete={handleDeleteBlock}
        onClose={() => setBlockModal((s) => ({ ...s, open: false }))}
        onChange={setBlockModal}
      />

      <TrackingModal
        open={showTrackModal}
        trackType={trackType}
        trackCustomer={trackCustomer}
        customers={customers}
        onClose={() => setShowTrackModal(false)}
        onStart={() => {
          startTracking(trackType, trackCustomer || undefined);
          setShowTrackModal(false);
          addToast({ type: "success", message: "トラッキングを開始しました" });
        }}
        onTypeChange={setTrackType}
        onCustomerChange={setTrackCustomer}
      />
    </div>
  );
}
