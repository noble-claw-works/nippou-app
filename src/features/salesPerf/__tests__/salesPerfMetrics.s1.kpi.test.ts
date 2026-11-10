// =====================================================
// salesPerfMetrics.s1.kpi.test.ts — S1集計 単体テスト (1/2)
// kpiSummary / monthlyCommissionVsBudget
// =====================================================
import { describe, it, expect } from "vitest";
import { kpiSummary, monthlyCommissionVsBudget } from "../lib/salesPerfMetrics";
import {
  defaultFilter,
  masters,
  makeContract,
  makeTarget,
} from "./_helpers/s1Fixtures";

// ----------------------------------------
// kpiSummary
// ----------------------------------------
describe("kpiSummary", () => {
  it("空データ → 全て0 or null", () => {
    const result = kpiSummary([], [], defaultFilter, masters, "admin", "u1");
    expect(result.annualBudget).toBe(0);
    expect(result.confirmedCommission).toBe(0);
    expect(result.progressRate).toBeNull(); // 分母0
    expect(result.budgetGap).toBe(0);
    expect(result.yoyRate).toBeNull(); // 分母0
  });

  it("確定手数料が正しく集計される", () => {
    const contracts = [
      makeContract({
        id: "c1",
        firstYearCommission: 300000,
        confidenceAgg: "fixed",
      }),
      makeContract({
        id: "c2",
        firstYearCommission: 200000,
        confidenceAgg: "fixed",
      }),
    ];
    const result = kpiSummary(
      contracts,
      [],
      defaultFilter,
      masters,
      "admin",
      "u1",
    );
    expect(result.confirmedCommission).toBe(500000);
  });

  it("確度シナリオ fixed: S/A は除外", () => {
    const contracts = [
      makeContract({
        id: "c1",
        firstYearCommission: 100000,
        confidenceCode: "fixed",
        confidenceAgg: "fixed",
      }),
      makeContract({
        id: "c2",
        firstYearCommission: 200000,
        confidenceCode: "S",
        confidenceAgg: "fixed_s",
      }),
      makeContract({
        id: "c3",
        firstYearCommission: 300000,
        confidenceCode: "A",
        confidenceAgg: "fixed_s_a",
      }),
    ];
    const result = kpiSummary(
      contracts,
      [],
      defaultFilter,
      masters,
      "admin",
      "u1",
    );
    // fixed シナリオなので確定のみ = 100000
    expect(result.confirmedCommission).toBe(100000);
  });

  it("確度シナリオ fixed_s: S まで含む", () => {
    const filter = { ...defaultFilter, confidenceScenario: "fixed_s" as const };
    const contracts = [
      makeContract({
        id: "c1",
        firstYearCommission: 100000,
        confidenceCode: "fixed",
        confidenceAgg: "fixed",
      }),
      makeContract({
        id: "c2",
        firstYearCommission: 200000,
        confidenceCode: "S",
        confidenceAgg: "fixed_s",
      }),
      makeContract({
        id: "c3",
        firstYearCommission: 300000,
        confidenceCode: "A",
        confidenceAgg: "fixed_s_a",
      }),
    ];
    const result = kpiSummary(contracts, [], filter, masters, "admin", "u1");
    expect(result.confirmedCommission).toBe(300000); // fixed + S
  });

  it("確度シナリオ fixed_s_a: 全て含む", () => {
    const filter = {
      ...defaultFilter,
      confidenceScenario: "fixed_s_a" as const,
    };
    const contracts = [
      makeContract({
        id: "c1",
        firstYearCommission: 100000,
        confidenceCode: "fixed",
        confidenceAgg: "fixed",
      }),
      makeContract({
        id: "c2",
        firstYearCommission: 200000,
        confidenceCode: "S",
        confidenceAgg: "fixed_s",
      }),
      makeContract({
        id: "c3",
        firstYearCommission: 300000,
        confidenceCode: "A",
        confidenceAgg: "fixed_s_a",
      }),
    ];
    const result = kpiSummary(contracts, [], filter, masters, "admin", "u1");
    expect(result.confirmedCommission).toBe(600000); // fixed + S + A
  });

  it("年間予算が正しく集計される (all scope)", () => {
    const targets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) =>
      makeTarget({ month: m, amount: 1_000_000 }),
    );
    const result = kpiSummary(
      [],
      targets,
      defaultFilter,
      masters,
      "admin",
      "u1",
    );
    expect(result.annualBudget).toBe(12_000_000);
  });

  it("進捗率 = 確定 ÷ 予算 × 100", () => {
    const contracts = [makeContract({ firstYearCommission: 6_000_000 })];
    const targets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) =>
      makeTarget({ month: m, amount: 1_000_000 }),
    );
    const result = kpiSummary(
      contracts,
      targets,
      defaultFilter,
      masters,
      "admin",
      "u1",
    );
    expect(result.progressRate).toBeCloseTo(50, 1); // 6M / 12M * 100
  });

  it("目標差額 = 実績 - 予算", () => {
    const contracts = [makeContract({ firstYearCommission: 5_000_000 })];
    const targets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) =>
      makeTarget({ month: m, amount: 500_000 }),
    );
    const result = kpiSummary(
      contracts,
      targets,
      defaultFilter,
      masters,
      "admin",
      "u1",
    );
    expect(result.budgetGap).toBe(5_000_000 - 6_000_000); // -1M
  });

  it("前年比: 前期0件 → null", () => {
    const contracts = [
      makeContract({ fiscalYear: 2025, firstYearCommission: 1_000_000 }),
    ];
    const result = kpiSummary(
      contracts,
      [],
      defaultFilter,
      masters,
      "admin",
      "u1",
    );
    expect(result.yoyRate).toBeNull(); // 前年0 = 分母0
  });

  it("前年比 = 今期 ÷ 前期 × 100", () => {
    const contracts = [
      makeContract({
        id: "cy",
        fiscalYear: 2025,
        firstYearCommission: 1_200_000,
        month: 1,
      }),
      makeContract({
        id: "py",
        fiscalYear: 2024,
        firstYearCommission: 1_000_000,
        month: 1,
      }),
    ];
    const result = kpiSummary(
      contracts,
      [],
      defaultFilter,
      masters,
      "admin",
      "u1",
    );
    expect(result.yoyRate).toBeCloseTo(120, 1);
  });

  it("firstYearCommission=null のコントラクトは集計除外", () => {
    const contracts = [
      makeContract({ id: "c1", firstYearCommission: 500000 }),
      makeContract({ id: "c2", firstYearCommission: null }),
    ];
    const result = kpiSummary(
      contracts,
      [],
      defaultFilter,
      masters,
      "admin",
      "u1",
    );
    expect(result.confirmedCommission).toBe(500000);
  });

  it("general ロール: 自分(u1)のみ集計", () => {
    const contracts = [
      makeContract({ id: "c1", ownerId: "u1", firstYearCommission: 300000 }),
      makeContract({ id: "c2", ownerId: "u2", firstYearCommission: 700000 }),
    ];
    const result = kpiSummary(
      contracts,
      [],
      defaultFilter,
      masters,
      "general",
      "u1",
    );
    expect(result.confirmedCommission).toBe(300000);
  });

  it("ライン フィルタ: life のみ", () => {
    const filter = { ...defaultFilter, line: "life" as const };
    const contracts = [
      makeContract({ id: "c1", line: "life", firstYearCommission: 300000 }),
      makeContract({ id: "c2", line: "nonlife", firstYearCommission: 700000 }),
    ];
    const result = kpiSummary(contracts, [], filter, masters, "admin", "u1");
    expect(result.confirmedCommission).toBe(300000);
  });
});

