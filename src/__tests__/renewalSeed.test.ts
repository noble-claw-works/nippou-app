// =====================================================
// renewalSeed.test.ts — RENEWAL_CASES シードデータ検証
// =====================================================
import { describe, it, expect } from "vitest";
import { RENEWAL_CASES } from "../data/seed/renewals";

describe("RENEWAL_CASES シードデータ", () => {
  it("1件以上の RenewalCase が生成される", () => {
    expect(RENEWAL_CASES.length).toBeGreaterThanOrEqual(1);
  });

  it("全件: 必須フィールドが埋まっている", () => {
    for (const rc of RENEWAL_CASES) {
      expect(rc.id).toBeTruthy();
      expect(rc.policyId).toBeTruthy();
      expect(rc.householdId).toBeTruthy();
      expect(rc.ownerUserId).toBeTruthy();
      expect(rc.insurer).toBeTruthy();
      expect(rc.maturityDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(rc.productType).toBeTruthy();
      expect(rc.method).toBeTruthy();
      expect(rc.status).toMatch(/^(not_started|in_progress|completed)$/);
    }
  });

  it("全件: activityLog が1件以上（空タブ回避）", () => {
    for (const rc of RENEWAL_CASES) {
      expect(rc.activityLog.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("全件: tasks 配列が存在する（空でも可）", () => {
    for (const rc of RENEWAL_CASES) {
      expect(Array.isArray(rc.tasks)).toBe(true);
    }
  });

  it("全件: notes 配列が存在する", () => {
    for (const rc of RENEWAL_CASES) {
      expect(Array.isArray(rc.notes)).toBe(true);
    }
  });

  it("全件: tasks の scope が 'renewal'", () => {
    for (const rc of RENEWAL_CASES) {
      for (const task of rc.tasks) {
        expect(task.scope).toBe("renewal");
      }
    }
  });

  it("status 分布: not_started / in_progress / completed が混在する", () => {
    if (RENEWAL_CASES.length >= 5) {
      const statuses = new Set(RENEWAL_CASES.map((rc) => rc.status));
      // 5件以上あれば3種類すべて出るはず（デザイン: 0,1→in_progress / 2,3→completed / 4+→not_started）
      expect(statuses.has("in_progress")).toBe(true);
      expect(statuses.has("completed")).toBe(true);
      expect(statuses.has("not_started")).toBe(true);
    } else if (RENEWAL_CASES.length >= 3) {
      // 3〜4件の場合は in_progress と completed が存在する
      const statuses = new Set(RENEWAL_CASES.map((rc) => rc.status));
      expect(statuses.has("in_progress")).toBe(true);
    }
  });

  it("in_progress な案件は consult.firstContactDate が設定されている", () => {
    const inProgress = RENEWAL_CASES.filter(
      (rc) => rc.status === "in_progress",
    );
    for (const rc of inProgress) {
      expect(rc.survey.consult?.firstContactDate).toBeTruthy();
    }
  });

  it("completed な案件は consult.procedureDate が設定されている", () => {
    const completed = RENEWAL_CASES.filter((rc) => rc.status === "completed");
    for (const rc of completed) {
      expect(rc.survey.consult?.procedureDate).toBeTruthy();
    }
  });

  it("id が一意である", () => {
    const ids = RENEWAL_CASES.map((rc) => rc.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("maturityDate が有効な日付形式 (YYYY-MM-DD) である", () => {
    for (const rc of RENEWAL_CASES) {
      expect(rc.maturityDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const d = new Date(rc.maturityDate);
      expect(isNaN(d.getTime())).toBe(false);
    }
  });

  it("activityLog のエントリは全件 id / body / byUserId / at を持つ", () => {
    for (const rc of RENEWAL_CASES) {
      for (const log of rc.activityLog) {
        expect(log.id).toBeTruthy();
        expect(log.body).toBeTruthy();
        expect(log.byUserId).toBeTruthy();
        expect(log.at).toBeTruthy();
      }
    }
  });

  it("tasks の id が全体で一意である", () => {
    const taskIds = RENEWAL_CASES.flatMap((rc) => rc.tasks.map((t) => t.id));
    const uniqueIds = new Set(taskIds);
    expect(uniqueIds.size).toBe(taskIds.length);
  });
});
