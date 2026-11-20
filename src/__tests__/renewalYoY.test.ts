import { describe, it, expect } from "vitest";
import {
  calcYoY,
  formatYoY,
  summarizeYoY,
  canMarkRenewed,
  withDefaultRenewedPremium,
} from "../utils/renewalYoY";

const c = (status: string, prev?: number, renewed?: number) =>
  ({
    status,
    prevYearPremium: prev,
    survey: renewed != null ? { consult: { renewedPremium: renewed } } : undefined,
  }) as never;

describe("renewalYoY (B5)", () => {
  it("更改済: 増額", () => {
    const y = calcYoY(c("renewed", 100000, 103200));
    expect(y).toEqual({ kind: "renewed", diff: 3200, ratio: 3.2 });
    expect(formatYoY(y)).toBe("+3,200円（+3.2%）");
  });
  it("更改済: 減額", () => {
    const y = calcYoY(c("renewed", 100000, 90000));
    expect(formatYoY(y)).toBe("−10,000円（−10.0%）");
  });
  it("前年0円なら率は出さない", () => {
    const y = calcYoY(c("renewed", 0, 5000));
    expect(formatYoY(y)).toBe("+5,000円");
  });
  it("他社流出・解約は −前年", () => {
    expect(formatYoY(calcYoY(c("lost_to_competitor", 85000)), "lost_to_competitor")).toBe("−85,000円（流出）");
    expect(formatYoY(calcYoY(c("cancelled", 85000)), "cancelled")).toBe("−85,000円（解約）");
  });
  it("未対応・対応中・金額欠落は —", () => {
    expect(formatYoY(calcYoY(c("in_progress", 100, 200)))).toBe("—");
    expect(formatYoY(calcYoY(c("renewed", 100)))).toBe("—");
  });
  it("合計", () => {
    const s = summarizeYoY([
      c("renewed", 100000, 110000),
      c("lost_to_competitor", 50000),
      c("not_started", 30000),
    ]);
    expect(s).toEqual({ prevTotal: 180000, renewedTotal: 110000, diffTotal: 10000 - 50000 });
  });
  it("Q6: 更改済には金額が必要、既定は前年と同額", () => {
    expect(canMarkRenewed(c("in_progress"))).toBe(false);
    expect(canMarkRenewed(c("in_progress", 1000))).toBe(true);
    const s = withDefaultRenewedPremium(c("in_progress", 1000), "t");
    expect(s?.consult?.renewedPremium).toBe(1000);
    const kept = c("in_progress", 1000, 1200);
    expect(withDefaultRenewedPremium(kept, "t")).toBe((kept as { survey: unknown }).survey);
  });
});
