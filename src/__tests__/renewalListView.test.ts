// =====================================================
// renewalListView.test.ts — buildRenewalRowView の単体テスト（§8）
// =====================================================
import { describe, it, expect } from "vitest";
import { buildRenewalRowView } from "../utils/renewalListView";

const TODAY = "2026-10-20";

/** テスト用の最小 RenewalCase 相当（maturityDate / survey のみ参照） */
function mk(maturityDate: string, firstContactDate?: string) {
  return {
    maturityDate,
    survey: firstContactDate
      ? { consult: { firstContactDate } }
      : { consult: {} },
  };
}

describe("buildRenewalRowView", () => {
  it("本日基点の残日数を主表示として算出する（満期まで40日）", () => {
    const v = buildRenewalRowView(mk("2026-11-29"), TODAY);
    expect(v.maturityDays).toBe(40);
    expect(v.maturityDaysLabel).toBe("40日");
  });

  it("FC日があれば FC日基点の日数を併記用に算出する（満期−FC）", () => {
    // 満期 2026-11-29, FC 2026-10-01 → 59日
    const v = buildRenewalRowView(mk("2026-11-29", "2026-10-01"), TODAY);
    expect(v.fcDate).toBe("2026-10-01");
    expect(v.fcDays).toBe(59);
    expect(v.fcDaysLabel).toBe("59日");
  });

  it("FC日が無ければ fcDate undefined / fcDays null / ラベルは —", () => {
    const v = buildRenewalRowView(mk("2026-11-29"), TODAY);
    expect(v.fcDate).toBeUndefined();
    expect(v.fcDays).toBeNull();
    expect(v.fcDaysLabel).toBe("—");
  });

  it("60日以内（RENEWAL_NEAR_DAYS）は near=true", () => {
    expect(buildRenewalRowView(mk("2026-11-29"), TODAY).near).toBe(true); // 40日
    expect(buildRenewalRowView(mk("2026-12-19"), TODAY).near).toBe(true); // 60日(境界)
    expect(buildRenewalRowView(mk("2026-12-20"), TODAY).near).toBe(false); // 61日(境界外)
  });

  it("60日超は near=false", () => {
    // 満期 2027-01-01 → 73日
    const v = buildRenewalRowView(mk("2027-01-01"), TODAY);
    expect(v.near).toBe(false);
    expect(v.expired).toBe(false);
  });

  it("満期当日/経過は expired=true かつ near=true", () => {
    const sameDay = buildRenewalRowView(mk(TODAY), TODAY);
    expect(sameDay.maturityDays).toBe(0);
    expect(sameDay.expired).toBe(true);
    expect(sameDay.near).toBe(true);

    const past = buildRenewalRowView(mk("2026-10-10"), TODAY);
    expect(past.maturityDays).toBe(-10);
    expect(past.expired).toBe(true);
    expect(past.maturityDaysLabel).toBe("-10日");
  });

  it("満期日が欠損/不正なら全算出 null・強調フラグ false", () => {
    const v = buildRenewalRowView(
      { maturityDate: "", survey: { consult: {} } },
      TODAY,
    );
    expect(v.maturityDays).toBeNull();
    expect(v.maturityDaysLabel).toBe("—");
    expect(v.near).toBe(false);
    expect(v.expired).toBe(false);
  });
});
