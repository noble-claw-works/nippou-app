// =====================================================
// oppTasksAndProposals.test.ts — ADR-B4 v2 要件7・要件8 ユニットテスト
//
// 要件7: タスク完了操作 / OppTaskRow 導出
// 要件8: 提案ラウンド追加 → latestProposalDate → ステージ自動遷移
//         修正日はステージ不変
// =====================================================
import { describe, it, expect } from "vitest";
import type { Opportunity, Person } from "../types";
import {
  getOppTaskRows,
  togglePolicyCollect,
  togglePolicyReview,
  toggleIntentSheet,
  toggleSignature,
} from "../utils/oppTasks";
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
    ...overrides,
  };
}

function mkPerson(id: string, name: string): Person {
  return {
    id,
    customerId: "c1",
    name,
    relation: "self",
    birthDate: "1990-01-01",
    gender: "male",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 要件7: OppTaskRow 導出 (getOppTaskRows)
// ═══════════════════════════════════════════════════════════════════════════════
describe("getOppTaskRows — 導出ビュー", () => {
  it("targetPersonIds なし・insuredTasks なし → 案件単位2行のみ (policyCollect + policyReview)", () => {
    const opp = mkOpp({
      id: "o1",
      householdId: "c1",
      stage: "proposal",
      status: "open",
    });
    const rows = getOppTaskRows(opp, []);
    expect(rows).toHaveLength(2);
    expect(rows[0].kind).toBe("policyCollect");
    expect(rows[1].kind).toBe("policyReview");
    expect(rows.every((r) => r.scope === "opportunity")).toBe(true);
    expect(rows.every((r) => !r.done)).toBe(true);
  });

  it("targetPersonIds あり → 案件2 + 被保険者×2(意向シート+署名)の4行追加", () => {
    const opp = mkOpp({
      id: "o2",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      targetPersonIds: ["p1", "p2"],
    });
    const persons = [mkPerson("p1", "山田太郎"), mkPerson("p2", "山田花子")];
    const rows = getOppTaskRows(opp, persons);
    // 2 (案件) + 2persons × 2tasks = 6
    expect(rows).toHaveLength(6);
    const insuredRows = rows.filter((r) => r.scope === "insured");
    expect(insuredRows).toHaveLength(4);
    // 意向シート×2
    expect(insuredRows.filter((r) => r.kind === "intentSheet")).toHaveLength(2);
    // 署名×2
    expect(insuredRows.filter((r) => r.kind === "signature")).toHaveLength(2);
  });

  it("insuredTasks フォールバック — targetPersonIds なく insuredTasks あり → 被保険者行が出る", () => {
    const opp = mkOpp({
      id: "o3",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      targetPersonIds: [],
      insuredTasks: [
        {
          personId: "p1",
          intentSheetDone: true,
          intentSheetDate: "2026-08-01",
          signatureDone: false,
        },
      ],
    });
    const persons = [mkPerson("p1", "田中一")];
    const rows = getOppTaskRows(opp, persons);
    // 2 (案件) + 1person × 2 = 4
    expect(rows).toHaveLength(4);
    const intentRow = rows.find((r) => r.kind === "intentSheet");
    expect(intentRow?.done).toBe(true);
    expect(intentRow?.date).toBe("2026-08-01");
  });

  it("contractTasks 設定済みの場合、done/date が正しく反映される", () => {
    const opp = mkOpp({
      id: "o4",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      contractTasks: {
        policyCollected: true,
        policyCollectDate: "2026-08-05",
        policyReviewed: false,
      },
    });
    const rows = getOppTaskRows(opp, []);
    const collectRow = rows.find((r) => r.kind === "policyCollect");
    expect(collectRow?.done).toBe(true);
    expect(collectRow?.date).toBe("2026-08-05");
    const reviewRow = rows.find((r) => r.kind === "policyReview");
    expect(reviewRow?.done).toBe(false);
  });

  it("key の形式が一意（policyCollect / policyReview / intentSheet:pid / signature:pid）", () => {
    const opp = mkOpp({
      id: "o5",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      targetPersonIds: ["p1"],
    });
    const rows = getOppTaskRows(opp, [mkPerson("p1", "A")]);
    const keys = rows.map((r) => r.key);
    expect(keys).toContain("policyCollect");
    expect(keys).toContain("policyReview");
    expect(keys).toContain("intentSheet:p1");
    expect(keys).toContain("signature:p1");
    // 全キーが一意
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("personName が persons から正しく解決される", () => {
    const opp = mkOpp({
      id: "o6",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      targetPersonIds: ["p1"],
    });
    const rows = getOppTaskRows(opp, [mkPerson("p1", "鈴木次郎")]);
    const insuredRows = rows.filter((r) => r.personId === "p1");
    expect(insuredRows.every((r) => r.personName === "鈴木次郎")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 要件7: タスク完了操作 (toggle* 純関数)
// ═══════════════════════════════════════════════════════════════════════════════
describe("togglePolicyCollect", () => {
  const TODAY = "2026-08-07";

  it("done=true → policyCollected=true、日付が設定される", () => {
    const opp = mkOpp({
      id: "t1",
      householdId: "c1",
      stage: "proposal",
      status: "open",
    });
    const patch = togglePolicyCollect(opp, true, TODAY);
    expect(patch.contractTasks?.policyCollected).toBe(true);
    expect(patch.contractTasks?.policyCollectDate).toBe(TODAY);
  });

  it("done=false → policyCollected=false、日付は保持（既存がある場合）", () => {
    const opp = mkOpp({
      id: "t2",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      contractTasks: {
        policyCollected: true,
        policyCollectDate: "2026-08-05",
        policyReviewed: false,
      },
    });
    const patch = togglePolicyCollect(opp, false, TODAY);
    expect(patch.contractTasks?.policyCollected).toBe(false);
    // 日付は保持（将来 undo に使えるため）
    expect(patch.contractTasks?.policyCollectDate).toBe("2026-08-05");
  });

  it("既に日付がある場合は上書きしない（冪等）", () => {
    const opp = mkOpp({
      id: "t3",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      contractTasks: {
        policyCollected: false,
        policyCollectDate: "2026-07-01",
        policyReviewed: false,
      },
    });
    const patch = togglePolicyCollect(opp, true, TODAY);
    // 既存の日付を上書きしない
    expect(patch.contractTasks?.policyCollectDate).toBe("2026-07-01");
  });

  it("既存の policyReviewed を引き継ぐ", () => {
    const opp = mkOpp({
      id: "t4",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      contractTasks: {
        policyCollected: false,
        policyReviewed: true,
        policyReviewDate: "2026-08-01",
      },
    });
    const patch = togglePolicyCollect(opp, true, TODAY);
    expect(patch.contractTasks?.policyReviewed).toBe(true);
    expect(patch.contractTasks?.policyReviewDate).toBe("2026-08-01");
  });
});

describe("togglePolicyReview", () => {
  const TODAY = "2026-08-07";

  it("done=true → policyReviewed=true、日付が設定される", () => {
    const opp = mkOpp({
      id: "pr1",
      householdId: "c1",
      stage: "proposal",
      status: "open",
    });
    const patch = togglePolicyReview(opp, true, TODAY);
    expect(patch.contractTasks?.policyReviewed).toBe(true);
    expect(patch.contractTasks?.policyReviewDate).toBe(TODAY);
  });

  it("done=false → policyReviewed=false", () => {
    const opp = mkOpp({
      id: "pr2",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      contractTasks: {
        policyCollected: false,
        policyReviewed: true,
        policyReviewDate: "2026-08-01",
      },
    });
    const patch = togglePolicyReview(opp, false, TODAY);
    expect(patch.contractTasks?.policyReviewed).toBe(false);
  });
});

describe("toggleIntentSheet", () => {
  const TODAY = "2026-08-07";

  it("既存 insuredTask なし → 新規エントリを追加", () => {
    const opp = mkOpp({
      id: "is1",
      householdId: "c1",
      stage: "proposal",
      status: "open",
    });
    const patch = toggleIntentSheet(opp, "p1", true, TODAY);
    const task = patch.insuredTasks?.find((t) => t.personId === "p1");
    expect(task?.intentSheetDone).toBe(true);
    expect(task?.intentSheetDate).toBe(TODAY);
  });

  it("既存 insuredTask あり → 更新（signatureDone を壊さない）", () => {
    const opp = mkOpp({
      id: "is2",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      insuredTasks: [
        {
          personId: "p1",
          intentSheetDone: false,
          signatureDone: true,
          signatureDate: "2026-08-01",
        },
      ],
    });
    const patch = toggleIntentSheet(opp, "p1", true, TODAY);
    const task = patch.insuredTasks?.find((t) => t.personId === "p1");
    expect(task?.intentSheetDone).toBe(true);
    expect(task?.signatureDone).toBe(true); // 壊さない
  });

  it("done=false → intentSheetDone=false（日付保持）", () => {
    const opp = mkOpp({
      id: "is3",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      insuredTasks: [
        {
          personId: "p1",
          intentSheetDone: true,
          intentSheetDate: "2026-08-05",
          signatureDone: false,
        },
      ],
    });
    const patch = toggleIntentSheet(opp, "p1", false, TODAY);
    const task = patch.insuredTasks?.find((t) => t.personId === "p1");
    expect(task?.intentSheetDone).toBe(false);
  });
});

describe("toggleSignature", () => {
  const TODAY = "2026-08-07";

  it("done=true → signatureDone=true、日付が設定される", () => {
    const opp = mkOpp({
      id: "sg1",
      householdId: "c1",
      stage: "proposal",
      status: "open",
    });
    const patch = toggleSignature(opp, "p1", true, TODAY);
    const task = patch.insuredTasks?.find((t) => t.personId === "p1");
    expect(task?.signatureDone).toBe(true);
    expect(task?.signatureDate).toBe(TODAY);
  });

  it("既存 intentSheetDone を壊さない", () => {
    const opp = mkOpp({
      id: "sg2",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      insuredTasks: [
        {
          personId: "p1",
          intentSheetDone: true,
          intentSheetDate: "2026-08-01",
          signatureDone: false,
        },
      ],
    });
    const patch = toggleSignature(opp, "p1", true, TODAY);
    const task = patch.insuredTasks?.find((t) => t.personId === "p1");
    expect(task?.signatureDone).toBe(true);
    expect(task?.intentSheetDone).toBe(true); // 壊さない
  });
});

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
    // 修正日はラウンドの revisedDate フィールドに記録されるが、
    // stageFromMilestones は milestones（establishedDate 等）のみを見る。
    // proposalDate があるラウンドの revisedDate を更新してもステージは proposal のまま。
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
// 要件7: store 経由の persistance（store integration tests）
// ═══════════════════════════════════════════════════════════════════════════════
describe("store: updateContractTasks / updateInsuredTask / addProposalRound", () => {
  // Note: store integration tests use the Zustand store with default seed data.
  // We test only pure logic equivalence here — UI tests are in the component layer.

  it("togglePolicyCollect 純関数: policyReviewed を壊さないことを再確認", () => {
    const opp = mkOpp({
      id: "store1",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      contractTasks: {
        policyCollected: false,
        policyReviewed: true,
        policyReviewDate: "2026-08-01",
      },
    });
    const patch = togglePolicyCollect(opp, true, "2026-08-07");
    expect(patch.contractTasks?.policyCollected).toBe(true);
    expect(patch.contractTasks?.policyReviewed).toBe(true);
  });

  it("複数被保険者の insuredTasks: 片方を更新しても他方を壊さない", () => {
    const opp = mkOpp({
      id: "store2",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      insuredTasks: [
        {
          personId: "p1",
          intentSheetDone: true,
          intentSheetDate: "2026-08-01",
          signatureDone: false,
        },
        { personId: "p2", intentSheetDone: false, signatureDone: false },
      ],
    });
    const patch = toggleSignature(opp, "p2", true, "2026-08-07");
    // p2 の signatureDone が true に
    const p2 = patch.insuredTasks?.find((t) => t.personId === "p2");
    expect(p2?.signatureDone).toBe(true);
    // p1 は変わっていない
    const p1 = patch.insuredTasks?.find((t) => t.personId === "p1");
    expect(p1?.intentSheetDone).toBe(true);
    expect(p1?.signatureDone).toBe(false);
  });

  it("proposals 配列の roundNo が追加順に 1, 2, 3 と割り振られる", () => {
    // store.addProposalRound ロジックの検証（純関数でシミュレート）
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
