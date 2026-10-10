import type { PolicyStatus } from '../../types';

const STATUS_META: Record<PolicyStatus, { label: string; emoji: string; cls: string }> = {
  inforce:    { label: '有効中',   emoji: '✅', cls: 'bg-green-100 text-green-800 border-green-200' },
  pending:    { label: '申込中',   emoji: '⏳', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  lapsed:     { label: '失効',     emoji: '⚠️', cls: 'bg-orange-100 text-orange-800 border-orange-200' },
  surrendered:{ label: '解約',     emoji: '❌', cls: 'bg-red-100 text-red-700 border-red-200' },
  matured:    { label: '満期',     emoji: '🎉', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  paid_up:    { label: '払済',     emoji: '💰', cls: 'bg-purple-100 text-purple-800 border-purple-200' },
  reduced:    { label: '減額',     emoji: '📉', cls: 'bg-gray-100 text-gray-700 border-gray-200' },
};

interface Props {
  status: PolicyStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function PolicyStatusBadge({ status, size = 'md' }: Props) {
  const meta = STATUS_META[status];
  const sizeClass =
    size === 'sm' ? 'text-[10px] px-1.5 py-0.5' :
    size === 'lg' ? 'text-sm px-3 py-1' :
    'text-xs px-2 py-0.5';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeClass} ${meta.cls}`}>
      <span>{meta.emoji}</span>
      <span>{meta.label}</span>
    </span>
  );
}

export { STATUS_META };
