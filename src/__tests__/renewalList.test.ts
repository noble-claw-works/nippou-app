// =====================================================
// renewalList.test.ts — 更新一覧の抽出ロジック単体テスト
// filterRenewalPolicies / daysUntilRenewal / isRenewalNear
// =====================================================
import { describe, it, expect } from "vitest";
import type { Policy } from "../types";
import {
  filterRenewalPolicies,
  daysUntilRenewal,
  isRenewalNear,
  RENEWAL_NEAR_DAYS,
} from "../utils/filterRenewalPolicies";

// ── ヘルパー ──────────────────────────────────────────

function makePolicy(overrides: Partial<Policy> = {}): Policy {
  return {
    id: `pol-${Math.random().toString(36).slice(2)}`,
    householdId: "c1",
    ownerId: "u1",
    contractorPersonId: "p1",
    insuredPersonIds: ["p1"],
    insurer: "東京海上日動",
    productName: "テスト損保",
    productCategory: "auto",
    status: "inforce",
    startDate: "2024-01-01",
    monthlyPremium: 8000,
    payMode: "annual",
    hasCashValue: false,
    coverages: [],
    tags: [],
    memo: "",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ── filterRenewalPolicies ────────────────────────────

describe("filterRenewalPolicies", () => {
  it("損保(auto)かつrenewalDateあり・inforceのみ抽出される", () => {
    const policies: Policy[] = [
      makePolicy({
        productCategory: "auto",
        renewalDate: "2027-01-01",
        status: "inforce",
      }),
      makePolicy({
        productCategory: "fire",
        renewalDate: "2027-02-01",
        status: "inforce",
      }),
      makePolicy({
        productCategory: "liability",
        renewalDate: "2027-03-01",
        status: "inforce",
      }),
    ];
    const result = filterRenewalPolicies(policies);
    expect(result).toHaveLength(3);
    expect(result.map((p) => p.productCategory)).toEqual([
      "auto",
      "fire",
      "liability",
    ]);
  });

  it("生保カテゴリ(life/medical/cancer/income/nursing/savings)は除外される", () => {
    const lifePolicies: Policy[] = [
      makePolicy({ productCategory: "life", renewalDate: "2027-01-01" }),
      makePolicy({ productCategory: "medical", renewalDate: "2027-01-01" }),
      makePolicy({ productCategory: "cancer", renewalDate: "2027-01-01" }),
      makePolicy({ productCategory: "income", renewalDate: "2027-01-01" }),
      makePolicy({ productCategory: "nursing", renewalDate: "2027-01-01" }),
      makePolicy({ productCategory: "savings", renewalDate: "2027-01-01" }),
    ];
    expect(filterRenewalPolicies(lifePolicies)).toHaveLength(0);
  });

  it("renewalDateがない損保は除外される", () => {
    const policies: Policy[] = [
      makePolicy({ productCategory: "auto", renewalDate: undefined }),
      makePolicy({ productCategory: "fire" }), // renewalDate未設定
    ];
    expect(filterRenewalPolicies(policies)).toHaveLength(0);
  });

  it("status=inforce以外(surrendered/lapsed等)は除外される", () => {
    const policies: Policy[] = [
      makePolicy({
        productCategory: "auto",
        renewalDate: "2027-01-01",
        status: "surrendered",
      }),
      makePolicy({
        productCategory: "auto",
        renewalDate: "2027-01-01",
        status: "lapsed",
      }),
      makePolicy({
        productCategory: "auto",
        renewalDate: "2027-01-01",
        status: "pending",
      }),
    ];
    expect(filterRenewalPolicies(policies)).toHaveLength(0);
  });

  it("renewalDate昇順でソートされる", () => {
    const policies: Policy[] = [
      makePolicy({
        productCategory: "auto",
        renewalDate: "2027-06-01",
        status: "inforce",
      }),
      makePolicy({
        productCategory: "fire",
        renewalDate: "2027-01-15",
        status: "inforce",
      }),
      makePolicy({
        productCategory: "liability",
        renewalDate: "2027-03-10",
        status: "inforce",
      }),
    ];
    const result = filterRenewalPolicies(policies);
    expect(result.map((p) => p.renewalDate)).toEqual([
      "2027-01-15",
      "2027-03-10",
      "2027-06-01",
    ]);
  });

  it("空配列のとき空配列を返す", () => {
    expect(filterRenewalPolicies([])).toHaveLength(0);
  });

  it("損保でrenewalDateなし・生保でrenewalDateありが混在しても0件", () => {
    const mixed: Policy[] = [
      makePolicy({ productCategory: "auto" }), // renewalDate未設定
      makePolicy({ productCategory: "life", renewalDate: "2027-01-01" }), // 生保
    ];
    expect(filterRenewalPolicies(mixed)).toHaveLength(0);
  });
});

// ── daysUntilRenewal ─────────────────────────────────

describe("daysUntilRenewal", () => {
  it("renewalDateが10日後のとき10を返す", () => {
    const today = new Date("2027-01-01");
    const policy = makePolicy({ renewalDate: "2027-01-11" });
    expect(daysUntilRenewal(policy, today)).toBe(10);
  });

  it("renewalDateが過去(昨日)のとき-1を返す", () => {
    const today = new Date("2027-01-10");
    const policy = makePolicy({ renewalDate: "2027-01-09" });
    expect(daysUntilRenewal(policy, today)).toBe(-1);
  });

  it("renewalDateが当日(今日)のとき0を返す", () => {
    const today = new Date("2027-03-01");
    const policy = makePolicy({ renewalDate: "2027-03-01" });
    expect(daysUntilRenewal(policy, today)).toBe(0);
  });

  it("renewalDateがundefinedのときInfinityを返す", () => {
    const policy = makePolicy({ renewalDate: undefined });
    expect(daysUntilRenewal(policy, new Date("2027-01-01"))).toBe(Infinity);
  });
});

// ── isRenewalNear ────────────────────────────────────

describe("isRenewalNear", () => {
  it(`${RENEWAL_NEAR_DAYS}日以内のときtrueを返す`, () => {
    const today = new Date("2027-01-01");
    const policy = makePolicy({ renewalDate: "2027-02-01" }); // 31日後
    expect(isRenewalNear(policy, today)).toBe(true);
  });

  it(`${RENEWAL_NEAR_DAYS}日ちょうどのときtrueを返す(境界値)`, () => {
    const today = new Date("2027-01-01");
    // RENEWAL_NEAR_DAYS日後の日付を計算
    const daysLater = new Date(today);
    daysLater.setDate(daysLater.getDate() + RENEWAL_NEAR_DAYS);
    const renewalDate = daysLater.toISOString().slice(0, 10);
    const policy = makePolicy({ renewalDate });
    expect(isRenewalNear(policy, today)).toBe(true);
  });

  it(`${RENEWAL_NEAR_DAYS + 1}日後のときfalseを返す(境界値外)`, () => {
    const today = new Date("2027-01-01");
    const daysLater = new Date(today);
    daysLater.setDate(daysLater.getDate() + RENEWAL_NEAR_DAYS + 1);
    const renewalDate = daysLater.toISOString().slice(0, 10);
    const policy = makePolicy({ renewalDate });
    expect(isRenewalNear(policy, today)).toBe(false);
  });

  it("期限切れ(過去日)のときtrueを返す", () => {
    const today = new Date("2027-03-01");
    const policy = makePolicy({ renewalDate: "2027-01-01" }); // 過去
    expect(isRenewalNear(policy, today)).toBe(true);
  });

  it("renewalDateがundefinedのときfalseを返す", () => {
    const policy = makePolicy({ renewalDate: undefined });
    expect(isRenewalNear(policy, new Date("2027-01-01"))).toBe(false);
  });
});

// ── 統合: filterRenewalPolicies の結果で isRenewalNear を使う ────

describe("filterRenewalPolicies + isRenewalNear 統合", () => {
  it("抽出済み損保のrenewalDateを近い順に分類できる", () => {
    const today = new Date("2027-01-01");
    const policies: Policy[] = [
      makePolicy({
        productCategory: "auto",
        renewalDate: "2027-01-20",
        status: "inforce",
      }), // 19日後=near
      makePolicy({
        productCategory: "fire",
        renewalDate: "2027-04-01",
        status: "inforce",
      }), // 90日後=far
      makePolicy({
        productCategory: "liability",
        renewalDate: "2027-02-01",
        status: "inforce",
      }), // 31日後=near
    ];
    const filtered = filterRenewalPolicies(policies);
    expect(filtered).toHaveLength(3);
    const nearPolicies = filtered.filter((p) => isRenewalNear(p, today));
    expect(nearPolicies).toHaveLength(2);
    // renewalDate昇順になっている
    expect(filtered[0].renewalDate).toBe("2027-01-20");
    expect(filtered[1].renewalDate).toBe("2027-02-01");
    expect(filtered[2].renewalDate).toBe("2027-04-01");
  });
});
