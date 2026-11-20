// B1: ステージ7段化 — 日付自動記録 / 戻し / 移行(冪等) / ファネル=タブ一致
import { describe, it, expect, beforeEach } from "vitest";
import { createElement } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { applyStageMilestones, datesToClearOnMove, isBackwardMove } from "../utils/stageMilestones";
import {
  migrateOpportunitiesStage,
  migrateTaskTemplatesStage,
} from "../utils/migrations/opportunityStage";
import { calcFunnel } from "../utils/salesMetrics";
import { tabOf } from "../utils/opportunityStage";
import { StageDatesPanel } from "../components/opportunity/StageDatesPanel";
import { useAppStore } from "../store";
import { TASK_TEMPLATES } from "../data/seed";
import type { Opportunity, TaskTemplate } from "../types";

const mk = (o: Record<string, unknown>): Opportunity =>
  ({
    id: "o1",
    householdId: "h1",
    ownerId: "u1",
    title: "t",
    stage: "first_consult",
    status: "open",
    productCategories: [],
    proposalProducts: [],
    targetPersonIds: [],
    needsAnalysisDone: false,
    illustrationProvided: false,
    stageHistory: [],
    tags: [],
    memo: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...o,
  }) as unknown as Opportunity;

describe("applyStageMilestones（進入日の自動記録）", () => {
  it("空欄の進入日は今日を入れる", () => {
    const m = applyStageMilestones(undefined, "first_consult", "lifeplan", "2026-11-20");
    expect(m.lifePlanDate).toBe("2026-11-20");
  });
  it("既にある進入日は上書きしない", () => {
    const m = applyStageMilestones({ lifePlanDate: "2026-10-01" }, "first_consult", "lifeplan", "2026-11-20");
    expect(m.lifePlanDate).toBe("2026-10-01");
  });
  it("段を飛ばしても変更先だけ記録（途中の段は空のまま）", () => {
    const m = applyStageMilestones({ firstConsultDate: "2026-10-01" }, "first_consult", "contract_pending", "2026-11-20");
    expect(m.applicationDate).toBe("2026-11-20");
    expect(m.lifePlanDate).toBeUndefined();
  });
  it("戻すと変更先より後ろの段の日付が消える（変更先の日付は残る）", () => {
    const start = {
      firstConsultDate: "2026-09-01",
      lifePlanDate: "2026-09-10",
      proposalDate: "2026-09-20",
      applicationDate: "2026-10-01",
    };
    const m = applyStageMilestones(start, "contract_pending", "lifeplan", "2026-11-20");
    expect(m.lifePlanDate).toBe("2026-09-10");
    expect(m.proposalDate).toBeUndefined();
    expect(m.applicationDate).toBeUndefined();
    expect(m.firstConsultDate).toBe("2026-09-01");
    expect(datesToClearOnMove(start, "contract_pending", "lifeplan")).toEqual(["proposalDate", "applicationDate"]);
    expect(isBackwardMove("contract_pending", "lifeplan")).toBe(true);
    expect(isBackwardMove("lifeplan", "proposed")).toBe(false);
  });
  it("失注から戻すと失注日が消える", () => {
    const m = applyStageMilestones({ firstConsultDate: "2026-09-01", lostDate: "2026-10-01" }, "lost", "first_consult", "2026-11-20");
    expect(m.lostDate).toBeUndefined();
  });
  it("clearLaterDates:false なら消さない", () => {
    const m = applyStageMilestones({ proposalDate: "2026-09-20" }, "proposed", "lifeplan", "2026-11-20", { clearLaterDates: false });
    expect(m.proposalDate).toBe("2026-09-20");
  });
});

