import { useMemo } from "react";
import { useAppStore } from "../../store";
import {
  getParentChannels,
  getChildChannels,
  getParentChannelId,
} from "../../utils/householdBatchEntry";

interface ChannelSelectProps {
  channelId: string | undefined;
  onChange: (channelId: string) => void;
  hasError?: boolean;
  className?: string;
}

export function ChannelSelect({
  channelId,
  onChange,
  hasError,
  className = "",
}: ChannelSelectProps) {
  const allChannels = useAppStore((s) => s.salesChannels);
  // selector 内で filter すると毎回新配列になり無限再描画になるため useMemo で絞る
  const salesChannels = useMemo(() => allChannels.filter((c) => c.isActive), [allChannels]);
  const parentChannels = useMemo(() => getParentChannels(salesChannels), [salesChannels]);
  // D2: 分類（親）のみが保存されている場合は、その親を選択状態として表示する
  const parentId = useMemo(() => {
    const own = salesChannels.find((c) => c.id === channelId);
    if (own && own.parentId === null) return own.id;
    return getParentChannelId(channelId, salesChannels);
  }, [channelId, salesChannels]);
  const childChannels = useMemo(
    () => (parentId ? getChildChannels(parentId, salesChannels) : []),
    [parentId, salesChannels],
  );

  return (
    <div className={`flex gap-2 ${className}`}>
      {/* 親チャネル */}
      <select
        value={parentId}
        onChange={(e) => {
          const newParent = e.target.value;
          if (!newParent) {
            onChange("");
            return;
          }
          // D2: 詳細の 1 件目を勝手に選ばない。分類のみを保存値にする（詳細は任意）
          onChange(newParent);
        }}
        className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">─ 分類を選択 ─</option>
        {parentChannels.map((ch) => (
          <option key={ch.id} value={ch.id}>
            {ch.name}
          </option>
        ))}
      </select>

      {/* 子チャネル */}
      <select
        value={channelId && channelId !== parentId ? channelId : ""}
        onChange={(e) => onChange(e.target.value || parentId)}
        disabled={!parentId}
        className={`flex-1 min-w-0 border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50 ${
          hasError ? "border-red-400 bg-red-50" : "border-gray-300"
        }`}
      >
        <option value="">─ 詳細（任意）─</option>
        {childChannels.map((ch) => (
          <option key={ch.id} value={ch.id}>
            {ch.name}
          </option>
        ))}
      </select>
    </div>
  );
}
