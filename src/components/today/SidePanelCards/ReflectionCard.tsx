import { MOOD_EMOJIS } from "../../../utils";
import type { MoodType, ManagerSignal } from "../../../types";
import type { SidePanelCardsProps } from "../SidePanelCards";

type ReflectionCardProps = Pick<
  SidePanelCardsProps,
  "report" | "onUpdateReport"
>;

export function ReflectionCard({
  report,
  onUpdateReport,
}: ReflectionCardProps) {
  const done = !!(report.eveningMood && report.managerSignal);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">🌤 振り返り</span>
        {done ? (
          <span className="text-xs bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">
            ✓ 完了
          </span>
        ) : (
          <span className="text-xs bg-gray-100 text-gray-400 rounded-full px-1.5 py-0.5">
            未設定
          </span>
        )}
      </div>
      <div className="space-y-3">
        {/* Morning mood */}
        <div>
          <p className="text-xs text-gray-500 mb-1">朝の気分</p>
          <div className="flex gap-2">
            {(["sunny", "partly_cloudy", "cloudy", "rainy"] as MoodType[]).map(
              (m) => (
                <button
                  key={m}
                  onClick={() => onUpdateReport({ morningMood: m })}
                  className={`text-lg p-1 rounded-lg ${
                    report.morningMood === m
                      ? "bg-blue-50 ring-2 ring-blue-400"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {MOOD_EMOJIS[m]}
                </button>
              ),
            )}
          </div>
        </div>
        {/* Evening mood */}
        <div>
          <p className="text-xs text-gray-500 mb-1">終わりの気分</p>
          <div className="flex gap-2">
            {(["sunny", "partly_cloudy", "cloudy", "rainy"] as MoodType[]).map(
              (m) => (
                <button
                  key={m}
                  onClick={() => onUpdateReport({ eveningMood: m })}
                  className={`text-lg p-1 rounded-lg ${
                    report.eveningMood === m
                      ? "bg-blue-50 ring-2 ring-blue-400"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {MOOD_EMOJIS[m]}
                </button>
              ),
            )}
          </div>
        </div>
        {/* Manager signal */}
        <div>
          <p className="text-xs text-gray-500 mb-1">上長への合図</p>
          <div className="flex gap-2 flex-wrap">
            {(
              [
                ["consult", "💬 相談したい"],
                ["listen", "👂 聞いて"],
                ["ok", "👍 今は大丈夫"],
              ] as [ManagerSignal, string][]
            ).map(([v, label]) => (
              <button
                key={v!}
                onClick={() => onUpdateReport({ managerSignal: v })}
                className={`px-2 py-1 text-xs rounded-lg border ${
                  report.managerSignal === v
                    ? "bg-blue-50 border-blue-400 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
