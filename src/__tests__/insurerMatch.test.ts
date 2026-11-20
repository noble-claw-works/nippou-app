// B3: 保険会社マスタの名寄せ・読み込み時変換のテスト
import { describe, it, expect } from "vitest";
import { INITIAL_INSURANCE_COMPANIES as INIT } from "../data/insuranceCompanies";
import {
  findInsurerByName,
  mergeInsuranceCompanies,
  backfillOpportunityInsurerIds,
  isOutsideMaster,
  parseAliases,
} from "../utils/insurerMatch";
import type { Opportunity } from "../types";

const opp = (insurers: Array<[string, string?]>): Opportunity =>
  ({
    id: "o1",
    proposalProducts: insurers.map(([insurer, insurerId], i) => ({
      id: "p" + i,
      productCategory: "life",
      productName: "x",
      insurer,
      insurerId,
      insuredPersonId: "",
      monthlyPremium: 1,
      memo: "",
    })),
  }) as unknown as Opportunity;

describe("初期マスタ", () => {
  it("15社で生保/損保区分がある", () => {
    expect(INIT).toHaveLength(15);
    expect(INIT.every((c) => c.kind === "life" || c.kind === "non_life")).toBe(true);
    expect(INIT.filter((c) => c.kind === "non_life").length).toBeGreaterThan(0);
  });
});

describe("findInsurerByName", () => {
  it("正式名・別名の完全一致で見つかる", () => {
    expect(findInsurerByName(INIT, "日本生命保険")?.id).toBe("ic_01");
    expect(findInsurerByName(INIT, "損保ジャパン")?.id).toBe("ic_06");
    expect(findInsurerByName(INIT, " 東京海上日動 ")?.id).toBe("ic_05");
  });
  it("部分一致・空・不明は見つからない", () => {
    expect(findInsurerByName(INIT, "東京海上日動あんしん")).toBeUndefined();
    expect(findInsurerByName(INIT, "日本")).toBeUndefined();
    expect(findInsurerByName(INIT, "")).toBeUndefined();
    expect(findInsurerByName(INIT, undefined)).toBeUndefined();
  });
});

describe("backfillOpportunityInsurerIds", () => {
  it("一致分だけ insurerId を補完し、不一致は据え置き(マスタ外)", () => {
    const [o] = backfillOpportunityInsurerIds([opp([["日本生命"], ["謎保険"]])], INIT);
    expect(o.proposalProducts[0].insurerId).toBe("ic_01");
    expect(o.proposalProducts[1].insurerId).toBeUndefined();
    expect(isOutsideMaster(INIT, o.proposalProducts[0])).toBe(false);
    expect(isOutsideMaster(INIT, o.proposalProducts[1])).toBe(true);
  });
  it("既存の insurerId は上書きしない", () => {
    const [o] = backfillOpportunityInsurerIds([opp([["日本生命", "ic_02"]])], INIT);
    expect(o.proposalProducts[0].insurerId).toBe("ic_02");
  });
  it("冪等: 2 回適用しても同じ結果・変更なしなら同一参照", () => {
    const once = backfillOpportunityInsurerIds([opp([["日本生命"], ["謎保険"]])], INIT);
    const twice = backfillOpportunityInsurerIds(once, INIT);
    expect(twice).toEqual(once);
    expect(twice).toBe(once);
  });
});

describe("mergeInsuranceCompanies", () => {
  const legacy = INIT.slice(0, 7).map(({ id, name, isActive, order }) => ({ id, name, isActive, order }));
  it("旧データに kind/aliases を補完し、足りない会社を末尾追加", () => {
    const m = mergeInsuranceCompanies(legacy, INIT);
    expect(m).toHaveLength(15);
    expect(m.find((c) => c.id === "ic_05")?.kind).toBe("non_life");
    expect(m.find((c) => c.id === "ic_01")?.aliases).toContain("日本生命");
  });
  it("編集済みの kind/aliases は上書きしない", () => {
    const edited = [{ ...legacy[0], kind: "non_life" as const, aliases: ["にちせい"] }, ...legacy.slice(1)];
    const m = mergeInsuranceCompanies(edited, INIT);
    expect(m[0].kind).toBe("non_life");
    expect(m[0].aliases).toEqual(["にちせい"]);
  });
  it("冪等", () => {
    const once = mergeInsuranceCompanies(legacy, INIT);
    expect(mergeInsuranceCompanies(once, INIT)).toEqual(once);
  });
  it("ユーザーが追加した会社は保持", () => {
    const m = mergeInsuranceCompanies([...legacy, { id: "x", name: "自社追加", isActive: true, order: 99 }], INIT);
    expect(m.find((c) => c.id === "x")).toBeTruthy();
  });
});

describe("parseAliases", () => {
  it("区切り・空・重複を処理", () => {
    expect(parseAliases("a, b，c、a\n d ,,")).toEqual(["a", "b", "c", "d"]);
  });
});
