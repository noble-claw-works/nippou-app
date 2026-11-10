// =====================================================
// processB.store.test.ts — 工程B ユニットテスト
// B-1: SalesChannel CRUD (salesChannels store slice)
// B-2: TaskTemplate timingType/baseDateType/offsetDays 型拡張
// =====================================================
import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "../store";
import { SALES_CHANNELS } from "../data/salesChannels";
import type { TaskTimingType, TaskBaseDateType } from "../types";

// ═══════════════════════════════════════════════════════════════════════════════
// B-1: SalesChannel CRUD
// ═══════════════════════════════════════════════════════════════════════════════
describe("B-1: SalesChannel store CRUD", () => {
  beforeEach(() => {
    // 初期データにリセット
    useAppStore.setState({ salesChannels: SALES_CHANNELS });
  });

  it("初期データが1件以上存在する", () => {
    const { salesChannels } = useAppStore.getState();
    expect(salesChannels.length).toBeGreaterThan(0);
  });

  it("addSalesChannel で親チャネル(parentId=null)を追加できる", () => {
    const { addSalesChannel, salesChannels: before } = useAppStore.getState();
    addSalesChannel({
      name: "テスト分類",
      parentId: null,
      isActive: true,
      order: 99,
      memo: "テスト用",
    });
    const { salesChannels: after } = useAppStore.getState();
    expect(after.length).toBe(before.length + 1);
    const added = after.find((c) => c.name === "テスト分類");
    expect(added).toBeDefined();
    expect(added!.parentId).toBeNull();
    expect(added!.isActive).toBe(true);
    expect(added!.id).toBeTruthy();
  });

  it("addSalesChannel で子チャネル(parentId!=null)を追加できる", () => {
    const { salesChannels, addSalesChannel } = useAppStore.getState();
    const parent = salesChannels.find((c) => c.parentId === null)!;
    expect(parent).toBeDefined();

    addSalesChannel({
      name: "テスト詳細チャネル",
      parentId: parent.id,
      isActive: true,
      order: 50,
    });
    const { salesChannels: after } = useAppStore.getState();
    const child = after.find((c) => c.name === "テスト詳細チャネル");
    expect(child).toBeDefined();
    expect(child!.parentId).toBe(parent.id);
  });

  it("updateSalesChannel で isActive を切り替えられる", () => {
    const { salesChannels, updateSalesChannel } = useAppStore.getState();
    const target = salesChannels[0];
    updateSalesChannel(target.id, { isActive: false });
    const { salesChannels: after } = useAppStore.getState();
    expect(after.find((c) => c.id === target.id)!.isActive).toBe(false);
  });

  it("updateSalesChannel で name を変更できる", () => {
    const { salesChannels, updateSalesChannel } = useAppStore.getState();
    const target = salesChannels[0];
    updateSalesChannel(target.id, { name: "変更後チャネル名" });
    const { salesChannels: after } = useAppStore.getState();
    expect(after.find((c) => c.id === target.id)!.name).toBe("変更後チャネル名");
  });

  it("removeSalesChannel で削除できる", () => {
    const { addSalesChannel } = useAppStore.getState();
    const added = addSalesChannel({
      name: "削除予定",
      parentId: null,
      isActive: true,
      order: 100,
    });
    const { removeSalesChannel, salesChannels: before } = useAppStore.getState();
    const countBefore = before.length;
    removeSalesChannel(added.id);
    const { salesChannels: after } = useAppStore.getState();
    expect(after.length).toBe(countBefore - 1);
    expect(after.find((c) => c.id === added.id)).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// B-2: TaskTemplate timingType / baseDateType / offsetDays 型拡張
// ═══════════════════════════════════════════════════════════════════════════════
describe("B-2: TaskTemplate 工程B 新フィールド", () => {
  beforeEach(() => {
    useAppStore.setState({ taskTemplates: [] });
  });

  it("timingType='on_opportunity_created' でタスクマスタを追加できる", () => {
    const { addTaskTemplate } = useAppStore.getState();
    addTaskTemplate({
      title: "商談追加即時タスク",
      scope: "opportunity",
      trigger: "opportunity_created",
      productCategories: null,
      defaultPriority: "medium",
      order: 1,
      isActive: true,
      timingType: "on_opportunity_created" as TaskTimingType,
    });
    const { taskTemplates } = useAppStore.getState();
    expect(taskTemplates.length).toBe(1);
    expect(taskTemplates[0].timingType).toBe("on_opportunity_created");
    expect(taskTemplates[0].baseDateType).toBeUndefined();
    expect(taskTemplates[0].offsetDays).toBeUndefined();
  });

  it("timingType='offset_from_base_date' + baseDateType + offsetDays でタスクマスタを追加できる", () => {
    const { addTaskTemplate } = useAppStore.getState();
    addTaskTemplate({
      title: "更新予定日7日前タスク",
      scope: "opportunity",
      trigger: "opportunity_created",
      productCategories: null,
      defaultPriority: "high",
      order: 2,
      isActive: true,
      timingType: "offset_from_base_date" as TaskTimingType,
      baseDateType: "renewal_due_date" as TaskBaseDateType,
      offsetDays: -7,
    });
    const { taskTemplates } = useAppStore.getState();
    const tmpl = taskTemplates[0];
    expect(tmpl.timingType).toBe("offset_from_base_date");
    expect(tmpl.baseDateType).toBe("renewal_due_date");
    expect(tmpl.offsetDays).toBe(-7);
  });

  it("既存フィールドが省略可能（後方互換）— timingType 未指定でも追加できる", () => {
    const { addTaskTemplate } = useAppStore.getState();
    // timingType 省略（既存データ互換）
    addTaskTemplate({
      title: "旧形式タスク",
      scope: "household",
      trigger: "household_created",
      productCategories: null,
      defaultPriority: "low",
      order: 3,
      isActive: true,
    });
    const { taskTemplates } = useAppStore.getState();
    expect(taskTemplates.length).toBe(1);
    expect(taskTemplates[0].timingType).toBeUndefined();
  });
});
