// =====================================================
// customerInteraction.ts — 世帯対応記録 型
// =====================================================

export type InteractionKind =
  "phone" | "reception" | "visit" | "email" | "other";

// phone=電話連絡 / reception=接客(来店対応) / visit=訪問 / email=メール / other=その他
export const INTERACTION_KIND_LABEL: Record<InteractionKind, string> = {
  phone: "電話連絡",
  reception: "接客",
  visit: "訪問",
  email: "メール",
  other: "その他",
};

export interface CustomerInteraction {
  id: string;
  householdId: string; // 対象世帯 Household.id
  personId?: string; // 任意: 世帯内の対象者 Person.id
  kind: InteractionKind;
  occurredAt: string; // 対応日 (YYYY-MM-DD)
  summary: string; // 対応内容（自由記述・必須）
  nextAppointment?: string; // 次回予定日（任意）
  byUserId: string; // 記録者 User.id
  createdAt: string;
  updatedAt: string;
}
