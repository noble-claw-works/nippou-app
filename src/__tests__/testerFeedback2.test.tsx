// #305 テスター第2回報告 D1〜D8 / E1〜E3 + マスタ追加
import { describe, it, expect, beforeEach } from "vitest";
import { createElement } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { INITIAL_INSURANCE_COMPANIES } from "../data/insuranceCompanies";
import { SALES_CHANNELS } from "../data/salesChannels";
import { mergeInsuranceCompanies, insurerKindForCategory } from "../utils/insurerMatch";
import { mergeSalesChannels } from "../utils/salesChannelMerge";
import { backfillProposalContractors } from "../utils/migrations/proposalContractor";
import {
  emptyProposalProduct,
  validateProposalProduct,
  premiumLabel,
  totalFirstYearCommission,
  focusFirstProductError,
} from "../components/opportunity/proposalProductMeta";
import {
  makeInitialDraft,
  pruneDraftToHousehold,
  buildOpportunityInput,
} from "../pages/NewOpportunityPage/newOpportunityDraft";
import {
  pickAdded,
  mergeById,
  saveAddedHouseholds,
  loadAddedHouseholds,
} from "../store/addedHouseholds";
import { ChannelSelect } from "../pages/HouseholdBatchEntryPage/ChannelSelect";
import { StageDatesPanel } from "../components/opportunity/StageDatesPanel";
import { AdminPage } from "../pages/AdminPage";
import { InsurerSelect } from "../components/common/InsurerSelect";
import { buildNewPolicyFromProduct } from "../utils/reflectionPolicyFactory";
import { useAppStore } from "../store";
import type { Opportunity, ProposalProduct } from "../types";

const baseProduct = (o: Partial<ProposalProduct> = {}): ProposalProduct => ({
  ...emptyProposalProduct(),
  productName: "商品",
  insurer: "日本生命保険",
  contractorPersonId: "p1",
  monthlyPremium: 1000,
  ...o,
});

describe("マスタ追加（冪等）", () => {
  it("保険会社3社が初期マスタにあり、既存ブラウザの保存分にも補われる（2回やっても増えない）", () => {
    const names = INITIAL_INSURANCE_COMPANIES.map((c) => c.name);
    expect(names.some((n) => n.includes("あんしん生命"))).toBe(true);
    expect(names.some((n) => n.includes("ネオファースト"))).toBe(true);
    expect(names.some((n) => n.includes("メットライフ"))).toBe(true);
    const old = INITIAL_INSURANCE_COMPANIES.filter((c) => !["ic_13", "ic_14", "ic_15"].includes(c.id));
    const m1 = mergeInsuranceCompanies(old, INITIAL_INSURANCE_COMPANIES);
    expect(m1.length).toBe(old.length + 3);
    expect(mergeInsuranceCompanies(m1, INITIAL_INSURANCE_COMPANIES).length).toBe(m1.length);
  });
  it("チャネル 住宅/イエタテ が補われ、冪等で、既存編集は上書きしない", () => {
    const old = SALES_CHANNELS.filter((c) => !c.id.startsWith("ch_housing"));
    old[0] = { ...old[0], name: "編集済み" };
    const m1 = mergeSalesChannels(old, SALES_CHANNELS);
    expect(m1.find((c) => c.name === "イエタテ")?.parentId).toBe("ch_housing");
    expect(m1.find((c) => c.id === "ch_housing")).toBeTruthy();
    expect(m1[0].name).toBe("編集済み");
    expect(mergeSalesChannels(m1, SALES_CHANNELS)).toBe(m1);
  });
  it("手で同名を追加済みなら重複させない", () => {
    const old = [
      ...SALES_CHANNELS.filter((c) => !c.id.startsWith("ch_housing")),
      { id: "x1", name: "住宅（工務店・住宅会社）", parentId: null, isActive: true, order: 9 },
    ];
    const m = mergeSalesChannels(old, SALES_CHANNELS);
    expect(m.filter((c) => c.name === "住宅（工務店・住宅会社）").length).toBe(1);
  });
});

