// =====================================================
// salesPerf/data/seed/contracts-targets.ts — 予算・目標データ
// =====================================================
import type { SalesTargetRow } from "../../types";

// =====================================================
// 予算・目標 (line × fy × scope × month)
// =====================================================

// 全体予算: FY2025 月次 (会計月1-12)
const TOTAL_LIFE_BUDGET_BY_MONTH: number[] = [
  3800000,
  3600000,
  4000000,
  4200000,
  4100000,
  3900000, // 4-9月
  4500000,
  4300000,
  4800000,
  4000000,
  3700000,
  4100000, // 10-3月
];
const TOTAL_NONLIFE_BUDGET_BY_MONTH: number[] = [
  4400000,
  4200000,
  4600000,
  4800000,
  4700000,
  4500000, // 4-9月
  5200000,
  5000000,
  5500000,
  4600000,
  4300000,
  4900000, // 10-3月
];

// グループ予算 (G1, G2, 管理)
const G1_LIFE_RATIO = 0.45;
const G2_LIFE_RATIO = 0.35;
const G1_NONLIFE_RATIO = 0.42;
const G2_NONLIFE_RATIO = 0.38;

// 個人予算 (7名)
const INDIVIDUAL_LIFE_RATIOS: Record<string, number> = {
  sp_u1: 0.18,
  sp_u2: 0.15,
  sp_u3: 0.12, // G1
  sp_u4: 0.14,
  sp_u5: 0.13, // G2
  sp_u6: 0.08,
  sp_u7: 0.06, // 管理
};
const INDIVIDUAL_NONLIFE_RATIOS: Record<string, number> = {
  sp_u1: 0.16,
  sp_u2: 0.14,
  sp_u3: 0.12,
  sp_u4: 0.15,
  sp_u5: 0.14,
  sp_u6: 0.09,
  sp_u7: 0.08,
};

function buildTargets(): SalesTargetRow[] {
  const rows: SalesTargetRow[] = [];

  for (let m = 1; m <= 12; m++) {
    const lifeAmt = TOTAL_LIFE_BUDGET_BY_MONTH[m - 1];
    const nlAmt = TOTAL_NONLIFE_BUDGET_BY_MONTH[m - 1];

    // 全体
    rows.push({
      line: "life",
      fiscalYear: 2025,
      scopeType: "all",
      scopeId: "ALL",
      month: m,
      amount: lifeAmt,
    });
    rows.push({
      line: "nonlife",
      fiscalYear: 2025,
      scopeType: "all",
      scopeId: "ALL",
      month: m,
      amount: nlAmt,
    });

    // FY2024 全体 (前年比用)
    rows.push({
      line: "life",
      fiscalYear: 2024,
      scopeType: "all",
      scopeId: "ALL",
      month: m,
      amount: Math.round(lifeAmt * 0.92),
    });
    rows.push({
      line: "nonlife",
      fiscalYear: 2024,
      scopeType: "all",
      scopeId: "ALL",
      month: m,
      amount: Math.round(nlAmt * 0.88),
    });

    // G1
    rows.push({
      line: "life",
      fiscalYear: 2025,
      scopeType: "group",
      scopeId: "sp_g1",
      month: m,
      amount: Math.round(lifeAmt * G1_LIFE_RATIO),
    });
    rows.push({
      line: "nonlife",
      fiscalYear: 2025,
      scopeType: "group",
      scopeId: "sp_g1",
      month: m,
      amount: Math.round(nlAmt * G1_NONLIFE_RATIO),
    });
    // G2
    rows.push({
      line: "life",
      fiscalYear: 2025,
      scopeType: "group",
      scopeId: "sp_g2",
      month: m,
      amount: Math.round(lifeAmt * G2_LIFE_RATIO),
    });
    rows.push({
      line: "nonlife",
      fiscalYear: 2025,
      scopeType: "group",
      scopeId: "sp_g2",
      month: m,
      amount: Math.round(nlAmt * G2_NONLIFE_RATIO),
    });
    // 管理G
    rows.push({
      line: "life",
      fiscalYear: 2025,
      scopeType: "group",
      scopeId: "sp_gm",
      month: m,
      amount: Math.round(lifeAmt * (1 - G1_LIFE_RATIO - G2_LIFE_RATIO)),
    });
    rows.push({
      line: "nonlife",
      fiscalYear: 2025,
      scopeType: "group",
      scopeId: "sp_gm",
      month: m,
      amount: Math.round(nlAmt * (1 - G1_NONLIFE_RATIO - G2_NONLIFE_RATIO)),
    });

    // 個人
    for (const [uid, ratio] of Object.entries(INDIVIDUAL_LIFE_RATIOS)) {
      rows.push({
        line: "life",
        fiscalYear: 2025,
        scopeType: "individual",
        scopeId: uid,
        month: m,
        amount: Math.round(lifeAmt * ratio),
      });
    }
    for (const [uid, ratio] of Object.entries(INDIVIDUAL_NONLIFE_RATIOS)) {
      rows.push({
        line: "nonlife",
        fiscalYear: 2025,
        scopeType: "individual",
        scopeId: uid,
        month: m,
        amount: Math.round(nlAmt * ratio),
      });
    }
  }

  return rows;
}

export const SEED_TARGETS: SalesTargetRow[] = buildTargets();
