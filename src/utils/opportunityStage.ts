/**
 * opportunityStage.ts — 案件ステージ律速ロジック
 *
 * ADR-B3 §B3-3 / §B3-4 準拠 (2026-08-06)
 * 全関数が純関数（副作用なし）。UI・集計・テストから共用。
 */

import type { Opportunity, OpportunityStage } from "../types";

// ─── Funnel 順序（lost は funnel 外の終端） ─────────────────────────────────────
export const FUNNEL_ORDER: OpportunityStage[] = [
  "approach",
  "fact_finding",
  "needs_analysis",
  "proposal",
  "negotiation",
  "application",
  "underwriting",
  "issued",
];

// Funnel インデックス取得（funnel 外の stage は -1）
function funnelIndex(stage: OpportunityStage): number {
  return FUNNEL_ORDER.indexOf(stage);
}

// ─── B3-3-1. 実効ステージ導出（最も後ろ＝進んでいない方に律速） ──────────────────
/**
 * 案件の「実効ステージ」を返す。
 * - 商品個別ステージが存在すれば、全商品（含む案件ステージ）のうち
 *   FUNNEL_ORDER で最も手前（index 最小）のものに律速。
 * - 商品個別ステージが 0 件なら Opportunity.stage を返す。
 * - funnel 外の stage（lost/issued など）は rankable から除いて先に確定判定。
 */
export function effectiveStage(opp: Opportunity): OpportunityStage {
  // 終端ステージは律速計算せず即返す
  if (opp.stage === "lost") return "lost";
  if (opp.stage === "issued") return "issued";

  // 商品個別ステージを集める（null/undefined は除く）
  const productStages = opp.proposalProducts
    .map((p) => p.stage)
    .filter((s): s is OpportunityStage => s != null);

  if (productStages.length === 0) {
    // 個別ステージなし → 案件ステージが正本
    return opp.stage;
  }

  // 案件ステージ自身も候補に含める
  const candidates = [...productStages, opp.stage];

  // funnel 内の stage だけで律速を計算（issued/lost は rankable から除く）
  const rankable = candidates.filter((s) => funnelIndex(s) >= 0);

  if (rankable.length === 0) {
    // 全部が issued/lost 等 → 案件ステージに委ねる
    return opp.stage;
  }

  // 最小 index ＝ 最も手前 ＝ 律速
  return rankable.reduce((acc, s) =>
    funnelIndex(s) < funnelIndex(acc) ? s : acc,
  );
}

// ─── B3-3-2. ⚠️ 不揃い判定 ────────────────────────────────────────────────────
const MILESTONE_KEYS = [
  "firstConsultDate",
  "lifePlanDate",
  "proposalDate",
  "applicationDate",
  "establishedDate",
  "inceptionDate",
  "lostDate",
] as const;

type MilestoneKey = (typeof MILESTONE_KEYS)[number];

/**
 * 案件の商品間でステージ or 日付が揃っていなければ true（⚠️マーカー）。
 * 単一商品 or 商品なしは必ず false（不揃いになりようがない）。
 */
export function isRagged(opp: Opportunity): boolean {
  const products = opp.proposalProducts;
  if (products.length <= 1) return false;

  // (1) ステージの不揃い:
  //   全商品の実効ステージ（個別 or 案件継承）が単一値でない
  const perProductStage = products.map((p) => p.stage ?? opp.stage);
  const distinctStages = new Set(perProductStage);
  if (distinctStages.size > 1) return true;

  // (2) 日付の不揃い:
  //   いずれかのマイルストーンキーについて、
  //   「入っている商品」と「未入力の商品」が混在する
  for (const key of MILESTONE_KEYS) {
    const presenceList = products.map((p) => {
      const val =
        (p.milestones?.[key as MilestoneKey] ??
          opp.milestones?.[key as MilestoneKey]) != null;
      return val;
    });
    const distinctPresence = new Set(presenceList);
    if (distinctPresence.size > 1) return true;
  }

  return false;
}