describe("D1 世帯の永続化と内部ID露出", () => {
  it("seed に無い世帯・構成員だけ保存し、読み込みで merge される", () => {
    const seedC = [{ id: "c1" }] as never[];
    const seedP = [{ id: "p1" }] as never[];
    const a = pickAdded([{ id: "c1" }, { id: "c9" }] as never[], [{ id: "p1" }, { id: "p9" }] as never[], seedC, seedP);
    expect(a.customers.map((c) => c.id)).toEqual(["c9"]);
    saveAddedHouseholds(a);
    const l = loadAddedHouseholds();
    expect(l.persons.map((p) => p.id)).toEqual(["p9"]);
    expect(mergeById(seedC as { id: string }[], l.customers as { id: string }[]).length).toBe(2);
    expect(mergeById(seedC as { id: string }[], l.customers as { id: string }[]).length).toBe(2);
  });
});

describe("D4 契約者必須と補完", () => {
  it("契約者が無いと検証エラー、あれば通る", () => {
    expect(validateProposalProduct(baseProduct({ contractorPersonId: undefined })).contractorPersonId).toBeTruthy();
    expect(validateProposalProduct(baseProduct()).contractorPersonId).toBeUndefined();
  });
  it("欠落を 案件契約者→世帯主 で補完し、冪等", () => {
    const opps = [
      { id: "o1", householdId: "h1", proposalProducts: [baseProduct({ contractorPersonId: undefined }), baseProduct()] },
      { id: "o2", householdId: "h1", contractorPersonId: "pc", proposalProducts: [baseProduct({ contractorPersonId: undefined })] },
      { id: "o3", householdId: "none", proposalProducts: [baseProduct({ contractorPersonId: undefined })] },
    ] as unknown as Opportunity[];
    const r = backfillProposalContractors(opps, [{ id: "h1", headPersonId: "head" }], []);
    expect(r[0].proposalProducts[0].contractorPersonId).toBe("head");
    expect(r[0].proposalProducts[1].contractorPersonId).toBe("p1");
    expect(r[1].proposalProducts[0].contractorPersonId).toBe("pc");
    expect(r[2].proposalProducts[0].contractorPersonId).toBeUndefined();
    expect(backfillProposalContractors(r, [{ id: "h1", headPersonId: "head" }], [])).toBe(r);
  });
});

describe("E2 払込方法", () => {
  it("月払のみ月払額必須。年払・一時払はそれぞれの金額が必須", () => {
    expect(validateProposalProduct(baseProduct({ monthlyPremium: 0 })).monthlyPremium).toBeTruthy();
    const annual = baseProduct({ paymentMode: "annual", monthlyPremium: 0 });
    expect(validateProposalProduct(annual).monthlyPremium).toBeUndefined();
    expect(validateProposalProduct(annual).annualPremium).toBeTruthy();
    expect(validateProposalProduct({ ...annual, annualPremium: 12000 })).toEqual({});
    const lump = baseProduct({ paymentMode: "lump", monthlyPremium: 0 });
    expect(validateProposalProduct(lump).lumpSumPremium).toBeTruthy();
    expect(validateProposalProduct({ ...lump, lumpSumPremium: 500000 })).toEqual({});
  });
  it("表示ラベルと年額の保険契約への反映", () => {
    expect(premiumLabel(baseProduct())).toBe("月払 ¥1,000");
    expect(premiumLabel(baseProduct({ paymentMode: "annual", annualPremium: 12000, monthlyPremium: 0 }))).toBe("年払 ¥12,000");
    expect(premiumLabel(baseProduct({ paymentMode: "lump", lumpSumPremium: 300000, monthlyPremium: 0 }))).toBe("一時払 ¥300,000");
    const opp = { id: "o", householdId: "h", targetPersonIds: ["i"] } as unknown as Opportunity;
    const pol = buildNewPolicyFromProduct(
      opp,
      baseProduct({ paymentMode: "annual", annualPremium: 12000, monthlyPremium: 0, contractorPersonId: "c1" }),
      "u",
      "2026-11-20T00:00:00Z",
      () => "pol1",
    );
    expect(pol.annualPremium).toBe(12000);
    expect(pol.monthlyPremium).toBe(0);
    expect(pol.contractorPersonId).toBe("c1");
  });
});

describe("E1 保険会社の絞り込み", () => {
  it("カテゴリ→区分", () => {
    expect(insurerKindForCategory("auto")).toBe("non_life");
    expect(insurerKindForCategory("fire")).toBe("non_life");
    expect(insurerKindForCategory("life")).toBe("life");
    expect(insurerKindForCategory("cancer")).toBe("life");
    expect(insurerKindForCategory("other")).toBeUndefined();
  });
  it("kindFilter で損保だけ表示（選択済みは残る）", () => {
    render(createElement(InsurerSelect, { insurer: "", onChange: () => {}, kindFilter: "non_life" }));
    const opts = Array.from(screen.getByRole("combobox").querySelectorAll("option")).map((o) => o.textContent);
    expect(opts.some((t) => t?.includes("東京海上日動火災"))).toBe(true);
    expect(opts.some((t) => t?.includes("日本生命"))).toBe(false);
  });
});

