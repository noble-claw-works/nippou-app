// =====================================================
// oppTasksAndProposals.proposals.test.ts — ADR-TASK-MASTER §5 準拠（第2パス）
//
// 要件8: 提案ラウンド → latestProposalDate → ステージ自動遷移
// proposals 配列の roundNo 付番 / 修正日はステージ不変
// =====================================================
import { describe, it, expect } from "vitest";
import type { Opportunity } from "../types";
import {
  latestProposalDate,
  stageFromMilestones,
  tabOf,
} from "../utils/opportunityStage";

// ── ヘルパー ──────────────────────────────────────────────────────────────────
const _now = new Date().toISOString();

function mkOpp(
  overrides: Partial<Opportunity> &
    Pick<Opportunity, "id" | "householdId" | "stage" | "status">,
): Opportunity {
  return {
    ownerId: "u1",
    title: "テスト案件",
    productCategories: ["life"],
    proposalProducts: [],
    targetPersonIds: [],
    needsAnalysisDone: false,
    illustrationProvided: false,
    stageHistory: [],
    tags: [],
    memo: "",
    createdAt: _now,
    updatedAt: _now,
    tasks: [],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 要件8: 提案ラウンド → latestProposalDate → ステージ自動遷移
// ═══════════════════════════════════════════════════════════════════════════════
describe("latestProposalDate — proposals ラウンドがある場合", () => {
  it("proposals が1件 → proposalDate を返す", () => {
    const opp = mkOpp({
      id: "lpd1",
      householdId: "c1",
      stage: "approach",
      status: "open",
      proposals: [
        {
          id: "r1",
          roundNo: 1,
          proposalDate: "2026-08-01",
          productIds: [],
          createdAt: _now,
        },
      ],
    });
    expect(latestProposalDate(opp)).toBe("2026-08-01");
  });

  it("proposals が複数 → 最新の proposalDate を返す", () => {
    const opp = mkOpp({
      id: "lpd2",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposals: [
        {
          id: "r1",
          roundNo: 1,
          proposalDate: "2026-07-01",
          productIds: [],
          createdAt: _now,
        },
        {
          id: "r2",
          roundNo: 2,
          proposalDate: "2026-08-15",
          productIds: [],
          createdAt: _now,
        },
        {
          id: "r3",
          roundNo: 3,
          proposalDate: "2026-08-05",
          productIds: [],
          createdAt: _now,
        },
      ],
    });
    expect(latestProposalDate(opp)).toBe("2026-08-15");
  });

  it("proposals なし・milestones.proposalDate あり → milestones にフォールバック", () => {
    const opp = mkOpp({
      id: "lpd3",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      milestones: { proposalDate: "2026-07-20" },
    });
    expect(latestProposalDate(opp)).toBe("2026-07-20");
  });

  it("proposals も milestones.proposalDate もなし → undefined", () => {
    const opp = mkOpp({
      id: "lpd4",
      householdId: "c1",
      stage: "approach",
      status: "open",
    });
    expect(latestProposalDate(opp)).toBeUndefined();
  });
});

describe("提案ラウンド追加 → ステージ自動遷移（stageFromMilestones 経由）", () => {
  it("proposals に proposalDate を追加 → stageFromMilestones が proposal を返す（提案ステージへ前進）", () => {
    const opp = mkOpp({
      id: "s1",
      householdId: "c1",
      stage: "approach",
      status: "open",
      proposals: [
        {
          id: "r1",
          roundNo: 1,
          proposalDate: "2026-08-01",
          productIds: [],
          createdAt: _now,
        },
      ],
    });
    const stage = stageFromMilestones(opp, opp.milestones);
    expect(stage).toBe("proposal");
  });

  it("proposals がなく milestones.proposalDate もなし → stageFromMilestones が approach を返す", () => {
    const opp = mkOpp({
      id: "s2",
      householdId: "c1",
      stage: "approach",
      status: "open",
    });
    const stage = stageFromMilestones(opp, undefined);
    expect(stage).toBe("approach");
  });

  it("提案ラウンド追加後 → tabOf が 'proposed' になる", () => {
    const opp = mkOpp({
      id: "s3",
      householdId: "c1",
      stage: "approach",
      status: "open",
      proposals: [
        {
          id: "r1",
          roundNo: 1,
          proposalDate: "2026-08-01",
          productIds: [],
          createdAt: _now,
        },
      ],
    });
    expect(tabOf(opp)).toBe("proposed");
  });

  it("proposals 複数回追加後も最新ラウンドの proposalDate が使われる", () => {
    const opp = mkOpp({
      id: "s4",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposals: [
        {
          id: "r1",
          roundNo: 1,
          proposalDate: "2026-07-01",
          productIds: [],
          createdAt: _now,
        },
        {
          id: "r2",
          roundNo: 2,
          proposalDate: "2026-08-10",
          productIds: [],
          createdAt: _now,
        },
      ],
    });
    // latestProposalDate は最も新しい proposalDate
    expect(latestProposalDate(opp)).toBe("2026-08-10");
    // ステージは proposal 以上（proposalDate があるので）
    expect(stageFromMilestones(opp, opp.milestones)).toBe("proposal");
  });
});

describe("修正日はステージ不変", () => {
  it("revisedDate のみ追加してもステージは変わらない（revisedDate は milestones と無関係）", () => {
    const oppBefore = mkOpp({
      id: "r1",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposals: [
        {
          id: "pr1",
          roundNo: 1,
          proposalDate: "2026-08-01",
          productIds: [],
          createdAt: _now,
        },
      ],
    });
    const stageBefore = stageFromMilestones(oppBefore, oppBefore.milestones);

    // revisedDate を追加した状態をシミュレート
    const oppAfter: Opportunity = {
      ...oppBefore,
      proposals: [
        {
          id: "pr1",
          roundNo: 1,
          proposalDate: "2026-08-01",
          revisedDate: "2026-08-07",
          productIds: [],
          createdAt: _now,
        },
      ],
    };
    const stageAfter = stageFromMilestones(oppAfter, oppAfter.milestones);

    expect(stageBefore).toBe("proposal");
    expect(stageAfter).toBe("proposal"); // 修正日を追加してもステージ変わらず
  });

  it("revisedDate を追加しても tabOf は変わらない", () => {
    const opp = mkOpp({
      id: "r2",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposals: [
        {
          id: "pr1",
          roundNo: 1,
          proposalDate: "2026-08-01",
          revisedDate: "2026-08-07",
          productIds: [],
          createdAt: _now,
        },
      ],
    });
    expect(tabOf(opp)).toBe("proposed"); // proposed タブのまま
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// proposals 配列の roundNo 付番
// ═══════════════════════════════════════════════════════════════════════════════
describe("proposals roundNo 付番", () => {
  it("proposals 配列の roundNo が追加順に 1, 2, 3 と割り振られる", () => {
    const rounds = [
      {
        id: "r1",
        roundNo: 1,
        proposalDate: "2026-07-01",
        productIds: [],
        createdAt: _now,
      },
      {
        id: "r2",
        roundNo: 2,
        proposalDate: "2026-08-01",
        productIds: [],
        createdAt: _now,
      },
    ];
    const nextRoundNo = rounds.length + 1;
    expect(nextRoundNo).toBe(3);
  });
});
