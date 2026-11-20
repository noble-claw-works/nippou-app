// =====================================================
// migrations/renewalCases.ts — 損保更新 localStorage 旧データ変換（B5）
// 純関数・冪等。SEED_VERSION は上げない。
// =====================================================
import type { RenewalCase, RenewalStatus } from "../../types";
import { TERMINAL_RENEWAL_STATUSES } from "../../types/renewal";

/**
 * Q5（⏸保留）: 旧「更新落ち」データの移行先状況。
 * null = 自動変換しない（状況はそのまま、legacyRenewalLost の印だけ付ける）。
 * 主上が決めたら 'cancelled' か 'lost_to_competitor' に変える（この1箇所のみ）。
 */
export const LEGACY_RENEWAL_LOST_TARGET: RenewalStatus | null = null;

type Loose = Record<string, unknown>;

function migrateOne(raw: RenewalCase): RenewalCase {
  const rc = raw as unknown as Loose;
  let changed = false;
  let status = rc.status as string;
  let method = rc.method as string;
  let legacy = rc.legacyRenewalLost as boolean | undefined;
  let survey = rc.survey as Loose | undefined;
  const activityLog = rc.activityLog as RenewalCase["activityLog"] | undefined;

  if (status === "completed") {
    status = "renewed";
    changed = true;
  }

  if (method === "renewal_lost") {
    method = "undecided";
    legacy = true;
    changed = true;
    if (
      LEGACY_RENEWAL_LOST_TARGET &&
      !TERMINAL_RENEWAL_STATUSES.includes(status as RenewalStatus)
    ) {
      status = LEGACY_RENEWAL_LOST_TARGET;
    }
  }

  if (survey) {
    const consult = survey.consult as Loose | undefined;
    const pair = survey.pairMtg as Loose | undefined;
    let nc = consult;
    let np = pair;
    if (consult && consult.renewalMethod === "renewal_lost") {
      nc = { ...consult, renewalMethod: "undecided" };
      legacy = true;
      changed = true;
    }
    if (pair && pair.plannedMethod === "renewal_lost") {
      np = { ...pair, plannedMethod: "undecided" };
      legacy = true;
      changed = true;
    }
    if (nc !== consult || np !== pair) {
      survey = { ...survey, ...(nc ? { consult: nc } : {}), ...(np ? { pairMtg: np } : {}) };
    }
  }

  if (!changed) return raw;
  return {
    ...(rc as unknown as RenewalCase),
    status: status as RenewalStatus,
    method: method as RenewalCase["method"],
    survey: survey as unknown as RenewalCase["survey"],
    activityLog: activityLog ?? [],
    ...(legacy ? { legacyRenewalLost: true } : {}),
  };
}

/** 旧データ変換。旧値が無ければ同じ参照を返す（冪等）。 */
export function migrateRenewalCases(raw: RenewalCase[]): RenewalCase[] {
  let any = false;
  const out = raw.map((rc) => {
    const n = migrateOne(rc);
    if (n !== rc) any = true;
    return n;
  });
  return any ? out : raw;
}

/** 「要確認(旧:更新落ち)」を出すか。移行先が決まり終端なら出さない。 */
export function needsLegacyReview(rc: Pick<RenewalCase, "legacyRenewalLost" | "status">): boolean {
  return (
    !!rc.legacyRenewalLost &&
    rc.status !== "lost_to_competitor" &&
    rc.status !== "cancelled"
  );
}
