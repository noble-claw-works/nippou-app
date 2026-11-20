// =====================================================
// renewalLabels.test.ts — ラベルマップの網羅・キー一致テスト
// =====================================================
import { describe, it, expect } from "vitest";
import type {
  RenewalStatus,
  RenewalMethod,
  RenewalProductType,
  RenewalConcern,
} from "../types/renewal";
import {
  RENEWAL_STATUS_LABEL,
  RENEWAL_METHOD_LABEL,
  RENEWAL_PRODUCT_TYPE_LABEL,
  RENEWAL_CONCERN_LABEL,
  RENEWAL_FLYER_LABEL,
  RENEWAL_GENDER_LABEL,
  RENEWAL_AGE_BAND_LABEL,
  RENEWAL_STATUS_OPTIONS,
  RENEWAL_METHOD_OPTIONS,
  RENEWAL_PRODUCT_TYPE_OPTIONS,
  RENEWAL_CONCERN_OPTIONS,
  RENEWAL_FLYER_OPTIONS,
  RENEWAL_GENDER_OPTIONS,
  RENEWAL_AGE_BAND_OPTIONS,
} from "../utils/renewalLabels";

// ── RenewalStatus ────────────────────────────────────
describe("RENEWAL_STATUS_LABEL", () => {
  const statusKeys: RenewalStatus[] = [
    "not_started",
    "in_progress",
    "completed",
  ];

  it("全ステータスキーのラベルが存在する", () => {
    for (const key of statusKeys) {
      expect(RENEWAL_STATUS_LABEL[key]).toBeTruthy();
    }
  });

  it("具体的なラベル値が正しい", () => {
    expect(RENEWAL_STATUS_LABEL.not_started).toBe("未対応");
    expect(RENEWAL_STATUS_LABEL.in_progress).toBe("対応中");
    expect(RENEWAL_STATUS_LABEL.completed).toBe("完了");
  });

  it("OPTIONS の長さがラベルマップのキー数と一致する", () => {
    expect(RENEWAL_STATUS_OPTIONS).toHaveLength(statusKeys.length);
  });

  it("OPTIONS は value/label を持つ", () => {
    for (const opt of RENEWAL_STATUS_OPTIONS) {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
    }
  });
});

// ── RenewalMethod ─────────────────────────────────────
describe("RENEWAL_METHOD_LABEL", () => {
  const methodKeys: RenewalMethod[] = [
    "rakuraku_seat",
    "phone",
    "visit",
    "mail",
    "renewal_lost",
    "undecided",
  ];

  it("全メソッドキーのラベルが存在する", () => {
    for (const key of methodKeys) {
      expect(RENEWAL_METHOD_LABEL[key]).toBeTruthy();
    }
  });

  it("具体的なラベル値が正しい", () => {
    expect(RENEWAL_METHOD_LABEL.rakuraku_seat).toBe("らくらく着座");
    expect(RENEWAL_METHOD_LABEL.phone).toBe("電話募集");
    expect(RENEWAL_METHOD_LABEL.visit).toBe("来店");
    expect(RENEWAL_METHOD_LABEL.mail).toBe("郵送");
    expect(RENEWAL_METHOD_LABEL.renewal_lost).toBe("更新落ち");
    expect(RENEWAL_METHOD_LABEL.undecided).toBe("未定");
  });

  it("OPTIONS の長さが一致する", () => {
    expect(RENEWAL_METHOD_OPTIONS).toHaveLength(methodKeys.length);
  });
});

// ── RenewalProductType ───────────────────────────────
describe("RENEWAL_PRODUCT_TYPE_LABEL", () => {
  const typeKeys: RenewalProductType[] = [
    "auto",
    "fire",
    "shinshu",
    "cho_hoken",
    "cho_biz",
    "cargo",
    "movable",
    "liability",
    "other",
  ];

  it("全種目キーのラベルが存在する", () => {
    for (const key of typeKeys) {
      expect(RENEWAL_PRODUCT_TYPE_LABEL[key]).toBeTruthy();
    }
  });

  it("具体的なラベル値が正しい", () => {
    expect(RENEWAL_PRODUCT_TYPE_LABEL.auto).toBe("自動車");
    expect(RENEWAL_PRODUCT_TYPE_LABEL.fire).toBe("火災");
    expect(RENEWAL_PRODUCT_TYPE_LABEL.liability).toBe("賠償");
    expect(RENEWAL_PRODUCT_TYPE_LABEL.other).toBe("その他");
  });

  it("OPTIONS の長さが一致する", () => {
    expect(RENEWAL_PRODUCT_TYPE_OPTIONS).toHaveLength(typeKeys.length);
  });
});

