// =====================================================
// matchRenewalHousehold.test.ts — 世帯突合・CSVパーサ単体テスト
// =====================================================
import { describe, it, expect } from "vitest";
import {
  matchRenewalHousehold,
  matchRenewalHouseholdBulk,
  parseRenewalCsv,
  type ImportRow,
} from "../utils/matchRenewalHousehold";
import type { Household, Person } from "../types";

// ── テスト用ヘルパー ───────────────────────────────

function makeHousehold(overrides: Partial<Household> = {}): Household {
  return {
    id: `hh_${Math.random().toString(36).slice(2, 7)}`,
    name: "田中家",
    type: "individual",
    area: "東京",
    primaryUserId: "u1",
    familyMemo: "",
    tags: [],
    memo: "",
    status: "active",
    ...overrides,
  };
}

function makePerson(
  householdId: string,
  overrides: Partial<Person> = {},
): Person {
  return {
    id: `p_${Math.random().toString(36).slice(2, 7)}`,
    householdId,
    name: "田中 太郎",
    relation: "head",
    memo: "",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeRow(overrides: Partial<ImportRow> = {}): ImportRow {
  return {
    contractorName: "田中 太郎",
    groupName: "",
    ownerName: "霧島 遥",
    insurer: "東京海上日動",
    maturityDate: "2026-12-01",
    productType: "自動車",
    prevYearPremium: "68000",
    method: "電話募集",
    ...overrides,
  };
}

// ── matchRenewalHousehold ─────────────────────────

describe("matchRenewalHousehold", () => {
  describe("個人突合（groupName が空）", () => {
    it("契約者名が一致したとき matched を返す", () => {
      const hh = makeHousehold({ id: "hh1" });
      const person = makePerson("hh1", { id: "p1", name: "田中 太郎" });
      const row = makeRow({ contractorName: "田中 太郎", groupName: "" });

      const result = matchRenewalHousehold(row, [hh], [person]);

      expect(result.matchStatus).toBe("matched");
      expect(result.householdId).toBe("hh1");
      expect(result.contractorPersonId).toBe("p1");
    });

    it("契約者名が不一致のとき unmatched を返す", () => {
      const hh = makeHousehold({ id: "hh1" });
      const person = makePerson("hh1", { id: "p1", name: "山田 花子" });
      const row = makeRow({ contractorName: "田中 太郎", groupName: "" });

      const result = matchRenewalHousehold(row, [hh], [person]);

      expect(result.matchStatus).toBe("unmatched");
      expect(result.householdId).toBeUndefined();
      expect(result.contractorPersonId).toBeUndefined();
    });

    it("氏名の全角スペース・半角スペースの違いを吸収して突合する", () => {
      const hh = makeHousehold({ id: "hh1" });
      // Person は全角スペース区切り（テスト用生データ： name = "田中" + U+3000 + "太郎"）
      const person = makePerson("hh1", { id: "p1", name: "田中\u3000太郎" });
      // CSV は「田中 太郎」（半角スペース）
      const row = makeRow({ contractorName: "田中 太郎", groupName: "" });

      const result = matchRenewalHousehold(row, [hh], [person]);

      expect(result.matchStatus).toBe("matched");
      expect(result.contractorPersonId).toBe("p1");
    });

    it("Person が空配列のとき unmatched を返す", () => {
      const hh = makeHousehold({ id: "hh1" });
      const row = makeRow({ contractorName: "田中 太郎", groupName: "" });

      const result = matchRenewalHousehold(row, [hh], []);

      expect(result.matchStatus).toBe("unmatched");
    });
  });

  describe("法人突合（groupName あり）", () => {
    it("団体名 + 契約者名が一致したとき matched を返す", () => {
      const hh = makeHousehold({ id: "hh2", name: "ABC商事株式会社" });
      const person = makePerson("hh2", { id: "p2", name: "鈴木 代表" });
      const row = makeRow({
        contractorName: "鈴木 代表",
        groupName: "ABC商事株式会社",
      });

      const result = matchRenewalHousehold(row, [hh], [person]);

      expect(result.matchStatus).toBe("matched");
      expect(result.householdId).toBe("hh2");
      expect(result.contractorPersonId).toBe("p2");
    });

    it("団体名が一致するが契約者名が不一致のとき householdId はセットされる（contractorPersonId は undefined）", () => {
      const hh = makeHousehold({ id: "hh2", name: "ABC商事株式会社" });
      const person = makePerson("hh2", { id: "p2", name: "別の担当者" });
      const row = makeRow({
        contractorName: "存在しない人",
        groupName: "ABC商事株式会社",
      });

      const result = matchRenewalHousehold(row, [hh], [person]);

      // householdId は見つかるが contractorPersonId は undefined
      expect(result.householdId).toBe("hh2");
      expect(result.contractorPersonId).toBeUndefined();
      // householdId があれば matched
      expect(result.matchStatus).toBe("matched");
    });

    it("団体名が不一致のとき unmatched を返す", () => {
      const hh = makeHousehold({ id: "hh2", name: "XYZ株式会社" });
      const person = makePerson("hh2", { id: "p2", name: "鈴木 代表" });
      const row = makeRow({
        contractorName: "鈴木 代表",
        groupName: "ABC商事株式会社",
      });

      const result = matchRenewalHousehold(row, [hh], [person]);

      expect(result.matchStatus).toBe("unmatched");
    });
  });

  it("元の ImportRow のフィールドが結果に保持される", () => {
    const hh = makeHousehold({ id: "hh1" });
    const person = makePerson("hh1", { id: "p1", name: "田中 太郎" });
    const row = makeRow({
      contractorName: "田中 太郎",
      insurer: "三井住友海上",
      maturityDate: "2027-03-15",
    });

    const result = matchRenewalHousehold(row, [hh], [person]);

    expect(result.insurer).toBe("三井住友海上");
    expect(result.maturityDate).toBe("2027-03-15");
  });
});

// ── matchRenewalHouseholdBulk ─────────────────────

describe("matchRenewalHouseholdBulk", () => {
  it("複数行を一括突合する", () => {
    const hh1 = makeHousehold({ id: "hh1", name: "田中家" });
    const hh2 = makeHousehold({ id: "hh2", name: "山田家" });
    const p1 = makePerson("hh1", { id: "p1", name: "田中 太郎" });
    const p2 = makePerson("hh2", { id: "p2", name: "山田 花子" });

    const rows: ImportRow[] = [
      makeRow({ contractorName: "田中 太郎" }),
      makeRow({ contractorName: "山田 花子" }),
      makeRow({ contractorName: "存在しない人" }),
    ];

    const results = matchRenewalHouseholdBulk(rows, [hh1, hh2], [p1, p2]);

    expect(results).toHaveLength(3);
    expect(results[0].matchStatus).toBe("matched");
    expect(results[0].householdId).toBe("hh1");
    expect(results[1].matchStatus).toBe("matched");
    expect(results[1].householdId).toBe("hh2");
    expect(results[2].matchStatus).toBe("unmatched");
  });

  it("空配列のとき空配列を返す", () => {
    expect(matchRenewalHouseholdBulk([], [], [])).toHaveLength(0);
  });
});

// ── parseRenewalCsv ───────────────────────────────

describe("parseRenewalCsv", () => {
  it("正常なCSVテキストを ImportRow 配列に変換する", () => {
    const csv = [
      "契約者,団体名,担当者,保険会社,満期日,種目,前年保険料,手続き手段",
      "田中 太郎,,霧島 遥,東京海上日動,2026-12-01,自動車,68000,電話募集",
      "山田 花子,,谷口 大輝,三井住友海上,2026-11-15,火災,42000,来店",
    ].join("\n");

    const rows = parseRenewalCsv(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0].contractorName).toBe("田中 太郎");
    expect(rows[0].groupName).toBe("");
    expect(rows[0].ownerName).toBe("霧島 遥");
    expect(rows[0].insurer).toBe("東京海上日動");
    expect(rows[0].maturityDate).toBe("2026-12-01");
    expect(rows[0].productType).toBe("自動車");
    expect(rows[0].prevYearPremium).toBe("68000");
    expect(rows[0].method).toBe("電話募集");
  });

  it("ヘッダ行のみのCSV（データなし）のとき空配列を返す", () => {
    const csv =
      "契約者,団体名,担当者,保険会社,満期日,種目,前年保険料,手続き手段";
    expect(parseRenewalCsv(csv)).toHaveLength(0);
  });

  it("空文字列のとき空配列を返す", () => {
    expect(parseRenewalCsv("")).toHaveLength(0);
  });

  it("団体名あり（法人）の行を正しくパースする", () => {
    const csv = [
      "契約者,団体名,担当者,保険会社,満期日,種目,前年保険料,手続き手段",
      "ABC代表,ABC商事株式会社,霧島 遥,損保ジャパン,2027-01-20,賠償,185000,らくらく着座",
    ].join("\n");

    const rows = parseRenewalCsv(csv);
    expect(rows[0].contractorName).toBe("ABC代表");
    expect(rows[0].groupName).toBe("ABC商事株式会社");
  });

  it("ダブルクォートで囲まれたフィールド（カンマ含む）を正しくパースする", () => {
    const csv = [
      "契約者,団体名,担当者,保険会社,満期日,種目,前年保険料,手続き手段",
      '"田中, 太郎",,担当者A,保険会社B,2027-01-01,自動車,50000,電話募集',
    ].join("\n");

    const rows = parseRenewalCsv(csv);
    expect(rows[0].contractorName).toBe("田中, 太郎");
  });

  it("CRLF 改行を正しく処理する", () => {
    const csv =
      "契約者,団体名,担当者,保険会社,満期日,種目,前年保険料,手続き手段\r\n田中 太郎,,霧島 遥,東京海上,2026-12-01,自動車,68000,電話募集\r\n";

    const rows = parseRenewalCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].contractorName).toBe("田中 太郎");
  });
});
