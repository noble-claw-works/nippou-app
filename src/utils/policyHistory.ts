// =====================================================
// policyHistory.ts — 値変更履歴ヘルパ（§2.4 / PC-4）
// 既存契約変更(existing_change)時に PolicyValueChange を組み立てる純関数。
// 履歴化する最小6項目のみ: monthlyPremium / faceAmount(主契約coverage) /
//   productName / insurer / payMode / status
// 変更が無いフィールドは fields に含めない。全項目無変更なら null。
// =====================================================
import type { Policy, PolicyValueChange, PolicyValueDelta } from "../types";

/** 主契約 coverage の faceAmount（無ければ null） */
function mainFaceAmount(policy: Policy): number | null {
  const main = policy.coverages?.find((c) => c.isMain);
  return main?.faceAmount ?? null;
}

interface BuildValueChangeOptions {
  changedByUserId: string;
  source?: PolicyValueChange["source"]; // 既定 "doc4_reflection"
  opportunityId?: string;
  changedAt?: string; // ISO。既定は実行時刻（テストは注入可）
  id?: string; // テスト決定性のため注入可
}

/**
 * before→after の差分から PolicyValueChange を1件組み立てる。
 * 変更フィールドが1件も無ければ null を返す（履歴に push しない）。
 */
export function buildValueChange(
  before: Policy,
  after: Policy,
  opts: BuildValueChangeOptions,
): PolicyValueChange | null {
  const fields: PolicyValueDelta[] = [];

  const push = (
    field: PolicyValueDelta["field"],
    b: string | number | null,
    a: string | number | null,
  ): void => {
    if (b !== a) fields.push({ field, before: b, after: a });
  };

  push("monthlyPremium", before.monthlyPremium ?? null, after.monthlyPremium ?? null);
  push("faceAmount", mainFaceAmount(before), mainFaceAmount(after));
  push("productName", before.productName ?? null, after.productName ?? null);
  push("insurer", before.insurer ?? null, after.insurer ?? null);
  push("payMode", before.payMode ?? null, after.payMode ?? null);
  push("status", before.status ?? null, after.status ?? null);

  if (fields.length === 0) return null;

  const change: PolicyValueChange = {
    id: opts.id ?? `vh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    changedAt: opts.changedAt ?? new Date().toISOString(),
    changedByUserId: opts.changedByUserId,
    source: opts.source ?? "doc4_reflection",
    fields,
  };
  if (opts.opportunityId) change.opportunityId = opts.opportunityId;
  return change;
}
