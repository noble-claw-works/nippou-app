// 活動履歴タイムライン（右サイドバー + モバイル縦積み共用）
import type { BlockType } from "../../types";

interface ActivityBlock {
  id: string;
  type: BlockType;
  startTime: string;
  endTime: string;
  title?: string;
  memo?: string;
  result?: string;
}

interface ActivityTimelineProps {
  blocks: ActivityBlock[];
  mobile?: boolean;
}

export function ActivityTimeline({ blocks, mobile }: ActivityTimelineProps) {
  if (blocks.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-6 text-center">
        活動履歴がありません
      </p>
    );
  }

  return (
    <div className={`relative pl-6 ${mobile ? "" : ""}`}>
      <div
        className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-blue-200 via-blue-100 to-transparent"
        aria-hidden="true"
      />
      <ul className="space-y-3">
        {blocks.map((block) => (
          <li key={block.id} className="relative">
            <span
              className="absolute -left-[18px] top-3 w-3 h-3 rounded-full bg-white border-2 border-blue-400 shadow-sm"
              aria-hidden="true"
            />
            <div className="border border-gray-200 border-l-4 border-l-blue-400 rounded-lg p-3 bg-blue-50/20">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-900 tabular-nums">
                  {block.startTime}–{block.endTime}
                </span>
              </div>
              {block.title && (
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {block.title}
                </p>
              )}
              {block.memo && (
                <p className="text-sm text-gray-600 whitespace-pre-wrap break-words leading-relaxed">
                  {block.memo}
                </p>
              )}
              {block.result && (
                <div className="mt-2 text-xs bg-white rounded px-2 py-1 border border-gray-100">
                  <span className="text-gray-500">結果: </span>
                  <span className="text-gray-800">{block.result}</span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
