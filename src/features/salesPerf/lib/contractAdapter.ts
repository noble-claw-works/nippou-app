// =====================================================
// contractAdapter.ts — 本体 Opportunity/Policy → SalesContractRaw 派生
// 既存の normalizeAll() に渡す入口データを本体ストアから生成する純関数群。
// 既存の salesPerfMetrics* / contractNormalize には一切変更を加えない。
// =====================================================
import type { Opportunity, Policy, User, Team } from "../../../types";
import type { SalesContractRaw, SalesLine } from "../types";
import {
  LIFE_CATEGORIES,
  NONLIFE_CATEGORIES,
  type ProductCategory,
  type ConfidenceUnified,
  type ContractMilestones,
} from "../../../types";

// =====================================================
// アダプタ呼出時に渡すコンテキスト
// =====================================================

export interface AdapterContext {
  fiscalYear: number;
  users: User[];
  teams: Team[];
}

// =====================================================
// 補助純関数（各 10〜30 行）
// =====================================================

/**
 * ProductCategory → SalesLine ('life' | 'nonlife')
 */
export function categoryToLine(cat: ProductCategory): SalesLine {
  if ((LIFE_CATEGORIES as ProductCategory[]).includes(cat)) return "life";
  if ((NONLIFE_CATEGORIES as ProductCategory[]).includes(cat)) return "nonlife";
  return "life"; // other は life 扱い
}

/**
 * ConfidenceUnified → seed 表記文字列（既存 normalizeConfidence が食べる形式）
 */
export function confidenceUnifiedToRaw(c?: ConfidenceUnified): string {
  if (!c) return "B"; // 未設定 → 中間値
  // seed 表記は日本語: fixed="確定" S="S" A="A" B="B" C="C" D="D" first="初見"
  const MAP: Record<ConfidenceUnified, string> = {
    fixed: "確定",
    S: "S",
    A: "A",
    B: "B",
    C: "C",
    D: "D",
  };
  return MAP[c] ?? "B";
}

/**
 * ContractMilestones → 成立日候補 (establishedDate || contractDate)
 * 優先順: milestones.establishedDate → milestones.contractDate → undefined
 */
export function milestoneToEstablished(
  m?: ContractMilestones,
): string | undefined {
  return m?.establishedDate ?? m?.contractDate ?? undefined;
}

/**
 * ContractMilestones → 申込日候補
 */
export function milestoneToApplication(
  m?: ContractMilestones,
): string | undefined {
  return m?.applicationDate ?? undefined;
}

/**
 * Opportunity → ファネルフラグを milestone 有無から導出
 */
export function funnelFlagsFromOpp(opp: Opportunity): {
  had_meeting: boolean;
  had_lifeplan: boolean;
  had_proposal: boolean;
  policy_collected: boolean;
} {
  const m = opp.milestones;
  return {
    had_meeting: !!m?.firstConsultDate,
    had_lifeplan: !!m?.lifePlanDate,
    had_proposal: !!m?.proposalDate,
    policy_collected: false, // Policy 発行 = policyCollected; Opp 段階では未発行
  };
}

/**
 * ownerId の所属チームのうち最初の id を group_id とする。
 */
function groupIdFor(ownerId: string, users: User[], teams: Team[]): string {
  const user = users.find((u) => u.id === ownerId);
  if (!user || user.teamIds.length === 0) return "";
  const teamId = user.teamIds[0];
  return teams.find((t) => t.id === teamId)?.id ?? teamId;
}

/**
 * ProposalProduct.insurer → 保険会社名（そのまま流用）
 * channel は Opportunity.channelId を文字列として流用。
 */
function channelLabel(opp: Opportunity): string {
  return opp.channelId ?? "紹介";
}

// =====================================================
// 変換関数
// =====================================================

/**
 * 1件の Opportunity から proposalProducts 単位で SalesContractRaw[] を生成。
 * Policy 化済み opp を引数で渡し、そちらは重複排除で省く（§2.5）。
 */