// ── RenewalConcern ────────────────────────────────────
describe("RENEWAL_CONCERN_LABEL", () => {
  const concernKeys: RenewalConcern[] = [
    "home_repair",
    "fire_renewal",
    "pension",
    "medical",
    "education",
    "asset_building",
    "inheritance",
    "none",
    "other",
  ];

  it("全気になる項目のラベルが存在する", () => {
    for (const key of concernKeys) {
      expect(RENEWAL_CONCERN_LABEL[key]).toBeTruthy();
    }
  });

  it("具体的なラベル値が正しい", () => {
    expect(RENEWAL_CONCERN_LABEL.home_repair).toBe("住宅修繕");
    expect(RENEWAL_CONCERN_LABEL.pension).toBe("老後年金");
    expect(RENEWAL_CONCERN_LABEL.none).toBe("特になし");
  });

  it("OPTIONS の長さが一致する", () => {
    expect(RENEWAL_CONCERN_OPTIONS).toHaveLength(concernKeys.length);
  });
});

// ── その他ラベルマップ ─────────────────────────────────
describe("RENEWAL_FLYER_LABEL", () => {
  it("3種の配布ラベルが存在する", () => {
    expect(RENEWAL_FLYER_LABEL.delivered).toBe("お渡しした");
    expect(RENEWAL_FLYER_LABEL.forgot).toBe("失念");
    expect(RENEWAL_FLYER_LABEL.refused).toBe("受取拒否");
  });

  it("FLYER_OPTIONS は3件", () => {
    expect(RENEWAL_FLYER_OPTIONS).toHaveLength(3);
  });
});

describe("RENEWAL_GENDER_LABEL", () => {
  it("3種の性別ラベルが存在する", () => {
    expect(RENEWAL_GENDER_LABEL.couple).toBe("ご夫婦");
    expect(RENEWAL_GENDER_LABEL.male).toBe("男性");
    expect(RENEWAL_GENDER_LABEL.female).toBe("女性");
  });

  it("GENDER_OPTIONS は3件", () => {
    expect(RENEWAL_GENDER_OPTIONS).toHaveLength(3);
  });
});

describe("RENEWAL_AGE_BAND_LABEL", () => {
  const ageBandKeys = ["20s", "30s", "40s", "50s", "60s", "70s_over"] as const;

  it("6種の年代ラベルが存在する", () => {
    for (const key of ageBandKeys) {
      expect(RENEWAL_AGE_BAND_LABEL[key]).toBeTruthy();
    }
  });

  it("具体的なラベル値が正しい", () => {
    expect(RENEWAL_AGE_BAND_LABEL["20s"]).toBe("20代");
    expect(RENEWAL_AGE_BAND_LABEL["70s_over"]).toBe("70代以上");
  });

  it("AGE_BAND_OPTIONS は6件", () => {
    expect(RENEWAL_AGE_BAND_OPTIONS).toHaveLength(ageBandKeys.length);
  });
});

// ── OPTIONS の一般特性 ────────────────────────────────
describe("全OPTIONS の一般特性", () => {
  const allOptions = [
    { name: "STATUS", opts: RENEWAL_STATUS_OPTIONS },
    { name: "METHOD", opts: RENEWAL_METHOD_OPTIONS },
    { name: "PRODUCT_TYPE", opts: RENEWAL_PRODUCT_TYPE_OPTIONS },
    { name: "CONCERN", opts: RENEWAL_CONCERN_OPTIONS },
    { name: "FLYER", opts: RENEWAL_FLYER_OPTIONS },
    { name: "GENDER", opts: RENEWAL_GENDER_OPTIONS },
    { name: "AGE_BAND", opts: RENEWAL_AGE_BAND_OPTIONS },
  ];

  for (const { name, opts } of allOptions) {
    it(`${name}_OPTIONS の全要素に value と label がある`, () => {
      for (const opt of opts) {
        expect(typeof opt.value).toBe("string");
        expect(typeof opt.label).toBe("string");
        expect(opt.value.length).toBeGreaterThan(0);
        expect(opt.label.length).toBeGreaterThan(0);
      }
    });
  }
});
