/**
 * oppTasks.ts — 案件タスク行導出ユーティリティ
 *
 * ADR-B4 v2 §B4-7 準拠 (2026-08-07)
 * 純関数。副作用なし。UI・テストから共用。
 *
 * contractTasks（証券回収/ポリシーレビュー=案件単位）+
 * insuredTasks（意向シート/署名=被保険者単位）を
 * OppTaskRow[] の統一ビューへ展開する。
 */

import type { Opportunity, OppTaskRow, Person } from "../types";
import { format } from "date-fns";

/**
 * 今日の日付を YYYY-MM-DD 形式で返す（テスト注入可能にするためオーバーライド引数を持つ）
 */
export function todayStr(override?: string): string {
  return override ?? format(new Date(), "yyyy-MM-dd");
}

/**
 * 案件から OppTaskRow[] を導出する。
 *
 * 行の順序:
 *   1. 証券回収 (policyCollect) — 案件単位
 *   2. ポリシーレビュー (policyReview) — 案件単位
 *   3. 意向シート×各被保険者 (intentSheet:personId) — 被保険者単位
 *   4. 署名×各被保険者 (signature:personId) — 被保険者単位
 *
 * @param opp - 対象案件
 * @param persons - 被保険者 Person 一覧（household の全 persons を渡す）
 */
export function getOppTaskRows(
  opp: Opportunity,
  persons: Person[],
): OppTaskRow[] {
  const rows: OppTaskRow[] = [];

  // ── 1. 案件単位タスク: 証券回収 ──────────────────────────────────────────────
  {
    const ct = opp.contractTasks;
    rows.push({
      key: "policyCollect",
      kind: "policyCollect",
      label: "証券回収",
      scope: "opportunity",
      done: ct?.policyCollected ?? false,
      date: ct?.policyCollectDate,
      ownerId: opp.ownerId,
    });
  }

  // ── 2. 案件単位タスク: ポリシーレビュー ─────────────────────────────────────
  {
    const ct = opp.contractTasks;
    rows.push({
      key: "policyReview",
      kind: "policyReview",
      label: "ポリシーレビュー",
      scope: "opportunity",
      done: ct?.policyReviewed ?? false,
      date: ct?.policyReviewDate,
      ownerId: opp.ownerId,
    });
  }

  // ── 3+4. 被保険者単位タスク: 意向シート & 署名 ──────────────────────────────
  // 案件の targetPersonIds 優先、なければ insuredTasks の personId から
  const insuredPersonIds = resolveInsuredPersonIds(opp, persons);

  for (const personId of insuredPersonIds) {
    const person = persons.find((p) => p.id === personId);
    const taskState = opp.insuredTasks?.find((t) => t.personId === personId);

    // 意向シート
    rows.push({
      key: `intentSheet:${personId}`,
      kind: "intentSheet",
      label: "意向シート",
      scope: "insured",
      personId,
      personName: person?.name,
      done: taskState?.intentSheetDone ?? false,
      date: taskState?.intentSheetDate,
      ownerId: opp.ownerId,
    });

    // 署名
    rows.push({
      key: `signature:${personId}`,
      kind: "signature",
      label: "署名",
      scope: "insured",
      personId,
      personName: person?.name,
      done: taskState?.signatureDone ?? false,
      date: taskState?.signatureDate,
      ownerId: opp.ownerId,
    });
  }

  return rows;
}

/**
 * 被保険者 personIds を解決する。
 * 優先: opp.targetPersonIds
 * フォールバック: insuredTasks の personId 一覧
 */
function resolveInsuredPersonIds(
  opp: Opportunity,
  persons: Person[],
): string[] {
  void persons; // available for future use (e.g. filtering by household)
  if (opp.targetPersonIds.length > 0) {
    return opp.targetPersonIds;
  }
  if (opp.insuredTasks && opp.insuredTasks.length > 0) {
    // 重複除去・挿入順維持
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const t of opp.insuredTasks) {
      if (!seen.has(t.personId)) {
        seen.add(t.personId);
        ids.push(t.personId);
      }
    }
    return ids;
  }
  return [];
}

/**
 * タスク完了操作: 証券回収を complete/uncomplete する。
 * store の updateOpportunity に渡す Partial<Opportunity> を返す。
 *
 * @param opp 現在の案件
 * @param done 完了状態
 * @param today 完了日（テスト用注入可能）
 */
export function togglePolicyCollect(
  opp: Opportunity,
  done: boolean,
  today?: string,
): Partial<Opportunity> {
  return {
    contractTasks: {
      policyCollected: done,
      policyCollectDate: done
        ? (opp.contractTasks?.policyCollectDate ?? todayStr(today))
        : opp.contractTasks?.policyCollectDate,
      policyReviewed: opp.contractTasks?.policyReviewed ?? false,
      policyReviewDate: opp.contractTasks?.policyReviewDate,
    },
  };
}

/**
 * タスク完了操作: ポリシーレビューを complete/uncomplete する。
 */
export function togglePolicyReview(
  opp: Opportunity,
  done: boolean,
  today?: string,
): Partial<Opportunity> {
  return {
    contractTasks: {
      policyCollected: opp.contractTasks?.policyCollected ?? false,
      policyCollectDate: opp.contractTasks?.policyCollectDate,
      policyReviewed: done,
      policyReviewDate: done
        ? (opp.contractTasks?.policyReviewDate ?? todayStr(today))
        : opp.contractTasks?.policyReviewDate,
    },
  };
}

/**
 * タスク完了操作: 被保険者単位の意向シートを complete/uncomplete する。
 */
export function toggleIntentSheet(
  opp: Opportunity,
  personId: string,
  done: boolean,
  today?: string,
): Partial<Opportunity> {
  const existing = opp.insuredTasks ?? [];
  const idx = existing.findIndex((t) => t.personId === personId);

  const next = [...existing];
  if (idx >= 0) {
    next[idx] = {
      ...next[idx],
      intentSheetDone: done,
      intentSheetDate: done
        ? (next[idx].intentSheetDate ?? todayStr(today))
        : next[idx].intentSheetDate,
    };
  } else {
    next.push({
      personId,
      intentSheetDone: done,
      intentSheetDate: done ? todayStr(today) : undefined,
      signatureDone: false,
    });
  }

  return { insuredTasks: next };
}

/**
 * タスク完了操作: 被保険者単位の署名を complete/uncomplete する。
 */
export function toggleSignature(
  opp: Opportunity,
  personId: string,
  done: boolean,
  today?: string,
): Partial<Opportunity> {
  const existing = opp.insuredTasks ?? [];
  const idx = existing.findIndex((t) => t.personId === personId);

  const next = [...existing];
  if (idx >= 0) {
    next[idx] = {
      ...next[idx],
      signatureDone: done,
      signatureDate: done
        ? (next[idx].signatureDate ?? todayStr(today))
        : next[idx].signatureDate,
    };
  } else {
    next.push({
      personId,
      intentSheetDone: false,
      signatureDone: done,
      signatureDate: done ? todayStr(today) : undefined,
    });
  }

  return { insuredTasks: next };
}
