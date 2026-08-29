import { ArrowLeft, CheckCircle2 } from "lucide-react";

interface PageHeaderProps {
  householdName: string;
  saving: boolean;
  dirtyCount: number;
  onBack: () => void;
  onSaveAll: () => void;
}

export function PageHeader({
  householdName,
  saving,
  dirtyCount,
  onBack,
  onSaveAll,
}: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 -mx-4 px-4 py-3 mb-4 flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 shrink-0 min-h-[44px] px-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">戻る</span>
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-bold text-gray-900 truncate">
          🏠 {householdName} — まとめ入力
        </h1>
        <p className="text-xs text-gray-500">世帯の案件を一括で入力・更新</p>
      </div>

      <button
        type="button"
        onClick={onSaveAll}
        disabled={saving || dirtyCount === 0}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shrink-0 min-h-[44px]"
      >
        {saving ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <CheckCircle2 className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">
          {dirtyCount > 0 ? `まとめて保存 (${dirtyCount}件)` : "保存済み"}
        </span>
        <span className="sm:hidden">保存</span>
      </button>
    </div>
  );
}