// ----------------------------------------
// monthlyCommissionVsBudget
// ----------------------------------------
describe("monthlyCommissionVsBudget", () => {
  it("12ヶ月分のデータポイントを返す", () => {
    const result = monthlyCommissionVsBudget(
      [],
      [],
      defaultFilter,
      masters,
      "admin",
      "u1",
    );
    expect(result).toHaveLength(12);
  });

  it("calMonth の形式が YYYY-MM", () => {
    const result = monthlyCommissionVsBudget(
      [],
      [],
      defaultFilter,
      masters,
      "admin",
      "u1",
    );
    // FY2025 1月目 = 2025-04
    expect(result[0].calMonth).toBe("2025-04");
    // FY2025 12月目 = 2026-03
    expect(result[11].calMonth).toBe("2026-03");
  });

  it("累計が正しく積み上がる", () => {
    const contracts = [
      makeContract({ id: "c1", month: 1, firstYearCommission: 100000 }),
      makeContract({ id: "c2", month: 2, firstYearCommission: 150000 }),
      makeContract({ id: "c3", month: 3, firstYearCommission: 200000 }),
    ];
    const result = monthlyCommissionVsBudget(
      contracts,
      [],
      defaultFilter,
      masters,
      "admin",
      "u1",
    );
    expect(result[0].cumActual).toBe(100000);
    expect(result[1].cumActual).toBe(250000);
    expect(result[2].cumActual).toBe(450000);
  });

  it("予算積上げが正しく積み上がる", () => {
    const targets = [1, 2, 3].map((m) =>
      makeTarget({ month: m, amount: 500000 }),
    );
    const result = monthlyCommissionVsBudget(
      [],
      targets,
      defaultFilter,
      masters,
      "admin",
      "u1",
    );
    expect(result[0].cumBudget).toBe(500000);
    expect(result[1].cumBudget).toBe(1000000);
    expect(result[2].cumBudget).toBe(1500000);
  });

  it("月次 actual が正しい", () => {
    const contracts = [
      makeContract({ id: "c1", month: 4, firstYearCommission: 100000 }),
      makeContract({ id: "c2", month: 4, firstYearCommission: 200000 }),
    ];
    const result = monthlyCommissionVsBudget(
      contracts,
      [],
      defaultFilter,
      masters,
      "admin",
      "u1",
    );
    expect(result[3].actual).toBe(300000); // month=4 は index 3
  });
});
