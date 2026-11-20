import { BLOCK_EMOJIS, BLOCK_LABELS } from '../../utils';
import type { TrackingSession, Customer } from '../../types';

interface TrackingBannerProps {
  session: TrackingSession;
  customers: Customer[];
  elapsed: number;
  onStop: () => void;
  onDiscard: () => void;
}

export function TrackingBanner({ session, customers, elapsed, onStop, onDiscard }: TrackingBannerProps) {
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const fmt = (n: number) => String(n).padStart(2, '0');
  const elapsedStr = `${fmt(h)}:${fmt(m)}:${fmt(s)}`;

  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-3">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      <span className="text-sm font-medium text-red-700">
        🔴 トラッキング中: {BLOCK_EMOJIS[session.blockType]} {BLOCK_LABELS[session.blockType]}
        {session.customerId && ` - ${customers.find(c => c.id === session.customerId)?.name}`}
      </span>
      <span className="text-sm font-mono text-red-600">⏱ {elapsedStr}</span>
      <div className="flex-1" />
      <button onClick={onStop} className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700">
        ⏹ 終了
      </button>
      <button onClick={onDiscard} className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
        破棄
      </button>
    </div>
  );
}
