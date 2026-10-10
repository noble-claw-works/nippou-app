// =====================================================
// シードデータ — 世帯対応記録 (CustomerInteraction)
// =====================================================
import type { CustomerInteraction } from "../../types";
import { d, f } from "./helpers";

const _now = new Date().toISOString();

export const CUSTOMER_INTERACTIONS: CustomerInteraction[] = [
  // c1: KOORO GILSON — 電話連絡
  {
    id: "ci_c1_1",
    householdId: "c1",
    personId: "p_c1_head",
    kind: "phone",
    occurredAt: d(3),
    summary:
      "自動車保険の更新時期についてご連絡。7月末に満期を迎えるため、来週ご来店いただけることになった。",
    nextAppointment: f(7),
    byUserId: "u1",
    createdAt: _now,
    updatedAt: _now,
  },
  // c1: KOORO GILSON — 接客
  {
    id: "ci_c1_2",
    householdId: "c1",
    personId: "p_c1_head",
    kind: "reception",
    occurredAt: d(10),
    summary:
      "ご来店いただき、生命保険の見直しについてヒアリング。配偶者の医療保険が未加入のため、次回提案書を持参することを約束。",
    byUserId: "u1",
    createdAt: _now,
    updatedAt: _now,
  },
  // c2: 齋藤 和久 — 電話連絡
  {
    id: "ci_c2_1",
    householdId: "c2",
    personId: "p_c2_head",
    kind: "phone",
    occurredAt: d(5),
    summary:
      "生命保険の保険料についてお問い合わせがあり対応。内容を確認して折り返し連絡することを伝えた。",
    byUserId: "u1",
    createdAt: _now,
    updatedAt: _now,
  },
  // c4 相当の世帯 — 訪問
  {
    id: "ci_c4_1",
    householdId: "c4",
    kind: "visit",
    occurredAt: d(7),
    summary:
      "訪問ご挨拶。法人向け損害保険の案内資料をお渡しした。担当者の山田部長が不在のため、後日改めてご連絡いただくことになった。",
    nextAppointment: f(14),
    byUserId: "u1",
    createdAt: _now,
    updatedAt: _now,
  },
  // c5 相当の世帯 — メール
  {
    id: "ci_c5_1",
    householdId: "c5",
    kind: "email",
    occurredAt: d(2),
    summary: "更新案内資料をメールにてご送付。返信待ち。",
    byUserId: "u3",
    createdAt: _now,
    updatedAt: _now,
  },
];
