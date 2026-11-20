// B2追加: 新規案件作成 ②案件列のチャネル（世帯の channelId を既定値に・手動変更は上書きしない）
import { describe, it, expect, beforeEach } from "vitest";
import { createElement, useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  makeInitialDraft,
  applyHouseholdChannelDefault,
  buildOpportunityInput,
  isDraftDirty,
  type OpportunityDraft,
} from "../pages/NewOpportunityPage/newOpportunityDraft";
import { OpportunityDraftPane } from "../pages/NewOpportunityPage/OpportunityDraftPane";
import { useAppStore } from "../store";

describe("applyHouseholdChannelDefault（純関数）", () => {
  it("未変更なら世帯のチャネルを入れ、世帯が変われば追従する", () => {
    let d = makeInitialDraft("u1");
    d = applyHouseholdChannelDefault(d, "ch_a");
    expect(d.channelId).toBe("ch_a");
    d = applyHouseholdChannelDefault(d, "ch_b");
    expect(d.channelId).toBe("ch_b");
    expect(applyHouseholdChannelDefault(d, undefined).channelId).toBe("");
  });
  it("手動変更済みなら上書きしない", () => {
    const d = { ...makeInitialDraft("u1"), channelId: "mine", channelTouched: true };
    expect(applyHouseholdChannelDefault(d, "ch_a")).toBe(d);
  });
  it("同値なら同一参照（無限更新防止）", () => {
    const d = applyHouseholdChannelDefault(makeInitialDraft("u1"), "ch_a");
    expect(applyHouseholdChannelDefault(d, "ch_a")).toBe(d);
  });
  it("既定値だけでは dirty にならない / 手動変更で dirty", () => {
    const d = applyHouseholdChannelDefault(makeInitialDraft("u1"), "ch_a");
    expect(isDraftDirty(d)).toBe(false);
    expect(isDraftDirty({ ...d, channelTouched: true })).toBe(true);
  });
  it("buildOpportunityInput が channelId を渡す（空なら含めない）", () => {
    const d = { ...makeInitialDraft("u1"), title: "t", channelId: "ch_a" };
    expect(buildOpportunityInput(d, "h1").channelId).toBe("ch_a");
    expect("channelId" in buildOpportunityInput({ ...d, channelId: "" }, "h1")).toBe(false);
  });
});

function Harness({ householdId, initial }: { householdId: string; initial?: Partial<OpportunityDraft> }) {
  const [draft, setDraft] = useState<OpportunityDraft>({ ...makeInitialDraft("u1"), ...initial });
  return createElement(
    "div",
    null,
    createElement(OpportunityDraftPane, {
      householdId,
      draft,
      error: "",
      onChange: (p: Partial<OpportunityDraft>) => setDraft((prev) => ({ ...prev, ...p })),
    }),
    createElement("output", { "data-testid": "ch" }, draft.channelId),
    createElement("output", { "data-testid": "touched" }, String(draft.channelTouched)),
  );
}

describe("OpportunityDraftPane チャネル", () => {
  let leaf: string;
  let hid: string;
  beforeEach(() => {
    const st = useAppStore.getState();
    leaf = st.salesChannels.find((c) => c.isActive && c.parentId)?.id ?? "";
    hid = st.customers[0].id;
  });
  it("世帯選択で世帯の channelId が入る", () => {
    expect(leaf).not.toBe("");
    useAppStore.setState({
      customers: useAppStore.getState().customers.map((c) => (c.id === hid ? { ...c, channelId: leaf } : c)),
    });
    render(createElement(Harness, { householdId: hid }));
    expect(screen.getByTestId("ch").textContent).toBe(leaf);
    expect(screen.getByText("チャネル (任意)")).toBeTruthy();
  });
  it("手動変更済みなら世帯の既定値で上書きしない", () => {
    useAppStore.setState({
      customers: useAppStore.getState().customers.map((c) => (c.id === hid ? { ...c, channelId: leaf } : c)),
    });
    render(createElement(Harness, { householdId: hid, initial: { channelId: "manual", channelTouched: true } }));
    expect(screen.getByTestId("ch").textContent).toBe("manual");
  });
  it("ユーザーが選択すると touched になる", () => {
    render(createElement(Harness, { householdId: "" }));
    const parent = screen.getAllByRole("combobox").find((s) => (s as HTMLSelectElement).textContent?.includes("分類を選択"))!;
    const parentOpt = (parent as HTMLSelectElement).querySelectorAll("option")[1];
    fireEvent.change(parent, { target: { value: parentOpt.getAttribute("value") } });
    expect(screen.getByTestId("touched").textContent).toBe("true");
  });
});
