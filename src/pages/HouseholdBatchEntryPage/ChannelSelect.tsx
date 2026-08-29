import { useMemo } from "react";
import { SALES_CHANNELS } from "../../data/salesChannels";
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
  const parentChannels = useMemo(() => getParentChannels(SALES_CHANNELS), []);
  const parentId = useMemo(
    () => getParentChannelId(channelId, SALES_CHANNELS),
    [channelId],
  );
  const childChannels = useMemo(
    () => (parentId ? getChildChannels(parentId, SALES_CHANNELS) : []),
    [parentId],
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
          const children = getChildChannels(newParent, SALES_CHANNELS);
          if (children.length > 0) onChange(children[0].id);
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
        value={channelId ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={!parentId}
        className={`flex-1 min-w-0 border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50 ${
          hasError ? "border-red-400 bg-red-50" : "border-gray-300"
        }`}
      >
        <option value="">─ 詳細を選択 ─</option>
        {childChannels.map((ch) => (
          <option key={ch.id} value={ch.id}>
            {ch.name}
          </option>
        ))}
      </select>
    </div>
  );
}
