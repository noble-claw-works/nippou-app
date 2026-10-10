// =====================================================
// salesPerfMetrics.s1.ranking.test.ts — S1集計 単体テスト (2/2)
// stackedByConfidence / ownerRanking / applyFilter
// =====================================================
import { describe, it, expect } from "vitest";
import {
  stackedByConfidence,
  ownerRanking,
  applyFilter,
} from "../lib/salesPerfMetrics";
import {
  defaultFilter,
  masters,
  makeContract,
  makeTarget,
} from "./_helpers/s1Fixtures";
import type { SalesPerfFilter } from "../types";

// ----------------------------------------
// stackedByConfidence
// ----------------------------------------
describe("stackedByConfidence", () => {
  it("12ヶ月分のポイントを返す", () => {
    const result = stackedByConfidence(
      [],
      defaultFilter,
      masters,
      "admin",
      "u1",
    );
    expect(result).toHaveLength(12);
  });

  it("確度コード fixed が正しく集計される", () => {
    const contracts = [
      makeContract({
        id: "c1",
        month: 1,
        confidenceCode: "fixed",
        firstYearCommission: 100000,
      }),
      makeContract({
        id: "c2",
        month: 1,
        confidenceCode: "S",
        firstYearCommission: 200000,
      }),
    ];
    const result = stackedByConfidence(
      contracts,
      defaultFilter,
      masters,
      "admin",
      "u1",
    );
    expect(result[0].fixed).toBe(100000);
    expect(result[0].S).toBe(200000);
  });

  it("異なる月に分散したデータが正しい月に集計される", () => {
    const contracts = [
      makeContract({
        id: "c1",
        month: 1,
        confidenceCode: "fixed",
        firstYearCommission: 100000,
      }),
      makeContract({
        id: "c2",
        month: 6,
        confidenceCode: "A",
        firstYearCommission: 300000,
      }),
    ];
    const result = stackedByConfidence(
      contracts,
      defaultFilter,
      masters,
      "admin",
      "u1",
    );
    expect(result[0].fixed).toBe(100000);
    expect(result[0].A).toBe(0);
    expect(result[5].fixed).toBe(0);
    expect(result[5].A).toBe(300000);
  });
});

// ----------------------------------------
// ownerRanking
// ----------------------------------------
describe("ownerRanking", () => {
  it("進捗率の高い順にソートされる", () => {
    const contracts = [
      makeContract({ id: "c1", ownerId: "u1", firstYearCommission: 100000 }),
      makeContract({ id: "c2", ownerId: "u2", firstYearCommission: 800000 }),
    ];
    const targets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].flatMap((m) => [
      makeTarget({
        month: m,
        scopeType: "individual",
        scopeId: "u1",
        amount: 100000,
        line: "life",
      }),
      makeTarget({
        month: m,
        scopeType: "individual",
        scopeId: "u2",
        amount: 100000,
        line: "life",
      }),
    ]);
    const result = ownerRanking(
      contracts,
      targets,
      defaultFilter,
      masters,
      "admin",
      "u1",
    );
    // u2 が高い進捗率
    expect(result[0].ownerId).toBe("u2");
  });

  it("budget=0 の担当者の progressRate は null", () => {
    const contracts = [
      makeContract({ ownerId: "u1", firstYearCommission: 100000 }),
    ];
    const result = ownerRanking(
      contracts,
      [],
      defaultFilter,
      masters,
      "admin",
      "u1",
    );
    const u1row = result.find((r) => r.ownerId === "u1");
    expect(u1row?.progressRate).toBeNull();
  });

  it("general ロールは自分のみのランキング (1行)", () => {
    const contracts = [
      makeContract({ id: "c1", ownerId: "u1" }),
      makeContract({ id: "c2", ownerId: "u2" }),
    ];
    const result = ownerRanking(
      contracts,
      [],
      defaultFilter,
      masters,
      "general",
      "u1",
    );
    expect(result).toHaveLength(1);
    expect(result[0].ownerId).toBe("u1");
  });

  it("ownerName が masters から正しく取得される", () => {
    const contracts = [makeContract({ ownerId: "u1" })];
    const result = ownerRanking(
      contracts,
      [],
      defaultFilter,
      masters,
      "admin",
      "u1",
    );
    const u1row = result.find((r) => r.ownerId === "u1");
    expect(u1row?.ownerName).toBe("霧島 遥");
  });

  it("commission が確度シナリオに応じて絞られる", () => {
    const filterFixedS = {
      ...defaultFilter,
      confidenceScenario: "fixed_s" as const,
    };
    const contracts = [
      makeContract({
        id: "c1",
        ownerId: "u1",
        confidenceCode: "fixed",
        confidenceAgg: "fixed",
        firstYearCommission: 100000,
      }),
      makeContract({
        id: "c2",
        ownerId: "u1",
        confidenceCode: "S",
        confidenceAgg: "fixed_s",
        firstYearCommission: 200000,
      }),
      makeContract({
        id: "c3",
        ownerId: "u1",
        confidenceCode: "A",
        confidenceAgg: "fixed_s_a",
        firstYearCommission: 300000,
      }),
    ];
    const result = ownerRanking(
      contracts,
      [],
      filterFixedS,
      masters,
      "admin",
      "u1",
    );
    const u1row = result.find((r) => r.ownerId === "u1");
    // fixed + S のみ = 300000
    expect(u1row?.commission).toBe(300000);
  });
});

