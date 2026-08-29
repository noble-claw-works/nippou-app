interface ActivityBlock {
  id: string;
  title?: string;
  reportDate: string;
  startTime?: string;
  endTime?: string;
  memo?: string;
}

interface ActivitiesTabProps {
  blocks: ActivityBlock[];
}

export function ActivitiesTab({ blocks }: ActivitiesTabProps) {
  if (blocks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        関連する活動記録がありません
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {blocks.slice(0, 20).map((block) => (
        <div
          key={block.id}
          className="bg-white rounded-xl border border-gray-200 p-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-800">
              {block.title || "(タイトルなし)"}
            </p>
            <span className="text-xs text-gray-500">{block.reportDate}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {block.startTime} — {block.endTime}
          </p>
          {block.memo && (
            <p className="text-xs text-gray-600 mt-1">{block.memo}</p>
          )}
        </div>
      ))}
    </div>
  );
}
