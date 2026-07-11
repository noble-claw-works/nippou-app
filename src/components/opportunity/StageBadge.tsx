// =====================================================
// StageBadge — ステージバッジ表示
// =====================================================
import { STAGE_META } from './stageMeta';
export { STAGE_META } from './stageMeta';
import type { OpportunityStage } from '../../types';

const SIZE_CLASSES = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-0.5',
  lg: 'text-base px-3 py-1',
};

interface Props {
  stage: OpportunityStage;
  size?: 'sm' | 'md' | 'lg';
  showEmoji?: boolean;
}

export function StageBadge({ stage, size = 'md', showEmoji = true }: Props) {
  const meta = STAGE_META[stage];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${meta.color} ${SIZE_CLASSES[size]}`}>
      {showEmoji && <span>{meta.emoji}</span>}
      <span>{meta.label}</span>
    </span>
  );
}
