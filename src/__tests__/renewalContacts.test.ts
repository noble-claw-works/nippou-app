import { describe, it, expect } from "vitest";
import {
  deriveFirstContactDate,
  sortContactsByDate,
} from "../utils/renewalContacts";
import type { RenewalContactRecord } from "../types/renewal";

function rec(
  id: string,
  date: string,
  result: RenewalContactRecord["result"],
  memo?: string,
): RenewalContactRecord {
  return { id, date, result, memo };
}

describe("deriveFirstContactDate", () => {
  it("talked の最も古い date を返す", () => {
    const contacts = [
      rec("1", "2026-03-10", "talked"),
      rec("2", "2026-02-01", "no_answer"),
      rec("3", "2026-02-20", "talked"),
      rec("4", "2026-01-15", "voicemail"),
    ];
    expect(deriveFirstContactDate(contacts)).toBe("2026-02-20");
  });

  it("talked が無ければ fallback を返す", () => {
    const contacts = [
      rec("1", "2026-02-01", "no_answer"),
      rec("2", "2026-02-20", "voicemail"),
    ];
    expect(deriveFirstContactDate(contacts, "2026-01-01")).toBe("2026-01-01");
  });

  it("空配列 かつ fallback 無しは undefined", () => {
    expect(deriveFirstContactDate([])).toBeUndefined();
    expect(deriveFirstContactDate(undefined)).toBeUndefined();
  });

  it("talked が1件のみならその date", () => {
    const contacts = [rec("1", "2026-05-05", "talked")];
    expect(deriveFirstContactDate(contacts)).toBe("2026-05-05");
  });

  it("date 空の talked は無視し fallback へ", () => {
    const contacts = [rec("1", "", "talked")];
    expect(deriveFirstContactDate(contacts, "2026-09-09")).toBe("2026-09-09");
  });
});

describe("sortContactsByDate", () => {
  it("date 昇順にソートする（非破壊）", () => {
    const contacts = [
      rec("a", "2026-03-10", "talked"),
      rec("b", "2026-01-15", "voicemail"),
      rec("c", "2026-02-20", "no_answer"),
    ];
    const sorted = sortContactsByDate(contacts);
    expect(sorted.map((c) => c.id)).toEqual(["b", "c", "a"]);
    expect(contacts.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("空/undefined は空配列", () => {
    expect(sortContactsByDate([])).toEqual([]);
    expect(sortContactsByDate(undefined)).toEqual([]);
  });

  it("同日は元の相対順を保つ（安定）", () => {
    const contacts = [
      rec("x", "2026-02-01", "talked"),
      rec("y", "2026-02-01", "no_answer"),
    ];
    expect(sortContactsByDate(contacts).map((c) => c.id)).toEqual(["x", "y"]);
  });
});