// ----------------------------------------
// applyFilter (S1 用基本確認)
// ----------------------------------------
describe("applyFilter (S1 利用ケース)", () => {
  it("fiscalYear が合わないものは除外", () => {
    const contracts = [
      makeContract({ id: "c1", fiscalYear: 2025 }),
      makeContract({ id: "c2", fiscalYear: 2024 }),
    ];
    const result = applyFilter(contracts, defaultFilter, ["u1", "u2", "u3"]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c1");
  });

  it("insurer フィルタが正しく適用される", () => {
    const filter = { ...defaultFilter, insurer: "第一生命" };
    const contracts = [
      makeContract({ id: "c1", insurer: "第一生命" }),
      makeContract({ id: "c2", insurer: "日本生命" }),
    ];
    const result = applyFilter(contracts, filter, ["u1", "u2", "u3"]);
    expect(result).toHaveLength(1);
  });

  it("channel フィルタが正しく適用される", () => {
    const filter = { ...defaultFilter, channel: "紹介" };
    const contracts = [
      makeContract({ id: "c1", channel: "紹介" }),
      makeContract({ id: "c2", channel: "飛込" }),
    ];
    const result = applyFilter(contracts, filter, ["u1", "u2", "u3"]);
    expect(result).toHaveLength(1);
  });

  it("periodMode=single: 指定月のみ", () => {
    const filter: SalesPerfFilter = {
      ...defaultFilter,
      periodMode: "single",
      singleMonth: 3,
    };
    const contracts = [
      makeContract({ id: "c1", month: 3 }),
      makeContract({ id: "c2", month: 5 }),
      makeContract({ id: "c3", month: null }), // 未計上
    ];
    const result = applyFilter(contracts, filter, ["u1", "u2", "u3"]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c1");
  });

  it("periodMode=h1: month=null の未計上は含む (仕様通り)", () => {
    // 設計書: "month が null の未計上は full/h1/h2 では含む。singleMonth は除外"
    const filter: SalesPerfFilter = { ...defaultFilter, periodMode: "h1" };
    const contracts = [
      makeContract({ id: "c1", month: 1 }),
      makeContract({ id: "c2", month: 6 }),
      makeContract({ id: "c3", month: 7 }), // h1 範囲外だが h1 では除外しない
      makeContract({ id: "c4", month: null }), // null は含む
    ];
    const result = applyFilter(contracts, filter, ["u1", "u2", "u3"]);
    // h1/h2/full では month 絞りをしない (singleMonth のみ絞る)
    expect(result).toHaveLength(4);
  });

  it("line=life のみ", () => {
    const filter = { ...defaultFilter, line: "life" as const };
    const contracts = [
      makeContract({ id: "c1", line: "life" }),
      makeContract({ id: "c2", line: "nonlife" }),
    ];
    const result = applyFilter(contracts, filter, ["u1", "u2", "u3"]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c1");
  });
});
