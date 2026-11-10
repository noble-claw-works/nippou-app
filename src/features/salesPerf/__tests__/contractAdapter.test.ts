// =====================================================
// contractAdapter.test.ts — G2 contract adapter 単体テスト
// =====================================================
import { describe, it, expect } from "vitest";
import {
  categoryToLine,
  confidenceUnifiedToRaw,
  milestoneToEstablished,
  milestoneToApplication,
  funnelFlagsFromOpp,
  opportunityToContractRaws,
  policyToContractRaw,
  buildSalesContractRaws,
} from "../lib/contractAdapter";
import type { Opportunity, Policy, User, Team } from "../../../types";
import type { AdapterContext } from "../lib/contractAdapter";

// =====================================================
// テスト用ヘルパー
// =====================================================

function makeOpp(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "opp1",
    householdId: "c1",
    ownerId: "u1",
    title: "テスト案件",
    targetPersonIds: ["p1"],
    stage: "proposal",
    status: "open",
    productCategories: ["life"],
    proposalProducts: [
      {
        id: "pp1",
        productCategory: "life",
        productName: "終身保険",
        insurer: "第一生命",
        insuredPersonId: "p1",
        monthlyPremium: 20000,
        memo: "",
      },
    ],
    needsAnalysisDone: true,
    illustrationProvided: true,
    stageHistory: [],
    tags: [],
    memo: "",
    createdAt: "2025-06-01T00:00:00Z",
    updatedAt: "2025-06-01T00:00:00Z",
    confidence: "A",
    milestones: {
      firstConsultDate: "2025-05-01",
      proposalDate: "2025-06-01",
      establishedDate: "2025-07-01",
    },
    ...overrides,
  };
}

function makePolicy(overrides: Partial<Policy> = {}): Policy {
  return {
    id: "pol1",
    householdId: "c1",
    ownerId: "u1",
    contractorPersonId: "p1",
    insuredPersonIds: ["p1"],
    insurer: "日本生命",
    productName: "定期保険",
    productCategory: "life",
    status: "inforce",
    startDate: "2025-08-01",
    monthlyPremium: 15000,
    payMode: "monthly",
    hasCashValue: false,
    coverages: [],
    tags: [],
    memo: "",
    createdAt: "2025-08-01T00:00:00Z",
    updatedAt: "2025-08-01T00:00:00Z",
    ...overrides,
  };
}

const ctx: AdapterContext = {
  fiscalYear: 2025,
  users: [
    {
      id: "u1",
      name: "霧島 遥",
      email: "a@x.com",
      role: "general",
      teamIds: ["t1"],
      status: "active",
      lastLogin: "",
      avatarInitials: "霧",
    },
  ] as User[],
  teams: [
    {
      id: "t1",
      name: "営業1課",
      description: "",
      managerIds: ["u4"],
      memberIds: ["u1"],
    },
  ] as Team[],
};

// =====================================================
// categoryToLine
// =====================================================

describe("categoryToLine", () => {
  it("life カテゴリは line=life", () => {
    expect(categoryToLine("life")).toBe("life");
    expect(categoryToLine("medical")).toBe("life");
    expect(categoryToLine("cancer")).toBe("life");
  });

  it("nonlife カテゴリは line=nonlife", () => {
    expect(categoryToLine("auto")).toBe("nonlife");
    expect(categoryToLine("fire")).toBe("nonlife");
    expect(categoryToLine("liability")).toBe("nonlife");
  });

  it("other は life 扱い", () => {
    expect(categoryToLine("other")).toBe("life");
  });
});

// =====================================================
// confidenceUnifiedToRaw
// =====================================================

describe("confidenceUnifiedToRaw", () => {
  it("fixed → '確定'", () => {
    expect(confidenceUnifiedToRaw("fixed")).toBe("確定");
  });

  it("S → 'S'", () => {
    expect(confidenceUnifiedToRaw("S")).toBe("S");
  });

  it("A → 'A'", () => {
    expect(confidenceUnifiedToRaw("A")).toBe("A");
  });

  it("undefined → 'B' (デフォルト)", () => {
    expect(confidenceUnifiedToRaw(undefined)).toBe("B");
  });
});

// =====================================================
// milestoneToEstablished
// =====================================================

describe("milestoneToEstablished", () => {
  it("establishedDate を優先して返す", () => {
    expect(
      milestoneToEstablished({
        establishedDate: "2025-07-01",
        contractDate: "2025-06-15",
      }),
    ).toBe("2025-07-01");
  });

  it("establishedDate がない場合は contractDate を返す", () => {
    expect(milestoneToEstablished({ contractDate: "2025-06-15" })).toBe(
      "2025-06-15",
    );
  });

  it("両方ない場合は undefined", () => {
    expect(milestoneToEstablished({})).toBeUndefined();
  });

  it("undefined を渡しても undefined", () => {
    expect(milestoneToEstablished(undefined)).toBeUndefined();
  });
});

