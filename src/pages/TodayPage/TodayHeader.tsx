import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { StatusStepper } from "../../components/today/StatusBar";
import { formatDate } from "../../utils";
import type { DailyReport } from "../../types";

interface TodayHeaderProps {
  today: string;
  report: DailyReport | null;
  prevReportDate: string | null;
  nextReportDate: string | null;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onShowTrackModal: () => void;
}

export function TodayHeader({
  today,
  report,
  prevReportDate,
  nextReportDate,
  onNavigatePrev,
  onNavigateNext,
  onShowTrackModal,
}: TodayHeaderProps) {
  return (
    <>
      {/* M-1: ヘッダーを圧縮しタイムラインをファーストビューに */}
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          {/* D2: 前の日報ナビ（日報存在日のみに移動） */}
          <button
            type="button"
            onClick={onNavigatePrev}
            disabled={!prevReportDate}
            className="flex items-center px-1.5 py-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="前の日報"
            title={
              prevReportDate ? `前の日報 (${prevReportDate})` : "前の日報なし"
            }
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm sm:text-lg font-bold text-gray-900 truncate">
            {formatDate(today)}
          </h1>
          {/* D2: 次の日報ナビ（日報存在日のみに移動） */}
          <button
            type="button"
            onClick={onNavigateNext}
            disabled={!nextReportDate}
            className="flex items-center px-1.5 py-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="次の日報"
            title={
              nextReportDate ? `次の日報 (${nextReportDate})` : "次の日報なし"
            }
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          {report && <StatusBadge status={report.status} />}
        </div>
        <button
          onClick={onShowTrackModal}
          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 min-h-[44px] sm:min-h-[32px]"
        >
          <Clock className="w-3.5 h-3.5" />{" "}
          <span className="hidden sm:inline">トラッキング</span>
        </button>
      </div>

      {/* P1-3: ステッパーをヘッダー直下に配置 */}
      {report && <StatusStepper report={report} />}
    </>
  );
}
