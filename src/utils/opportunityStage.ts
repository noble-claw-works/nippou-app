/**
 * opportunityStage.ts — 案件ステージ律速ロジック
 *
 * ADR-B3 §B3-3 / §B3-4 + ADR-B4 v2 §B4-3 準拠 (2026-08-07)
 * 全関数が純関数（副作用なし）。UI・集計・テストから共用。
 *
 * 主な変更点（ADR-B4 v2）:
 * - 7タブ語彙更新: first_consult/lifeplan/proposed/contract_pending/contract/issued/lost
 * - stageFromMilestones(): 日付→9段 stage 導出（確定真理値表）
 * - effectiveStage(): 日付正本＋既存seedフォールバック（律速統合）
 * - tabOf(): 7タブ・日付駆動版
 * - latestProposalDate(): proposals 最新ラウンド or milestones.proposalDate
 * - TAB_META, stageToTabKey: 7タブ single source
 * - isVisited(): 廃止（stageFromMilestones に吸収。後方互換エクスポートとして残す）
 */

import type {
  Opportunity,
  OpportunityStage,
  ContractMilestones,
} from "../types";

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

// ─── 7タブ キー型（ADR-B4 v2 確定語彙） ─────────────────────────────────────────
/**
 * 7タブキー型（ADR-B4 v2 §B4-4）
 * 初回相談 / LP提案 / 提案 / 契約予定 / 契約 / 成立 / 失注
 */
export type StageTabKey7 =
  | "first_consult"
  | "lifeplan"
  | "proposed"
  | "contract_pending"
  | "contract"
  | "issued"
  | "lost";

/** 7タブ定義（left→right 順）。single source（ADR-B4 v2 §B4-4） */
export const TAB_META: Array<{ key: StageTabKey7; label: string }> = [
  { key: "first_consult", label: "初回相談" },
  { key: "lifeplan", label: "LP提案" },
  { key: "proposed", label: "提案" },
  { key: "contract_pending", label: "契約予定" },
  { key: "contract", label: "契約" },
  { key: "issued", label: "成立" },
  { key: "lost", label: "失注" },
];

/**
 * 9段 funnel stage → 7タブキー の対応マップ（ADR-B4 v2 §B4-3）
 * approach → first_consult（「新案件」タブ廃止・最左へ吸収）
 */
export const STAGE_TO_TAB: Record<OpportunityStage, StageTabKey7> = {
  approach: "first_consult",
  fact_finding: "first_consult",
  needs_analysis: "lifeplan",
  proposal: "proposed",
  negotiation: "proposed",
  application: "contract_pending",
  underwriting: "contract",
  issued: "issued",
  lost: "lost",
};

// ─── ADR-B4 v2 §B4-3-1. 提案日: proposals 最新ラウンド or milestones fallback ───
/**
 * 案件の「提案日」を返す。
 * proposals がある場合は最新ラウンドの proposalDate、なければ milestones.proposalDate。
 */
export function latestProposalDate(opp: Opportunity): string | undefined {
  if (opp.proposals && opp.proposals.length > 0) {
    return opp.proposals.reduce((latest, round) =>
      round.proposalDate > latest.proposalDate ? round : latest,
    ).proposalDate;
  }
  return opp.milestones?.proposalDate;
}

// ─── ADR-B4 v2 §B4-3-1. 日付→9段 stage 導出（確定真理値表） ────────────────────
/**
 * milestones の日付から 9段 funnel stage を導出する。
 * 真理値表（上から順・早い者勝ち）:
 *   1. lostDate あり     → 'lost'       (失注・最優先)
 *   2. establishedDate あり → 'issued'   (成立)
 *   3. contractDate あり    → 'underwriting' (契約)
 *   4. applicationDate あり → 'application'  (契約予定)
 *   5. proposalDate あり    → 'proposal'     (提案)
 *   6. lifePlanDate あり    → 'needs_analysis' (LP提案)
 *   7. firstConsultDate あり → 'fact_finding'  (初回相談)
 *   8. どの日付も無い       → 'approach'      (日付ゼロ)
 *
 * @param opp - 案件（proposals の latestProposalDate 参照に使用）
 * @param m - 判定対象の milestones（案件 or 商品個別）
 */
export function stageFromMilestones(
  opp: Opportunity,
  m: ContractMilestones | undefined,
): OpportunityStage {
  // milestones 満者も proposals もない場合は approach
  if (!m && !opp.proposals?.length) return "approach";
  const lostDate = m?.lostDate;
  if (lostDate != null) return "lost";
  if (m?.establishedDate != null) return "issued";
  if (m?.contractDate != null) return "underwriting";
  if (m?.applicationDate != null) return "application";
  // 提案日: 案件の milestones と同一（または未設定）の場合は latestProposalDate を使う（proposals 統合）
  const pr =
    m === opp.milestones || m == null
      ? latestProposalDate(opp)
      : m.proposalDate;
  if (pr != null) return "proposal";
  if (m?.lifePlanDate != null) return "needs_analysis";
  if (m?.firstConsultDate != null) return "fact_finding";
  return "approach";
}

