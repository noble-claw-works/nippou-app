import type { OpportunityActivityReport } from "../../types";

export const CONFIDENCE_OPTIONS: Array<{
  value: OpportunityActivityReport["confidence"];
  label: string;
}> = [
  { value: undefined, label: "─ 未設定 ─" },
  { value: "S", label: "S — 最高確度" },
  { value: "A", label: "A — 高確度" },
  { value: "B", label: "B — 中層確度" },
  { value: "C", label: "C — 標準確度" },
  { value: "D", label: "D — 要フォロー" },
  { value: "fixed", label: "fixed — 確定済" },
];

export const ACTIVITY_TYPE_OPTIONS: Array<{
  value: OpportunityActivityReport["activityType"];
  label: string;
}> = [
  { value: "visit", label: "🤝 面談" },
  { value: "phone", label: "📞 電話" },
  { value: "web", label: "💻 オンライン" },
  { value: "other", label: "📋 その他" },
];

export const MILESTONE_ITEMS: Array<{
  key: keyof NonNullable<OpportunityActivityReport["reachedMilestones"]>;
  label: string;
  desc: string;
}> = [
  { key: "firstConsult", label: "初回相談", desc: "初回面談を実施した" },
  { key: "lifePlan", label: "LP提案", desc: "ライフプラン提案を行った" },
  { key: "proposal", label: "提案", desc: "保険提案書を提出した" },
  { key: "contract", label: "契約", desc: "契約手続きが完了した" },
  { key: "established", label: "成立", desc: "保険が成立・交付された" },
];