// ─── B3-3-3. 代表「契約予定日」導出 ─────────────────────────────────────────────
/**
 * 案件行に出す契約予定日。
 * 商品個別 applicationDate がある場合は最も遅い日付（律速側）。
 * なければ案件の expectedCloseDate（既存・申込予定日）。
 */
export function effectiveExpectedCloseDate(
  opp: Opportunity,
): string | undefined {
  const dates = opp.proposalProducts
    .map((p) => p.milestones?.applicationDate)
    .filter((d): d is string => d != null);

  if (dates.length > 0) {
    return dates.reduce((acc, d) => (d > acc ? d : acc));
  }
  return opp.expectedCloseDate;
}

// ─── B3-2-3. アクティブ案件判定 ─────────────────────────────────────────────────
/**
 * アクティブ案件判定:
 * status ∈ {open, on_hold} かつ stage != 'lost' かつ effectiveStage != 'issued'
 */
export function isActiveOpp(opp: Opportunity): boolean {
  if (opp.status === "won" || opp.status === "lost") return false;
  if (opp.stage === "lost") return false;
  if (effectiveStage(opp) === "issued") return false;
  return true;
}

// ─── B3-3-4. 世帯のアクティブ案件一覧・代表案件選定 ─────────────────────────────
/**
 * 特定世帯のアクティブ案件一覧を返す。
 */
export function householdActiveOpps(
  opps: Opportunity[],
  householdId: string,
): Opportunity[] {
  return opps.filter((o) => o.householdId === householdId && isActiveOpp(o));
}

/**
 * アクティブ案件の中から「代表」を選ぶ。
 * 優先キー:
 *   1. 実効ステージが最も進んでいる（FUNNEL_ORDER の index 最大）
 *   2. 同率なら updatedAt が最も新しい
 * 空なら null を返す。
 */
export function representativeOpp(
  activeOpps: Opportunity[],
): Opportunity | null {
  if (activeOpps.length === 0) return null;

  return activeOpps.reduce((best, opp) => {
    const bestIdx = funnelIndex(effectiveStage(best));
    const oppIdx = funnelIndex(effectiveStage(opp));
    if (oppIdx > bestIdx) return opp;
    if (oppIdx < bestIdx) return best;
    // 同率 → updatedAt 最新
    return opp.updatedAt > best.updatedAt ? opp : best;
  });
}

// ─── B3-4. タブ分類ロジック ──────────────────────────────────────────────────────

/**
 * 訪問済み判定:
 * 初回相談日あり かつ 未提案（提案日なし）
 */
export function isVisited(opp: Opportunity): boolean {
  const m = opp.milestones;
  const hasFirstConsult = m?.firstConsultDate != null;
  const notProposedYet = m?.proposalDate == null;
  return hasFirstConsult && notProposedYet;
}

/**
 * 7タブキー型（ADR-B3 §B3-4-1）
 */
export type StageTabKey7 =
  | "new"
  | "visited"
  | "proposed"
  | "contract_pending"
  | "contract"
  | "issued"
  | "lost";

/**
 * 案件 → タブキー導出（案件実効ステージで数える）
 * B3-4-3 §tabOf 準拠。
 */
export function tabOf(opp: Opportunity): StageTabKey7 {
  // 終端を先に判定
  if (opp.stage === "lost" || opp.status === "lost") return "lost";

  const effStage = effectiveStage(opp);
  if (effStage === "issued") return "issued";

  // 日付ベースの訪問済み判定（新案件と提案済みの境界を切る）
  if (isVisited(opp)) return "visited";

  // 実効ステージ → タブ（issued/lost は上の早期 return で処理済み）
  switch (effStage) {
    case "approach":
      return "new";
    case "fact_finding":
    case "needs_analysis":
      // 日付がない既存 seed のフォールバック（milestones なし）
      return "visited";
    case "proposal":
    case "negotiation":
      return "proposed";
    case "application":
      return "contract_pending";
    case "underwriting":
      return "contract";
    default:
      return "new";
  }
}
