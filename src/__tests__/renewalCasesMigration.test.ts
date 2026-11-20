import { describe, it, expect } from "vitest";
import {
  migrateRenewalCases,
  needsLegacyReview,
  LEGACY_RENEWAL_LOST_TARGET,
} from "../utils/migrations/renewalCases";
import type { RenewalCase } from "../types";

const mk = (o: Record<string, unknown>) =>
  ({ id: "r1", status: "not_started", method: "undecided", activityLog: [], ...o }) as unknown as RenewalCase;

describe("migrateRenewalCases (B5)", () => {
  it("completed → renewed", () => {
    const [r] = migrateRenewalCases([mk({ status: "completed" })]);
    expect(r.status).toBe("renewed");
  });

  it("手段=更新落ち: 状況は変えず印だけ付け、手段は未定へ (Q5保留)", () => {
    expect(LEGACY_RENEWAL_LOST_TARGET).toBeNull();
    const [r] = migrateRenewalCases([mk({ status: "in_progress", method: "renewal_lost" })]);
    expect(r.status).toBe("in_progress");
    expect(r.method).toBe("undecided");
    expect(r.legacyRenewalLost).toBe(true);
    expect(needsLegacyReview(r)).toBe(true);
  });

  it("survey 内の更新落ちも未定へ", () => {
    const [r] = migrateRenewalCases([
      mk({ survey: { consult: { renewalMethod: "renewal_lost" }, pairMtg: { plannedMethod: "renewal_lost" } } }),
    ]);
    expect(r.survey?.consult?.renewalMethod).toBe("undecided");
    expect(r.survey?.pairMtg?.plannedMethod).toBe("undecided");
    expect(r.legacyRenewalLost).toBe(true);
  });

  it("冪等: 2回目は同じ参照・同じ結果", () => {
    const once = migrateRenewalCases([
      mk({ status: "completed" }),
      mk({ id: "r2", method: "renewal_lost" }),
      mk({ id: "r3" }),
    ]);
    const twice = migrateRenewalCases(once);
    expect(twice).toBe(once);
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
  });

  it("旧値が無ければ入力と同じ配列を返す", () => {
    const input = [mk({ status: "renewed" })];
    expect(migrateRenewalCases(input)).toBe(input);
  });

  it("他社流出/解約になった案件は要確認を出さない", () => {
    expect(needsLegacyReview({ legacyRenewalLost: true, status: "cancelled" })).toBe(false);
    expect(needsLegacyReview({ legacyRenewalLost: true, status: "lost_to_competitor" })).toBe(false);
    expect(needsLegacyReview({ status: "not_started" })).toBe(false);
  });
});
