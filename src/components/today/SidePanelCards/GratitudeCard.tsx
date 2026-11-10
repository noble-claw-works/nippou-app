import type { SidePanelCardsProps } from "../SidePanelCards";

type GratitudeCardProps = Pick<
  SidePanelCardsProps,
  "report" | "onUpdateReport"
>;

export function GratitudeCard({ report, onUpdateReport }: GratitudeCardProps) {
  const gratitude =
    report.gratitude.length >= 3
      ? report.gratitude
      : [...report.gratitude, ...Array(3 - report.gratitude.length).fill("")];

  const handleChange = (idx: number, value: string) => {
    const updated = [...gratitude];
    updated[idx] = value;
    onUpdateReport({ gratitude: updated });
  };

  const filled = (report.gratitude ?? []).filter((g) => g?.trim()).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">🙏 感謝3件</span>
        {filled >= 3 ? (
          <span className="text-xs bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">
            ✓ 完了
          </span>
        ) : filled > 0 ? (
          <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">
            {filled}/3
          </span>
        ) : (
          <span className="text-xs bg-gray-100 text-gray-400 rounded-full px-1.5 py-0.5">
            未入力
          </span>
        )}
      </div>
      <div className="space-y-2">
        {gratitude.slice(0, 3).map((text, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-4 flex-shrink-0">
              {idx + 1}.
            </span>
            <input
              type="text"
              value={text}
              onChange={(e) => handleChange(idx, e.target.value)}
              placeholder={`感謝${idx + 1}`}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
