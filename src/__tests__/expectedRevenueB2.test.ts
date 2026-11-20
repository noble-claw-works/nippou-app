// B2: 提案商品の契約者/チャネル/初年度手数料 + 見込み収益カード
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { calcExpectedRevenue, CONFIDENCE_WEIGHTS } from "../utils/expectedRevenue";
import {
  validateProposalProduct,
  emptyProposalProduct,
  effectiveContractorId,
  effectiveChannelId,
} from "../components/opportunity/proposalProductMeta";
import { ExpectedRevenueCard } from "../components/sales/ExpectedRevenueCard";
import type { Opportunity } from "../types";

const op = (o: Record<string, unknown>, commissions: Array<number | undefined>): Opportunity =>
  ({
    id: "o" + Math.random(),
    ownerId: "u1",
    status: "open",
    stage: "proposed",
    confidence: "A",
    proposalProducts: commissions.map((c, i) => ({ id: "p" + i, firstYearCommission: c })),
    ...o,
  }) as unknown as Opportunity;

describe("calcExpectedRevenue", () => {
  it("Σ(初年度手数料×確度) を成約予定月別に集計", () => {
    const r = calcExpectedRevenue(
      [
        op({ expectedCloseDate: "2026-12-15", confidence: "S" }, [100000, 50000]),
        op({ expectedCloseDate: "2026-12-20", confidence: "B" }, [10000]),
        op({ expectedCloseDate: "2027-01-05", confidence: "fixed" }, [20000]),
      ],
      ["u1"],
    );
    expect(r.scheduled.map((b) => [b.key, b.amount])).toEqual([
      ["2026-12", 150000 * CONFIDENCE_WEIGHTS.S + 10000 * CONFIDENCE_WEIGHTS.B],
      ["2027-01", 20000],
    ]);
    expect(r.undecided.amount).toBe(0);
    expect(r.total).toBe(r.scheduledTotal);
  });
  it("成約予定日なしは期間未定の別枠（月別に混ぜない）", () => {
    const r = calcExpectedRevenue([op({ confidence: "A" }, [100000])], ["u1"]);
    expect(r.scheduled).toEqual([]);
    expect(r.undecided.amount).toBe(70000);
    expect(r.undecided.productCount).toBe(1);
    expect(r.total).toBe(70000);
  });
  it("成立・失注・他担当は含めず、手数料未入力/確度未設定は件数で報告", () => {
    const r = calcExpectedRevenue(
      [
        op({ status: "won", stage: "issued" }, [999]),
        op({ status: "lost", stage: "lost" }, [999]),
        op({ ownerId: "u2" }, [999]),
        op({}, [undefined, 1000]),
        op({ confidence: undefined }, [5000]),
      ],
      ["u1"],
    );
    expect(r.missingCommissionCount).toBe(1);
    expect(r.missingConfidenceCount).toBe(1);
    expect(r.total).toBe(700);
  });
});

describe("提案商品フォーム項目", () => {
  it("初年度手数料は 0以上の整数のみ", () => {
    const base = { ...emptyProposalProduct(), productName: "x", insurer: "日本生命保険", monthlyPremium: 1000 };
    expect(validateProposalProduct({ ...base, firstYearCommission: 1000 }).firstYearCommission).toBeUndefined();
    expect(validateProposalProduct({ ...base }).firstYearCommission).toBeUndefined();
    expect(validateProposalProduct({ ...base, firstYearCommission: -1 }).firstYearCommission).toBeTruthy();
    expect(validateProposalProduct({ ...base, firstYearCommission: 1.5 }).firstYearCommission).toBeTruthy();
  });
  it("契約者/チャネルは商品が無ければ案件を継承", () => {
    expect(effectiveContractorId({}, { contractorPersonId: "c1" })).toBe("c1");
    expect(effectiveContractorId({ contractorPersonId: "c2" }, { contractorPersonId: "c1" })).toBe("c2");
    expect(effectiveChannelId({}, {})).toBeUndefined();
    expect(effectiveChannelId({ channelId: "ch" }, { channelId: "x" })).toBe("ch");
  });
});

describe("ExpectedRevenueCard", () => {
  it("合計と期間未定枠が表示される", () => {
    render(createElement(ExpectedRevenueCard, { opportunities: [op({}, [100000])], ownerIds: ["u1"] }));
    expect(screen.getByTestId("expected-revenue-total").textContent).toBe("¥70,000");
    expect(screen.getByTestId("expected-revenue-undecided").textContent).toContain("期間未定");
  });
});
