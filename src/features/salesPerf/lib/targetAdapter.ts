// =====================================================
// targetAdapter.ts — 本体 SalesTarget[] → SalesTargetRow[] 派生
// 本体の目標を salesPerf の行形式(line×month×scope)に展開する。
// 本体に値がない月は SEED_TARGETS のフォールバックで補完する。
// =====================================================
import type { SalesTarget } from "../../../types";
import type { SalesTargetRow } from "../types";
import { SEED_TARGETS } from "../data/seedContracts";
import { FISCAL_START_MONTH } from "../constants";
import { DEFAULT_FISCAL_YEAR } from "../constants";

// =====================================================
// 内部ユーティリティ
// =====================================================

/**
 * period 文字列 + periodType → 会計月リスト (1-12)
 * 例: 'monthly','2026-04' → [1]  (会計月1=4月)
 *     'quarterly','2025-Q2' → [4,5,6]
 *     'annual','2025' → [1..12]
 */
function periodToFiscalMonths(
  periodType: SalesTarget["periodType"],
  period: string,
  fiscalYear: number,
): number[] {
  if (periodType === "monthly") {
    // 'YYYY-MM'
    const [yStr, mStr] = period.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    // 会計月計算 (FISCAL_START_MONTH=4月始まり)
    const fm = ((m - FISCAL_START_MONTH + 12) % 12) + 1;
    // この暦月が fiscalYear に属するか
    const fy = m >= FISCAL_START_MONTH ? y : y - 1;
    if (fy !== fiscalYear) return [];
    return [fm];
  }

  if (periodType === "quarterly") {
    // 'YYYY-Qn' (n=1..4)
    const [yStr, qStr] = period.split("-Q");
    const y = parseInt(yStr, 10);
    const q = parseInt(qStr, 10);
    if (isNaN(y) || isNaN(q)) return [];
    // 四半期開始会計月 (暦月ベース Q1=1月 → 会計月に変換)
    const startCalMonth = (q - 1) * 3 + 1; // Q1→1, Q2→4, Q3→7, Q4→10
    const months: number[] = [];
    for (let i = 0; i < 3; i++) {
      const calM = startCalMonth + i;
      const fy = calM >= FISCAL_START_MONTH ? y : y - 1;
      if (fy === fiscalYear) {
        const fm = ((calM - FISCAL_START_MONTH + 12) % 12) + 1;
        months.push(fm);
      }
    }
    return months;
  }

  if (periodType === "annual") {
    // 'YYYY'
    const y = parseInt(period, 10);
    if (y !== fiscalYear) return [];
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }

  return [];
}

/**
 * SalesTarget[] から SalesTargetRow[] を生成する。
 * - individual → scopeType:'individual', scopeId:ownerId
 * - team       → scopeType:'group', scopeId:ownerId(=Team.id)
 * - 全社行は個人/チーム行から自動合算しない（seed フォールバックが担う）
 * - 対象 fiscalYear のみ展開する
 * - line は both 前提（目標は生損分離なし）→ SalesTargetRow.line='life'+'nonlife' 双方に同額設定
 */
function expandTargets(
  targets: SalesTarget[],
  fiscalYear: number,
): SalesTargetRow[] {
  const rows: SalesTargetRow[] = [];

  for (const t of targets) {
    const fiscalMonths = periodToFiscalMonths(
      t.periodType,
      t.period,
      fiscalYear,
    );
    if (fiscalMonths.length === 0) continue;

    const amountPerMonth = t.targetPremium / fiscalMonths.length;
    const scopeType: SalesTargetRow["scopeType"] =
      t.scope === "individual" ? "individual" : "group";
    const scopeId = t.ownerId;

    for (const month of fiscalMonths) {
      // both 前提: life/nonlife 双方に折半して設定
      const halfAmount = amountPerMonth / 2;
      rows.push(
        {
          line: "life",
          fiscalYear,
          scopeType,
          scopeId,
          month,
          amount: halfAmount,
        },
        {
          line: "nonlife",
          fiscalYear,
          scopeType,
          scopeId,
          month,
          amount: halfAmount,
        },
      );
    }
  }

  return rows;
}

/**
 * 本体 SalesTarget[] → SalesTargetRow[] を生成。
 * 本体にデータがない場合は SEED_TARGETS にフォールバック。
 */
export function buildTargetRows(
  salesTargets: SalesTarget[],
  fiscalYear: number = DEFAULT_FISCAL_YEAR,
): SalesTargetRow[] {
  if (salesTargets.length === 0) {
    return SEED_TARGETS.filter((r) => r.fiscalYear === fiscalYear);
  }

  const rows = expandTargets(salesTargets, fiscalYear);

  if (rows.length === 0) {
    // 本体にデータはあるが対象年度が空 → seed フォールバック
    return SEED_TARGETS.filter((r) => r.fiscalYear === fiscalYear);
  }

  // 全社行 (scopeType='all') は seed から補完
  const seedAllRows = SEED_TARGETS.filter(
    (r) => r.fiscalYear === fiscalYear && r.scopeType === "all",
  );

  return [...seedAllRows, ...rows];
}
