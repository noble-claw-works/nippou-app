interface PageFooterProps {
  dirtyCount: number;
  invalidCount: number;
  saving: boolean;
  onBack: () => void;
  onSaveAll: () => void;
}

export function PageFooter({
  dirtyCount,
  invalidCount,
  saving,
  onBack,
  onSaveAll,
}: PageFooterProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200 px-4 py-3">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
        <div className="text-xs text-gray-500">
          {dirtyCount > 0 ? (
            <span className="text-amber-600">
              ⚠ {dirtyCount}件 未保存の変更があります
            </span>
          ) : (
            <span className="text-green-600">✅ 保存済み</span>
          )}
          {invalidCount > 0 && (
            <span className="ml-2 text-red-500">/ 未入力 {invalidCount}件</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onSaveAll}
            disabled={saving || dirtyCount === 0}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
          >
            {saving
              ? "保存中..."
              : `まとめて保存${dirtyCount > 0 ? ` (${dirtyCount}件)` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