export function opportunityToContractRaws(
  opp: Opportunity,
  ctx: AdapterContext,
  policySourceOppIds: Set<string>,
): SalesContractRaw[] {
  // Policy 化済みの場合は Policy 側を使う（二重計上防止）
  if (policySourceOppIds.has(opp.id)) return [];

  // lost / won で成立済みは Policy 側で扱う
  if (opp.status === "lost") return [];

  return opp.proposalProducts.map((pp, i) => {
    const line = categoryToLine(pp.productCategory);
    // 成立日: 商品個別 milestones → 案件 milestones の順で優先
    const estDate =
      milestoneToEstablished(pp.milestones) ??
      milestoneToEstablished(opp.milestones);
    const appDate =
      milestoneToApplication(pp.milestones) ??
      milestoneToApplication(opp.milestones);
    const flags = funnelFlagsFromOpp(opp);

    // 概算手数料: firstYearCommission があれば使用、なければ月払×12×15%
    const commission =
      pp.firstYearCommission ?? Math.round(pp.monthlyPremium * 12 * 0.15);

    return {
      id: `${opp.id}_pp${i}`,
      line,
      fiscal_year: ctx.fiscalYear,
      owner_id: opp.ownerId, // u1..u6 統一
      group_id: groupIdFor(opp.ownerId, ctx.users, ctx.teams),
      channel: channelLabel(opp),
      partner: "直接",
      insurer: pp.insurer || "未分類",
      product_type: pp.productName || pp.productCategory,
      monthly_premium: pp.monthlyPremium,
      first_year_commission: commission,
      confidence: confidenceUnifiedToRaw(opp.confidence),
      application_date: appDate,
      established_date: estDate,
      had_meeting: flags.had_meeting,
      had_lifeplan: flags.had_lifeplan,
      policy_collected: flags.policy_collected,
      had_proposal: flags.had_proposal,
      household_id: opp.householdId,
    };
  });
}

/**
 * 1件の Policy から SalesContractRaw を生成（確定成立の正本）。
 */
export function policyToContractRaw(
  policy: Policy,
  ctx: AdapterContext,
): SalesContractRaw {
  const line = categoryToLine(policy.productCategory);
  const commission = Math.round(policy.monthlyPremium * 12 * 0.15);
  return {
    id: `pol_${policy.id}`,
    line,
    fiscal_year: ctx.fiscalYear,
    owner_id: policy.ownerId,
    group_id: groupIdFor(policy.ownerId, ctx.users, ctx.teams),
    channel: "既存顧客深耕",
    partner: "直接",
    insurer: policy.insurer || "未分類",
    product_type: policy.productName || policy.productCategory,
    monthly_premium: policy.monthlyPremium,
    first_year_commission: commission,
    confidence: "確定",
    application_date: undefined,
    established_date: policy.startDate,
    had_meeting: true,
    had_lifeplan: false,
    policy_collected: true,
    had_proposal: true,
    household_id: policy.householdId,
  };
}

/**
 * 全体変換。
 * - policies を優先し、Policy 化していない open/確度付き opportunity を見込みとして加える。
 * - 重複排除: policy.sourceOpportunityId がある場合、その opp 由来の見込み raw は除外。
 */
export function buildSalesContractRaws(
  opportunities: Opportunity[],
  policies: Policy[],
  ctx: AdapterContext,
): SalesContractRaw[] {
  // Policy が参照している sourceOpportunityId を収集（二重計上防止 §2.5）
  const policySourceOppIds = new Set(
    policies
      .map((p) => p.sourceOpportunityId)
      .filter((id): id is string => !!id),
  );

  const policyRaws = policies.map((p) => policyToContractRaw(p, ctx));
  const oppRaws = opportunities.flatMap((opp) =>
    opportunityToContractRaws(opp, ctx, policySourceOppIds),
  );

  return [...policyRaws, ...oppRaws];
}

/**
 * 異常値サンプル（デモフラグ用）— 既定 OFF。
 * DEMO_ANOMALY_FLAG=true の場合のみ注入できるように export。
 */
export { SEED_CONTRACTS as ANOMALY_SEED_CONTRACTS } from "../data/seedContracts";
