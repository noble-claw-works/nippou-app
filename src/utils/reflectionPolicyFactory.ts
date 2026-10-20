// =====================================================
// reflectionPolicyFactory.ts — Doc4 反映: 商品行→Policy 生成の純関数（§T4-03）
// issuePoliciesFromOpportunity と reflectOpportunityToPolicies で共有。
// id 生成は注入（決定性テスト用）。coverage の主契約 faceAmount も生成。
// =====================================================
import type {
  Coverage,
  CoverageType,
  Opportunity,
  Policy,
  ProductCategory,
  ProposalProduct,
} from "../types";

/** productCategory → 主契約 coverage type のマッピング */
export function mainCoverageType(cat: ProductCategory): CoverageType {
  switch (cat) {
    case "life":
      return "death";
    case "medical":
      return "medical_hospital";
    case "cancer":
      return "cancer";
    case "income":
      return "disability";
    case "nursing":
      return "nursing";
    case "savings":
      return "savings";
    default:
      return "other";
  }
}

/**
 * 商品行(ProposalProduct)から新規「申込中(pending)」Policy を生成する純関数。
 * @param genId id 生成関数（uid を注入）
 */
export function buildNewPolicyFromProduct(
  opp: Opportunity,
  pp: ProposalProduct,
  userId: string,
  now: string,
  genId: () => string,
): Policy {
  const policyId = genId();
  const fallbackInsured = pp.insuredPersonId || (opp.targetPersonIds[0] ?? "");
  const policy: Policy = {
    id: policyId,
    householdId: opp.householdId,
    ownerId: userId,
    contractorPersonId: fallbackInsured,
    insuredPersonIds: pp.insuredPersonId
      ? [pp.insuredPersonId]
      : opp.targetPersonIds,
    insurer: pp.insurer,
    productName: pp.productName,
    productCategory: pp.productCategory as ProductCategory,
    status: "pending",
    startDate: now.slice(0, 10),
    monthlyPremium: pp.monthlyPremium,
    payMode: "monthly",
    hasCashValue: ["life", "savings", "nursing"].includes(pp.productCategory),
    sourceOpportunityId: opp.id,
    coverages: [],
    tags: [],
    memo: pp.memo ?? "",
    createdAt: now,
    updatedAt: now,
  };
  if (pp.faceAmount) {
    const cov: Coverage = {
      id: genId(),
      policyId,
      type: mainCoverageType(pp.productCategory as ProductCategory),
      label: pp.productName,
      faceAmount: pp.faceAmount,
      unit: "JPY",
      insuredPersonId: fallbackInsured,
      isMain: true,
      memo: "",
    };
    policy.coverages = [cov];
  }
  return policy;
}

/**
 * §T4-06 Before/After 見込算出用の純関数（state 非変更）。
 * 現在の世帯契約(before)に対し、商談明細の reflection(mode)を適用した
 * 「見込(after)」Policy 配列を返す。new=追加 / existing_change=置換 / none=無視。
 * resultPolicyId 既反映分は after 側で二重計上しない（before に既に含まれるため skip）。
 */
export function projectReflectedPolicies(
  opp: Opportunity,
  householdPolicies: Policy[],
  userId: string,
  now: string,
  genId: () => string,
): Policy[] {
  // before のコピー（existing_change はこの中を置換）
  const byId = new Map(householdPolicies.map((p) => [p.id, p]));
  const added: Policy[] = [];
  for (const pp of opp.proposalProducts ?? []) {
    const mode = pp.reflection?.mode ?? "new";
    if (mode === "none") continue;
    // 既に反映済みなら before に含まれるので二重計上しない
    if (pp.reflection?.resultPolicyId && byId.has(pp.reflection.resultPolicyId)) {
      continue;
    }
    if (mode === "existing_change") {
      const targetId = pp.reflection?.targetPolicyId;
      if (!targetId || !byId.has(targetId)) continue;
      const before = byId.get(targetId)!;
      byId.set(targetId, {
        ...before,
        insurer: pp.insurer,
        productName: pp.productName,
        productCategory: pp.productCategory as ProductCategory,
        monthlyPremium: pp.monthlyPremium,
        status: "pending",
      });
    } else {
      added.push(buildNewPolicyFromProduct(opp, pp, userId, now, genId));
    }
  }
  return [...byId.values(), ...added];
}
