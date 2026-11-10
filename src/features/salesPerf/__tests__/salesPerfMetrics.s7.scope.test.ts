// =====================================================
// salesPerfMetrics.s7.scope.test.ts — S7 contractRows (1/2)
// スコープ制御 / 要確認フラグ (_issues)
// =====================================================
import { describe, it, expect } from "vitest";
import { contractRows } from "../lib/salesPerfMetrics";
import { defaultFilter, masters, makeContract } from "./_helpers/s7Fixtures";

// ----------------------------------------
// S7: contractRows — スコープ制御
// ----------------------------------------
describe("contractRows — スコープ制御", () => {
  it("admin ロールは全担当の契約を返す", () => {
    const contracts = [
      makeContract({ id: "c1", ownerId: "u1" }),
      makeContract({ id: "c2", ownerId: "u2" }),
      makeContract({ id: "c3", ownerId: "u4" }),
    ];
    const rows = contractRows(contracts, defaultFilter, masters, "admin", "u3");
    expect(rows).toHaveLength(3);
  });

  it("general ロールは自分の担当のみ返す", () => {
    const contracts = [
      makeContract({ id: "c1", ownerId: "u1" }),
      makeContract({ id: "c2", ownerId: "u2" }),
      makeContract({ id: "c3", ownerId: "u4" }),
    ];
    const rows = contractRows(
      contracts,
      defaultFilter,
      masters,
      "general",
      "u1",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].ownerId).toBe("u1");
  });

  it("general ロール: 他担当の契約は含まない", () => {
    const contracts = [
      makeContract({ id: "c1", ownerId: "u2" }),
      makeContract({ id: "c2", ownerId: "u4" }),
    ];
    const rows = contractRows(
      contracts,
      defaultFilter,
      masters,
      "general",
      "u1",
    );
    expect(rows).toHaveLength(0);
  });

  it("manager ロールは全担当の契約を返す", () => {
    const contracts = [
      makeContract({ id: "c1", ownerId: "u1" }),
      makeContract({ id: "c2", ownerId: "u4" }),
    ];
    const rows = contractRows(
      contracts,
      defaultFilter,
      masters,
      "manager",
      "u3",
    );
    expect(rows).toHaveLength(2);
  });

  it("executive ロールは全担当の契約を返す", () => {
    const contracts = [
      makeContract({ id: "c1", ownerId: "u1" }),
      makeContract({ id: "c2", ownerId: "u2" }),
      makeContract({ id: "c3", ownerId: "u4" }),
    ];
    const rows = contractRows(
      contracts,
      defaultFilter,
      masters,
      "executive",
      "u3",
    );
    expect(rows).toHaveLength(3);
  });
});

// ----------------------------------------
// S7: contractRows — 要確認フラグ (_issues)
// ----------------------------------------
describe("contractRows — 要確認フラグ (_issues)", () => {
  it("要確認フラグなし契約は _issues が空配列", () => {
    const contracts = [makeContract({ id: "c1", ownerId: "u1", _issues: [] })];
    const rows = contractRows(contracts, defaultFilter, masters, "admin", "u1");
    expect(rows[0]._issues).toEqual([]);
  });

  it("premium_unparseable フラグが立った契約は _issues に含まれる", () => {
    const contracts = [
      makeContract({
        id: "c1",
        ownerId: "u1",
        monthlyPremium: null,
        _issues: ["premium_unparseable"],
      }),
    ];
    const rows = contractRows(contracts, defaultFilter, masters, "admin", "u1");
    expect(rows[0]._issues).toContain("premium_unparseable");
  });

  it("confidence_unknown フラグが立った契約は _issues に含まれる", () => {
    const contracts = [
      makeContract({
        id: "c1",
        ownerId: "u1",
        confidenceCode: "unknown",
        _issues: ["confidence_unknown"],
      }),
    ];
    const rows = contractRows(contracts, defaultFilter, masters, "admin", "u1");
    expect(rows[0]._issues).toContain("confidence_unknown");
  });

  it("fy_mismatch フラグが立った契約は _issues に含まれる", () => {
    const contracts = [
      makeContract({
        id: "c1",
        ownerId: "u1",
        establishedDate: null,
        month: null,
        _issues: ["fy_mismatch"],
      }),
    ];
    const rows = contractRows(contracts, defaultFilter, masters, "admin", "u1");
    expect(rows[0]._issues).toContain("fy_mismatch");
  });

  it("複数フラグが立った契約は全て _issues に含まれる", () => {
    const issues = ["premium_unparseable", "confidence_unknown", "fy_mismatch"];
    const contracts = [
      makeContract({
        id: "c1",
        ownerId: "u1",
        firstYearCommission: null,
        _issues: issues,
      }),
    ];
    const rows = contractRows(contracts, defaultFilter, masters, "admin", "u1");
    expect(rows[0]._issues).toEqual(issues);
  });

  it("要確認フラグあり契約と正常契約が混在する場合、両方含まれる", () => {
    const contracts = [
      makeContract({ id: "c1", ownerId: "u1", _issues: [] }),
      makeContract({
        id: "c2",
        ownerId: "u1",
        _issues: ["premium_unparseable"],
      }),
      makeContract({ id: "c3", ownerId: "u1", _issues: ["fy_mismatch"] }),
    ];
    const rows = contractRows(contracts, defaultFilter, masters, "admin", "u1");
    expect(rows).toHaveLength(3);
    expect(rows.filter((r) => r._issues.length > 0)).toHaveLength(2);
    expect(rows.filter((r) => r._issues.length === 0)).toHaveLength(1);
  });

  it("要確認フラグは contractRows から除外されない(集計除外ではなく表示で区別)", () => {
    // 金額系 null でも件数に計上される
    const contracts = [
      makeContract({
        id: "c1",
        ownerId: "u1",
        firstYearCommission: null,
        _issues: ["premium_unparseable"],
      }),
    ];
    const rows = contractRows(
      contracts,
      defaultFilter,
      masters,
      "general",
      "u1",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].firstYearCommission).toBeNull();
  });
});