// ─── ADR-B4 v2 §B4-3-2. effectiveStage（日付正本＋既存seedフォールバック・律速統合） ──
/**
 * 案件の「実効ステージ」を返す。
 *
 * 日付駆動（ADR-B4 v2）:
 *   - milestones/proposals が1つでも存在する → stageFromMilestones で導出し律速統合
 *   - 全て空（既存 seed 互換）→ opp.stage（手動ステージ）をそのまま返す
 *
 * 律速（ADR-B3 §B3-3-1）:
 *   - 個別 milestones を持つ商品がある場合、全商品（含む案件）の stage のうち
 *     FUNNEL_ORDER で最も手前（index 最小）のものに律速
 */
export function effectiveStage(opp: Opportunity): OpportunityStage {
  // 終端ステージは律速計算せず即返す（手動 stage=lost/issued）
  if (opp.stage === "lost") return "lost";
  if (opp.stage === "issued") return "issued";

  // milestones/proposals が1つでも存在するか確認
  const hasAnyDateMilestone =
    (opp.milestones != null &&
      Object.keys(opp.milestones).some(
        (k) => opp.milestones![k as keyof ContractMilestones] != null,
      )) ||
    (opp.proposals != null && opp.proposals.length > 0) ||
    opp.proposalProducts.some(
      (p) =>
        p.milestones != null &&
        Object.keys(p.milestones).some(
          (k) => p.milestones![k as keyof ContractMilestones] != null,
        ),
    );

  if (hasAnyDateMilestone) {
    // 日付駆動パス: stageFromMilestones で案件 stage を導出
    const oppStage = stageFromMilestones(opp, opp.milestones);

    // 失注は最優先（律速不要）
    if (oppStage === "lost") return "lost";

    // 商品個別 milestones がある場合、律速計算（milestones ベース）
    const productDateStages = opp.proposalProducts
      .filter((p) => p.milestones != null)
      .map((p) => stageFromMilestones(opp, p.milestones));

    if (productDateStages.length === 0) {
      return oppStage;
    }

    // 案件 stage も候補に含める
    const candidates = [...productDateStages, oppStage];
    const rankable = candidates.filter((s) => funnelIndex(s) >= 0);
    if (rankable.length === 0) return oppStage;

    return rankable.reduce((acc, s) =>
      funnelIndex(s) < funnelIndex(acc) ? s : acc,
    );
  }

  // 日付ゼロパス: 手動ステージ + 商品個別ステージによる律速（ADR-B3 互換）
  const productLegacyStages = opp.proposalProducts
    .map((p) => p.stage)
    .filter((s): s is OpportunityStage => s != null);

  if (productLegacyStages.length === 0) {
    return opp.stage;
  }

  // 案件ステージ自身も候補に含める
  const candidates = [...productLegacyStages, opp.stage];
  const rankable = candidates.filter((s) => funnelIndex(s) >= 0);

  if (rankable.length === 0) return opp.stage;

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
  "contractDate",
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
  const perProductStage = products.map((p) =>
    p.milestones
      ? stageFromMilestones(opp, p.milestones)
      : (p.stage ?? effectiveStage(opp)),
  );
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
  if (opp.milestones?.lostDate != null) return false;
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

// ─── ADR-B4 v2 §B4-3-3. tabOf（7タブ・日付駆動） ────────────────────────────────
/**
 * 案件 → 7タブキー導出（ADR-B4 v2 §B4-3 確定真理値表）
 *
 * 判定順:
 *   1. 失注日 or stage=lost or status=lost → 'lost'
 *   2. 実効ステージ → STAGE_TO_TAB で変換
 */
export function tabOf(opp: Opportunity): StageTabKey7 {
  // 失注最優先（milestones.lostDate / stage / status）
  if (
    opp.stage === "lost" ||
    opp.status === "lost" ||
    opp.milestones?.lostDate != null
  ) {
    return "lost";
  }

  const effStage = effectiveStage(opp);
  return STAGE_TO_TAB[effStage];
}

// ─── 後方互換: isVisited（廃止・stageFromMilestones に吸収） ─────────────────────
/**
 * @deprecated ADR-B4 v2 で廃止。stageFromMilestones / tabOf を使うこと。
 * 後方互換のため残す（既存テスト参照あり）。
 * 初回相談日あり かつ 提案日なし → true。
 */
export function isVisited(opp: Opportunity): boolean {
  const m = opp.milestones;
  const hasFirstConsult = m?.firstConsultDate != null;
  const notProposedYet = latestProposalDate(opp) == null;
  return hasFirstConsult && notProposedYet;
}
