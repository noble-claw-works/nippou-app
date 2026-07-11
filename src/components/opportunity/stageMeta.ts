import type { OpportunityStage } from '../../types';

// =====================================================
// stageMeta — ステージメタ情報 (定数のみ)
// StageBadge.tsx から分離し react-refresh 警告を回避
// =====================================================

export interface StageMeta {
  label: string;
  emoji: string;
  color: string;
}

export const STAGE_META: Record<OpportunityStage, StageMeta> = {
  approach:       { label: 'アプローチ',  emoji: '🌱', color: 'bg-gray-100 text-gray-700' },
  fact_finding:   { label: 'ヒアリング',  emoji: '🔍', color: 'bg-blue-100 text-blue-700' },
  needs_analysis: { label: 'ニーズ分析', emoji: '📊', color: 'bg-indigo-100 text-indigo-700' },
  proposal:       { label: '設計書提示',  emoji: '📄', color: 'bg-purple-100 text-purple-700' },
  negotiation:    { label: '検討中',      emoji: '💬', color: 'bg-yellow-100 text-yellow-700' },
  application:    { label: '申込書記入',  emoji: '✍️',  color: 'bg-orange-100 text-orange-700' },
  underwriting:   { label: '査定中',      emoji: '🏥', color: 'bg-pink-100 text-pink-700' },
  issued:         { label: '証券発行',    emoji: '🎉', color: 'bg-green-100 text-green-700' },
  lost:           { label: '失注',        emoji: '❌', color: 'bg-red-100 text-red-600' },
};