describe("D2 チャネル分類のみ", () => {
  it("分類を選んでも詳細を自動選択せず、分類のみが値になる", () => {
    const values: string[] = [];
    useAppStore.setState({ salesChannels: SALES_CHANNELS });
    render(createElement(ChannelSelect, { channelId: "", onChange: (v: string) => values.push(v) }));
    const [parentSel] = screen.getAllByRole("combobox");
    fireEvent.change(parentSel, { target: { value: "ch_housing" } });
    expect(values).toEqual(["ch_housing"]);
  });
  it("分類のみ保存済みのとき分類が選択表示される", () => {
    useAppStore.setState({ salesChannels: SALES_CHANNELS });
    render(createElement(ChannelSelect, { channelId: "ch_housing", onChange: () => {} }));
    expect((screen.getAllByRole("combobox")[0] as HTMLSelectElement).value).toBe("ch_housing");
  });
});

describe("D3 初期ステージ進入日", () => {
  beforeEach(() => useAppStore.setState({ opportunities: [] }));
  it("作成日が自動記録され、手入力の前段日付は残る", () => {
    const d = { ...makeInitialDraft("u1"), title: "t", stage: "lifeplan" as never, milestones: { firstConsultDate: "2026-11-01" } };
    const opp = useAppStore.getState().addOpportunity(buildOpportunityInput(d, "h1"));
    expect(opp.milestones?.firstConsultDate).toBe("2026-11-01");
    expect(Object.keys(opp.milestones ?? {}).length).toBe(2);
  });
});

describe("D6 日付欄は縦並び", () => {
  it("StageDatesPanel が縦並びコンテナ", () => {
    const opp = { id: "o", stage: "first_consult", milestones: {} } as unknown as Opportunity;
    const { container } = render(createElement(StageDatesPanel, { opp, canEdit: true } as never));
    const list = container.querySelector('[data-testid="stage-dates-list"]');
    expect(list?.className).toContain("flex-col");
  });
});

describe("D7 最初のエラー欄へ移動", () => {
  it("商品フォームの最初のエラー欄をフォーカス", () => {
    document.body.innerHTML = '<input data-pp-field="insurer" id="a"/><input data-pp-field="monthlyPremium" id="b"/>';
    const key = focusFirstProductError({ monthlyPremium: "x", insurer: "y" }, document);
    expect(key).toBe("insurer");
    expect(document.activeElement?.id).toBe("a");
    expect(focusFirstProductError({}, document)).toBeUndefined();
  });
});

describe("D8 世帯切替で前世帯の対象者を消す", () => {
  it("所属外の対象者・商品の被保険者/契約者を外す。変化なしは同一参照", () => {
    const d = {
      ...makeInitialDraft("u1"),
      targetPersonIds: ["a", "z"],
      proposalProducts: [baseProduct({ insuredPersonId: "z", contractorPersonId: "a" })],
    };
    const r = pruneDraftToHousehold(d, ["a", "b"]);
    expect(r.targetPersonIds).toEqual(["a"]);
    expect(r.proposalProducts[0].insuredPersonId).toBe("");
    expect(r.proposalProducts[0].contractorPersonId).toBe("a");
    expect(pruneDraftToHousehold(r, ["a", "b"])).toBe(r);
  });
});

describe("D5 初年度手数料合計", () => {
  it("未入力は0扱いで合計", () => {
    expect(totalFirstYearCommission([{ firstYearCommission: 1000 }, {}, { firstYearCommission: 500 }])).toBe(1500);
  });
});

describe("E3 チャネル管理は管理画面のシステム管理者のみ", () => {
  const renderAdmin = () => render(createElement(MemoryRouter, null, createElement(AdminPage)));
  it("admin には出る・executive には出ない", () => {
    useAppStore.setState({ currentRole: "admin" });
    const a = renderAdmin();
    expect(screen.getByText("🔗 チャネル")).toBeTruthy();
    a.unmount();
    useAppStore.setState({ currentRole: "executive" });
    renderAdmin();
    expect(screen.queryByText("🔗 チャネル")).toBeNull();
  });
});
