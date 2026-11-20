// =====================================================
// contractDetailHelpers.ts — S7ContractDetail 純関数ヘルパー
// =====================================================

import type { SalesContract } from "../../types";
import type { SalesPerfMasters } from "../../types";
import { ownerName } from "../../lib/salePerfScope";
import {
  CONFIDENCE_LIFE_LABELS,
  CONFIDENCE_NONLIFE_LABELS,
  FISCAL_MONTH_LABELS,
} from "../../constants";
import type { SortKey, SortDir } from "./contractDetailTypes";

// ----------------------------------------
// 確度表示ラベル
// ----------------------------------------
export function confidenceLabel(c: SalesContract): string {
  if (c.line === "life") {
    return CONFIDENCE_LIFE_LABELS[c.confidenceCode] ?? c.confidenceCode;
  }
  return CONFIDENCE_NONLIFE_LABELS[c.confidenceCode] ?? c.confidenceCode;
}

// ----------------------------------------
// 要確認フラグの日本語表示マップ
// ----------------------------------------
export const ISSUE_LABELS: Record<string, string> = {
  premium_unparseable: "保険料変換不能",
  confidence_unknown: "確度不明",
  fy_mismatch: "年度不整合",
  missing_insurer: "保険会社欠損",
  missing_channel: "チャネル欠損",
  missing_product_type: "種目欠損",
};

export function formatIssues(issues: string[]): string {
  return issues.map((i) => ISSUE_LABELS[i] ?? i).join(" / ");
}

// ----------------------------------------
// 成立日表示
// ----------------------------------------
export function formatEstablishedDate(c: SalesContract): string {
  if (!c.establishedDate) {
    if (c._issues.includes("fy_mismatch")) return "−(年度不整合)";
    return "未計上";
  }
  return c.establishedDate;
}

// ----------------------------------------
// 会計月ラベル
// ----------------------------------------
export function monthLabel(c: SalesContract): string {
  if (c.month === null) return "−";
  return FISCAL_MONTH_LABELS[c.month] ?? `${c.month}月`;
}

// ----------------------------------------
// ソート関数
// ----------------------------------------
export function sortRows(
  rows: SalesContract[],
  key: SortKey,
  dir: SortDir,
  masters: SalesPerfMasters,
): SalesContract[] {
  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "establishedDate": {
        const da = a.establishedDate ?? "";
        const db = b.establishedDate ?? "";
        cmp = da.localeCompare(db);
        break;
      }
      case "firstYearCommission": {
        const va = a.firstYearCommission ?? -1;
        const vb = b.firstYearCommission ?? -1;
        cmp = va - vb;
        break;
      }
      case "monthlyPremium": {
        const va = a.monthlyPremium ?? -1;
        const vb = b.monthlyPremium ?? -1;
        cmp = va - vb;
        break;
      }
      case "owner": {
        const na = ownerName(a.ownerId, masters);
        const nb = ownerName(b.ownerId, masters);
        cmp = na.localeCompare(nb, "ja");
        break;
      }
      case "insurer":
        cmp = a.insurer.localeCompare(b.insurer, "ja");
        break;
      case "productType":
        cmp = a.productType.localeCompare(b.productType, "ja");
        break;
      case "channel":
        cmp = a.channel.localeCompare(b.channel, "ja");
        break;
      case "partner":
        cmp = a.partner.localeCompare(b.partner, "ja");
        break;
      case "confidence":
        cmp = (a.confidenceCode ?? "").localeCompare(b.confidenceCode ?? "");
        break;
      case "line":
        cmp = a.line.localeCompare(b.line);
        break;
      case "issues":
        cmp = b._issues.length - a._issues.length; // 多い順(昇順とき反転)
        break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}
