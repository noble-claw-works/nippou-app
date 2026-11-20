import type { DailyReport, Opportunity } from "../../types";
import { useNavigate } from "react-router-dom";

interface TodayStatusBannersProps {
  report: DailyReport | null;
  unreportedOpps: Opportunity[];
  onShowSubmit: () => void;
  onWithdraw: () => void;
}

export function TodayStatusBanners({
  report,
  unreportedOpps,
  onShowSubmit,
  onWithdraw,
}: TodayStatusBannersProps) {
  const navigate = useNavigate();

  return (
    <>
      {/* P0-1: in_progress 時に上部に「日報を提出する」ボタン表示 */}
      {report && report.status === "in_progress" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-900">
                実績入力が完了しました
              </p>
              <p className="text-xs text-blue-700 mt-1">
                確認して上長に提出します
              </p>
            </div>
            <button
              onClick={onShowSubmit}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm whitespace-nowrap"
            >
              📤 日報を提出する
            </button>
          </div>
        </div>
      )}

      {/* 提出済み時のバッジ表示 */}
      {report && report.status === "submitted" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">✅</span>
              <div>
                <p className="text-sm font-semibold text-green-900">提出済み</p>
                <p className="text-xs text-green-700 mt-0.5">
                  上長からのフィードバックをお待ちしています
                </p>
              </div>
            </div>
            <button
              onClick={onWithdraw}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 whitespace-nowrap"
            >
              ← 取り下げ
            </button>
          </div>
        </div>
      )}

      {/* ADR-B4 v2 要件9: 報告未入力商談リマインダー */}
      {unreportedOpps.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
          <p className="text-xs font-semibold text-amber-800 mb-1.5">
            📝 商談報告まだですか？
          </p>
          <div className="space-y-1">
            {unreportedOpps.map((o) => (
              <button
                key={o.id}
                onClick={() => navigate(`/opportunities/${o.id}/report`)}
                className="w-full flex items-center justify-between px-3 py-2 bg-white border border-amber-200 rounded-lg hover:border-amber-400 hover:bg-amber-50 text-left transition-colors"
              >
                <span className="text-sm text-gray-700 truncate">
                  {o.title}
                </span>
                <span className="text-xs text-amber-700 whitespace-nowrap ml-2">
                  報告する →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