// =====================================================
// milestoneToApplication
// =====================================================

describe("milestoneToApplication", () => {
  it("applicationDate があれば返す", () => {
    expect(milestoneToApplication({ applicationDate: "2025-06-20" })).toBe(
      "2025-06-20",
    );
  });

  it("ない場合は undefined", () => {
    expect(milestoneToApplication({})).toBeUndefined();
  });
});

// =====================================================
// funnelFlagsFromOpp
// =====================================================

describe("funnelFlagsFromOpp", () => {
  it("milestones が揃っていれば had_meeting/had_proposal が true", () => {
    const opp = makeOpp();
    const flags = funnelFlagsFromOpp(opp);
    expect(flags.had_meeting).toBe(true);
    expect(flags.had_proposal).toBe(true);
    expect(flags.policy_collected).toBe(false);
  });

  it("milestones がない場合は全て false", () => {
    const opp = makeOpp({ milestones: undefined });
    const flags = funnelFlagsFromOpp(opp);
    expect(flags.had_meeting).toBe(false);
    expect(flags.had_proposal).toBe(false);
  });
});

// =====================================================
// opportunityToContractRaws
// =====================================================

describe("opportunityToContractRaws", () => {
  it("lost opp は空配列を返す", () => {
    const opp = makeOpp({ status: "lost" });
    expect(opportunityToContractRaws(opp, ctx, new Set())).toEqual([]);
  });

  it("policySourceOppIds に含まれる opp は空配列を返す (二重計上防止)", () => {
    const opp = makeOpp();
    expect(opportunityToContractRaws(opp, ctx, new Set(["opp1"]))).toEqual([]);
  });

  it("open opp は proposalProducts の数だけ row を返す", () => {
    const opp = makeOpp();
    const rows = opportunityToContractRaws(opp, ctx, new Set());
    expect(rows).toHaveLength(1);
    expect(rows[0].owner_id).toBe("u1");
    expect(rows[0].line).toBe("life");
    expect(rows[0].monthly_premium).toBe(20000);
  });

  it("established_date は milestones.establishedDate から取得", () => {
    const opp = makeOpp();
    const rows = opportunityToContractRaws(opp, ctx, new Set());
    expect(rows[0].established_date).toBe("2025-07-01");
  });

  it("複数 proposalProducts があれば複数 row を返す", () => {
    const opp = makeOpp({
      proposalProducts: [
        {
          id: "pp1",
          productCategory: "life",
          productName: "終身",
          insurer: "第一生命",
          insuredPersonId: "p1",
          monthlyPremium: 10000,
          memo: "",
        },
        {
          id: "pp2",
          productCategory: "auto",
          productName: "自動車",
          insurer: "東京海上日動",
          insuredPersonId: "p1",
          monthlyPremium: 5000,
          memo: "",
        },
      ],
    });
    const rows = opportunityToContractRaws(opp, ctx, new Set());
    expect(rows).toHaveLength(2);
    expect(rows[0].line).toBe("life");
    expect(rows[1].line).toBe("nonlife");
  });
});

// =====================================================
// policyToContractRaw
// =====================================================

describe("policyToContractRaw", () => {
  it("Policy → SalesContractRaw の基本フィールドを正しく変換する", () => {
    const pol = makePolicy();
    const raw = policyToContractRaw(pol, ctx);
    expect(raw.owner_id).toBe("u1");
    expect(raw.line).toBe("life");
    expect(raw.monthly_premium).toBe(15000);
    expect(raw.established_date).toBe("2025-08-01");
    expect(raw.confidence).toBe("確定");
    expect(raw.policy_collected).toBe(true);
  });

  it("id は 'pol_' プレフィックス付き", () => {
    const pol = makePolicy();
    const raw = policyToContractRaw(pol, ctx);
    expect(raw.id).toBe("pol_pol1");
  });
});

// =====================================================
// buildSalesContractRaws — 統合
// =====================================================

describe("buildSalesContractRaws", () => {
  it("policy が sourceOpportunityId を持つ場合、対応 opp の row は除外される", () => {
    const opp = makeOpp({ id: "opp_x" });
    const pol = makePolicy({ id: "pol_x", sourceOpportunityId: "opp_x" });
    const raws = buildSalesContractRaws([opp], [pol], ctx);
    // pol の行は含まれるが opp_x 由来の行はない
    expect(raws.some((r) => r.id === "pol_pol_x")).toBe(true);
    expect(raws.some((r) => r.id.startsWith("opp_x"))).toBe(false);
  });

  it("policy なしの case では opp の行を返す", () => {
    const opp = makeOpp();
    const raws = buildSalesContractRaws([opp], [], ctx);
    expect(raws.length).toBeGreaterThan(0);
    expect(raws[0].owner_id).toBe("u1");
  });
});