describe("store.changeOpportunityStage", () => {
  beforeEach(() => {
    useAppStore.setState({ opportunities: [mk({ id: "s1", milestones: { firstConsultDate: "2026-09-01" } })] });
  });
  it("進めると日付が入り、戻すと後ろが消える", () => {
    const { changeOpportunityStage } = useAppStore.getState();
    changeOpportunityStage("s1", "proposed");
    let o = useAppStore.getState().opportunities.find((x) => x.id === "s1")!;
    expect(o.stage).toBe("proposed");
    expect(o.milestones?.proposalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    changeOpportunityStage("s1", "first_consult");
    o = useAppStore.getState().opportunities.find((x) => x.id === "s1")!;
    expect(o.milestones?.proposalDate).toBeUndefined();
    expect(o.milestones?.firstConsultDate).toBe("2026-09-01");
  });
});

describe("旧9段 → 7段 移行（冪等）", () => {
  it("案件・履歴・提案商品の stage を変換し、2回適用しても同じ", () => {
    const legacy = [
      mk({
        stage: "negotiation",
        stageHistory: [{ stage: "approach", changedAt: "x" }, { stage: "underwriting", changedAt: "y" }],
        proposalProducts: [{ id: "p", stage: "application", insurer: "a" }],
      }),
      mk({ id: "o2", stage: "issued" }),
    ];
    const once = migrateOpportunitiesStage(legacy);
    expect(once[0].stage).toBe("proposed");
    expect(once[0].stageHistory.map((h) => h.stage)).toEqual(["first_consult", "contract"]);
    expect(once[0].proposalProducts[0].stage).toBe("contract_pending");
    expect(once[1]).toBe(legacy[1]);
    const twice = migrateOpportunitiesStage(once);
    expect(twice).toBe(once);
    expect(twice).toEqual(once);
  });
  it("タスクテンプレの発火段を変換(重複は整理しない)", () => {
    const tpls = [
      { id: "a", triggerStage: "needs_analysis" },
      { id: "b", triggerStage: "needs_analysis" },
      { id: "c", triggerStage: "proposed" },
    ] as unknown as TaskTemplate[];
    const once = migrateTaskTemplatesStage(tpls);
    expect(once.map((t) => t.triggerStage)).toEqual(["lifeplan", "lifeplan", "proposed"]);
    expect(once).toHaveLength(3);
    expect(migrateTaskTemplatesStage(once)).toBe(once);
  });
  it("seed のテンプレは移行後に7段のみ", () => {
    const ok = new Set(["first_consult", "lifeplan", "proposed", "contract_pending", "contract", "issued", "lost"]);
    for (const t of migrateTaskTemplatesStage(TASK_TEMPLATES)) {
      if (t.triggerStage) expect(ok.has(t.triggerStage)).toBe(true);
    }
  });
});

describe("ファネル = タブ", () => {
  it("calcFunnel の件数は tabOf の件数と一致する", () => {
    const opps = [
      mk({ id: "a", stage: "first_consult" }),
      mk({ id: "b", stage: "proposed", milestones: { firstConsultDate: "2026-09-01", proposalDate: "2026-09-02" } }),
      mk({ id: "c", stage: "lifeplan", milestones: { lifePlanDate: "2026-09-02" } }),
      mk({ id: "d", stage: "lost", milestones: { lostDate: "2026-09-02" } }),
    ];
    const f = calcFunnel(opps, ["u1"]);
    const byTab: Record<string, number> = {};
    for (const o of opps) byTab[tabOf(o)] = (byTab[tabOf(o)] ?? 0) + 1;
    for (const k of Object.keys(f)) expect(f[k as keyof typeof f]).toBe(byTab[k] ?? 0);
  });
});

describe("StageDatesPanel", () => {
  it("各段の日付欄が出て、失注日は失注時のみ表示される", () => {
    const { unmount } = render(createElement(StageDatesPanel, { opp: mk({}), onChange: () => {} }));
    expect(screen.getByText("初回相談日")).toBeTruthy();
    expect(screen.getByText("契約予定日")).toBeTruthy();
    expect(screen.queryByText("失注日")).toBeNull();
    unmount();
    render(createElement(StageDatesPanel, { opp: mk({ stage: "lost", milestones: { lostDate: "2026-10-01" } }), onChange: () => {} }));
    expect(screen.getByText("失注日")).toBeTruthy();
    void fireEvent;
  });
});
