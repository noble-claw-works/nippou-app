// =====================================================
// reflectionTransaction.test.ts — Doc4 §T4-03 / §8 反映TX テスト
// 全or無(rollback) / 冪等(resultPolicyId) / mode別(new/existing_change/none)
// + reflectionPolicyFactory 純関数 / sumMonthlyPremium 確定除外 の回帰
// =====================================================
import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "../store";
import {
  buildNewPolicyFromProduct,
  mainCoverageType,
} from "../utils/reflectionPolicyFactory";
import { sumMonthlyPremium, toAnnual } from "../utils/reflectionAggregate";
import type {
  Opportunity,
  Policy,
  ProposalProduct,
  ProductCategory,
} from "../types";

const HH = "hh_test_doc4";
const USER = "u_test";

function makePP(
  id: string,
  over: Partial<ProposalProduct> = {},
): ProposalProduct {
  return {
    id,
    productCategory: "life" as ProductCategory,
    productName: "テスト終身",
    insurer: "テスト生命",
    insuredPersonId: "p1",
    monthlyPremium: 10000,
    memo: "",
    ...over,
  };
}

function makeOpp(products: ProposalProduct[]): Opportunity {
  const now = new Date().toISOString();
  return {
    id: "opp_test",
    householdId: HH,
    ownerId: USER,
    title: "テスト商談",
    targetPersonIds: ["p1"],
    stage: "application",
    status: "open",
    productCategories: ["life"],
    proposalProducts: products,
    needsAnalysisDone: false,
    illustrationProvided: false,
    stageHistory: [],
    tags: [],
    memo: "",
    createdAt: now,
    updatedAt: now,
  };
}

