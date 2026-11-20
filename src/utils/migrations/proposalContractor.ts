// =====================================================
// proposalContractor.ts — D4: 提案商品の契約者欠落を読み込み時に補完（冪等）
// 契約者が未設定の提案商品に、案件の契約者 → 世帯の世帯主 → 世帯の最初の構成員 の順で補う。
// 補完できない（世帯も構成員も不明）ものはそのまま。既に設定済みのものは触らない。
// =====================================================
import type { Customer, Opportunity, Person } from "../../types";

export function backfillProposalContractors(
  opps: Opportunity[],
  customers: Pick<Customer, "id" | "headPersonId">[],
  persons: Pick<Person, "id" | "householdId">[],
): Opportunity[] {
  let changed = false;
  const out = opps.map((o) => {
    const products = o.proposalProducts;
    if (!products || !products.some((p) => !p.contractorPersonId)) return o;
    const head = customers.find((c) => c.id === o.householdId)?.headPersonId;
    const first = persons.find((p) => p.householdId === o.householdId)?.id;
    const fallback = o.contractorPersonId ?? head ?? first;
    if (!fallback) return o;
    changed = true;
    return {
      ...o,
      proposalProducts: products.map((p) =>
        p.contractorPersonId ? p : { ...p, contractorPersonId: fallback },
      ),
    };
  });
  return changed ? out : opps;
}
