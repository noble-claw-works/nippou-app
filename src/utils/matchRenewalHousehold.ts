// =====================================================
// matchRenewalHousehold — インポート行と既存世帯/契約者の突合ロジック
// 契約者名 + 団体名で Household/Person を照合する純関数
// =====================================================
import type { Household, Person } from "../types";

/** インポート CSV から解析された1行（突合前） */
export interface ImportRow {
  /** 契約者（氏名または法人担当者名） */
  contractorName: string;
  /** 団体名（法人・団体契約のみ。個人は空） */
  groupName: string;
  /** 担当者名 */
  ownerName: string;
  /** 保険会社 */
  insurer: string;
  /** 満期日 YYYY-MM-DD */
  maturityDate: string;
  /** 種目 */
  productType: string;
  /** 前年保険料（文字列 → 数値変換は parse 側で） */
  prevYearPremium: string;
  /** 手続き手段 */
  method: string;
}

/** 突合結果 */
export type MatchStatus = "matched" | "unmatched";

/** 突合済み行（ImportRow + 突合結果） */
export interface MatchedImportRow extends ImportRow {
  matchStatus: MatchStatus;
  /** 突合した世帯 ID（matched のみ） */
  householdId?: string;
  /** 突合した契約者 Person ID（matched のみ） */
  contractorPersonId?: string;
}

// ── 正規化ヘルパー ──────────────────────────────────

/**
 * 名前の正規化: 全角スペース→半角・前後空白除去・小文字
 * （「田中 太郎」「田中〜太郎」「田中太郎」を揃える）
 */
function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\u3000/g, " ") // 全角スペース→半角
    .replace(/\s+/g, "") // スペース除去（姓名間の区切り無視）
    .toLowerCase();
}

// ── 突合ロジック ────────────────────────────────────

/**
 * 1行を既存 Household/Person と突合する純関数。
 *
 * 突合キー:
 *   1. groupName が空でない（法人）: Household.name と一致する世帯を探し、
 *      その世帯の Person の中から contractorName と一致する人を探す。
 *   2. groupName が空（個人）: Person.name が contractorName と一致する人を探し、
 *      その Person の世帯を使う。
 *
 * @param row       - CSV から解析した行
 * @param households - 既存世帯一覧
 * @param persons    - 既存人物一覧
 */
export function matchRenewalHousehold(
  row: ImportRow,
  households: Household[],
  persons: Person[],
): MatchedImportRow {
  const normalContractor = normalizeName(row.contractorName);
  const normalGroup = normalizeName(row.groupName);

  let householdId: string | undefined;
  let contractorPersonId: string | undefined;

  if (row.groupName.trim() !== "") {
    // 法人突合: 団体名で世帯を絞り込み→担当者名でPerson照合
    const matchedHousehold = households.find(
      (h) => normalizeName(h.name) === normalGroup,
    );
    if (matchedHousehold) {
      const matchedPerson = persons.find(
        (p) =>
          p.householdId === matchedHousehold.id &&
          normalizeName(p.name) === normalContractor,
      );
      householdId = matchedHousehold.id;
      contractorPersonId = matchedPerson?.id;
    }
  } else {
    // 個人突合: 契約者名で Person を照合→世帯IDを取得
    const matchedPerson = persons.find(
      (p) => normalizeName(p.name) === normalContractor,
    );
    if (matchedPerson) {
      contractorPersonId = matchedPerson.id;
      householdId = matchedPerson.householdId;
    }
  }

  const matchStatus: MatchStatus = householdId ? "matched" : "unmatched";

  return {
    ...row,
    matchStatus,
    householdId,
    contractorPersonId,
  };
}

/**
 * 複数行をまとめて突合する純関数（バルク版）。
 */
export function matchRenewalHouseholdBulk(
  rows: ImportRow[],
  households: Household[],
  persons: Person[],
): MatchedImportRow[] {
  return rows.map((row) => matchRenewalHousehold(row, households, persons));
}

// ── CSV パーサ ──────────────────────────────────────

/**
 * CSV テキストをヘッダ行なしの ImportRow 配列に変換する軽量パーサ。
 *
 * 期待ヘッダ（1行目）:
 *   契約者,団体名,担当者,保険会社,満期日,種目,前年保険料,手続き手段
 *
 * RFC 4180 の最小サポート（カンマ区切り・二重引用符でフィールドをくくれる）。
 */
export function parseRenewalCsv(csvText: string): ImportRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return []; // ヘッダのみ or 空

  // ヘッダ行をスキップ（1行目）
  const dataLines = lines.slice(1);

  return dataLines.map((line) => {
    const cols = splitCsvLine(line);
    return {
      contractorName: (cols[0] ?? "").trim(),
      groupName: (cols[1] ?? "").trim(),
      ownerName: (cols[2] ?? "").trim(),
      insurer: (cols[3] ?? "").trim(),
      maturityDate: (cols[4] ?? "").trim(),
      productType: (cols[5] ?? "").trim(),
      prevYearPremium: (cols[6] ?? "").trim(),
      method: (cols[7] ?? "").trim(),
    };
  });
}

/** CSV の1行をフィールド配列に分割（簡易 RFC 4180 対応） */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // エスケープされた引用符 ""
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}