function makePolicy(id: string, over: Partial<Policy> = {}): Policy {
  const now = new Date().toISOString();
  return {
    id,
    householdId: HH,
    ownerId: USER,
    contractorPersonId: "p1",
    insuredPersonIds: ["p1"],
    insurer: "既存生命",
    productName: "既存医療",
    productCategory: "medical" as ProductCategory,
    status: "inforce",
    startDate: "2024-01-01",
    monthlyPremium: 5000,
    payMode: "monthly",
    hasCashValue: false,
    coverages: [],
    tags: [],
    memo: "",
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

/** テスト間でストアを決定的な初期状態へ */
function seed(opp: Opportunity, policies: Policy[]): void {
  useAppStore.setState({ opportunities: [opp], policies });
}

describe("reflectionPolicyFactory (pure)", () => {
  it("mainCoverageType は category を coverage type へ写像", () => {
    expect(mainCoverageType("life")).toBe("death");
    expect(mainCoverageType("medical")).toBe("medical_hospital");
    expect(mainCoverageType("cancer")).toBe("cancer");
    expect(mainCoverageType("savings")).toBe("savings");
    expect(mainCoverageType("auto")).toBe("other");
  });

  it("buildNewPolicyFromProduct は申込中(pending)Policyを生成し faceAmount で主契約coverageを付与", () => {
    let n = 0;
    const genId = (): string => `id${++n}`;
    const opp = makeOpp([]);
    const pp = makePP("pp1", { faceAmount: 3000000 });
    const now = "2026-10-20T00:00:00.000Z";
    const policy = buildNewPolicyFromProduct(opp, pp, USER, now, genId);
    expect(policy.status).toBe("pending");
    expect(policy.sourceOpportunityId).toBe(opp.id);
    expect(policy.monthlyPremium).toBe(10000);
    expect(policy.coverages).toHaveLength(1);
    expect(policy.coverages[0].isMain).toBe(true);
    expect(policy.coverages[0].type).toBe("death");
    expect(policy.coverages[0].faceAmount).toBe(3000000);
  });
});

describe("sumMonthlyPremium 確定/見込 回帰", () => {
  it("confirmed は pending を除外、projected は含む", () => {
    const list: Policy[] = [
      makePolicy("a", { status: "inforce", monthlyPremium: 5000 }),
      makePolicy("b", { status: "inforce", monthlyPremium: 8000 }),
      makePolicy("c", { status: "pending", monthlyPremium: 12000 }),
    ];
    expect(sumMonthlyPremium(list, "confirmed")).toBe(13000);
    expect(sumMonthlyPremium(list, "projected")).toBe(25000);
    expect(toAnnual(sumMonthlyPremium(list, "confirmed"))).toBe(156000);
  });
});

describe("reflectOpportunityToPolicies (§T4-03 TX)", () => {
  beforeEach(() => {
    useAppStore.setState({ opportunities: [], policies: [] });
  });

  it("mode=new: 既存契約に申込中Policyを追加し reflectionSource/resultPolicyId を記録", () => {
    const pp = makePP("pp1", { reflection: { mode: "new" } });
    seed(makeOpp([pp]), []);
    const created = useAppStore
      .getState()
      .reflectOpportunityToPolicies("opp_test", USER);
    expect(created).toHaveLength(1);
    const st = useAppStore.getState();
    expect(st.policies).toHaveLength(1);
    const p = st.policies[0];
    expect(p.status).toBe("pending");
    expect(p.reflectionSource?.mode).toBe("new");
    expect(p.reflectionSource?.opportunityId).toBe("opp_test");
    const reflectedPP = st.opportunities[0].proposalProducts[0];
    expect(reflectedPP.reflection?.resultPolicyId).toBe(p.id);
    expect(st.opportunities[0].stage).toBe("issued");
  });

  it("mode=existing_change: 既存Policyを変更し valueHistory に追記、status=pending(見込)", () => {
    const target = makePolicy("pol_x", { monthlyPremium: 5000 });
    const pp = makePP("pp1", {
      productName: "新医療プラン",
      insurer: "新生命",
      monthlyPremium: 9000,
      reflection: { mode: "existing_change", targetPolicyId: "pol_x" },
    });
    seed(makeOpp([pp]), [target]);
    useAppStore.getState().reflectOpportunityToPolicies("opp_test", USER);
    const p = useAppStore.getState().policies.find((x) => x.id === "pol_x")!;
    expect(p.monthlyPremium).toBe(9000);
    expect(p.status).toBe("pending");
    expect(p.reflectionSource?.mode).toBe("existing_change");
    expect(p.valueHistory && p.valueHistory.length).toBe(1);
    const fields = p.valueHistory![0].fields.map((f) => f.field);
    expect(fields).toContain("monthlyPremium");
    expect(fields).toContain("status");
  });

  it("mode=none: スキップ（契約を生成/変更しない）", () => {
    const pp = makePP("pp1", { reflection: { mode: "none" } });
    seed(makeOpp([pp]), []);
    const created = useAppStore
      .getState()
      .reflectOpportunityToPolicies("opp_test", USER);
    expect(created).toHaveLength(0);
    expect(useAppStore.getState().policies).toHaveLength(0);
  });

  it("全or無: 1件でも検証失敗(existing_change の対象未存在)なら全ロールバック", () => {
    const ppOk = makePP("pp1", { reflection: { mode: "new" } });
    const ppBad = makePP("pp2", {
      reflection: { mode: "existing_change", targetPolicyId: "missing" },
    });
    seed(makeOpp([ppOk, ppBad]), []);
    expect(() =>
      useAppStore.getState().reflectOpportunityToPolicies("opp_test", USER),
    ).toThrow(/REFLECT_TARGET_NOT_FOUND/);
    // state 不変: policy 0件、reflection に resultPolicyId なし
    const st = useAppStore.getState();
    expect(st.policies).toHaveLength(0);
    expect(
      st.opportunities[0].proposalProducts[0].reflection?.resultPolicyId,
    ).toBeUndefined();
    expect(st.opportunities[0].stage).toBe("application");
  });

  it("冪等: 反映済み(resultPolicyId 実在)を再実行しても二重生成しない", () => {
    const pp = makePP("pp1", { reflection: { mode: "new" } });
    seed(makeOpp([pp]), []);
    useAppStore.getState().reflectOpportunityToPolicies("opp_test", USER);
    expect(useAppStore.getState().policies).toHaveLength(1);
    // 再実行
    const again = useAppStore
      .getState()
      .reflectOpportunityToPolicies("opp_test", USER);
    expect(useAppStore.getState().policies).toHaveLength(1);
    expect(again).toHaveLength(1);
  });

  it("混在: new/existing_change/none を1トランザクションで処理", () => {
    const target = makePolicy("pol_y", { monthlyPremium: 4000 });
    const ppNew = makePP("ppN", {
      monthlyPremium: 7000,
      reflection: { mode: "new" },
    });
    const ppChg = makePP("ppC", {
      monthlyPremium: 6000,
      reflection: { mode: "existing_change", targetPolicyId: "pol_y" },
    });
    const ppNone = makePP("ppX", { reflection: { mode: "none" } });
    seed(makeOpp([ppNew, ppChg, ppNone]), [target]);
    const res = useAppStore
      .getState()
      .reflectOpportunityToPolicies("opp_test", USER);
    // new=1生成 + existing_change=1更新 => reflected 2件（none除く）
    expect(res).toHaveLength(2);
    const st = useAppStore.getState();
    // 既存1 + 新規1 = 2
    expect(st.policies).toHaveLength(2);
    const chg = st.policies.find((x) => x.id === "pol_y")!;
    expect(chg.monthlyPremium).toBe(6000);
    expect(chg.status).toBe("pending");
  });
});
