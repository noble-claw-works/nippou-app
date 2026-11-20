import type { OpportunityStage } from "../../types";

// =====================================================
// stageMeta — ステージメタ情報 (定数のみ)
// StageBadge.tsx から分離し react-refresh 警告を回避
// =====================================================

export interface StageMeta {
  label: string;
  emoji: string;
  color: string;
}

// ADR-B4 v2 要件2: 表示ラベルを 7タブ語彙に整合。
// 内部 9段 enum・ emoji は不変。表示ラベルのみ更新。
export const STAGE_META: Record<OpportunityStage, StageMeta> = {
  approach: {
    label: "初回相談",
    emoji: "🌱",
    color: "bg-gray-100 text-gray-700",
  },
  fact_finding: {
    label: "初回相談",
    emoji: "🔍",
    color: "bg-blue-100 text-blue-700",
  },
  needs_analysis: {
    label: "LP提案",
    emoji: "📊",
    color: "bg-indigo-100 text-indigo-700",
  },
  proposal: {
    label: "提案",
    emoji: "📄",
    color: "bg-purple-100 text-purple-700",
  },
  negotiation: {
    label: "提案",
    emoji: "💬",
    color: "bg-yellow-100 text-yellow-700",
  },
  application: {
    label: "契約予定",
    emoji: "✍️",
    color: "bg-orange-100 text-orange-700",
  },
  underwriting: {
    label: "契約",
    emoji: "🏥",
    color: "bg-pink-100 text-pink-700",
  },
  issued: { label: "成立", emoji: "🎉", color: "bg-green-100 text-green-700" },
  lost: { label: "失注", emoji: "❌", color: "bg-red-100 text-red-600" },
};
