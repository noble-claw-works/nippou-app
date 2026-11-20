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

// B1: 内部キーも 7 段（初回相談/LP提案/提案/契約予定/契約/成立/失注）。
export const STAGE_META: Record<OpportunityStage, StageMeta> = {
  first_consult: {
    label: "初回相談",
    emoji: "🌱",
    color: "bg-gray-100 text-gray-700",
  },
  lifeplan: {
    label: "LP提案",
    emoji: "📊",
    color: "bg-indigo-100 text-indigo-700",
  },
  proposed: {
    label: "提案",
    emoji: "📄",
    color: "bg-purple-100 text-purple-700",
  },
  contract_pending: {
    label: "契約予定",
    emoji: "✍️",
    color: "bg-orange-100 text-orange-700",
  },
  contract: {
    label: "契約",
    emoji: "🏥",
    color: "bg-pink-100 text-pink-700",
  },
  issued: { label: "成立", emoji: "🎉", color: "bg-green-100 text-green-700" },
  lost: { label: "失注", emoji: "❌", color: "bg-red-100 text-red-600" },
};
