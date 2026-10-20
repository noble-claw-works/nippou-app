// =====================================================
// useHouseholdDetail — 世帯詳細ページの派生データ計算フック
// HouseholdDetailPage から useMemo 群を抽出
// =====================================================
import { useMemo } from "react";
import type { Customer, Person, Opportunity, Policy } from "../../types";
import type { DailyReport } from "../../types";
import type { CustomerInteraction } from "../../types";
import { RELATION_ORDER } from "./helpers";
import type { TimelineEntry } from "./HouseholdTimelineBody";

interface UseHouseholdDetailParams {
  customerId: string | undefined;
  customer: Customer | undefined;
  persons: Person[];
  reports: DailyReport[];
  opportunities: Opportunity[];
  policies: Policy[];
  customerInteractions: CustomerInteraction[];
  getPoliciesByHousehold: (
    householdId: string,
    options?: { activeOnly?: boolean },
  ) => Policy[];
}

export interface HouseholdDetailData {
  householdPersons: Person[];
  historyEntries: TimelineEntry[];
  householdOpportunities: Opportunity[];
  householdPolicies: Policy[];
  householdInteractions: CustomerInteraction[];
  activePolicies: Policy[];
  closedPolicies: Policy[];
  totalMonthlyPremium: number;
}

export function useHouseholdDetail({
  customerId,
  customer,
  persons,
  reports,
  opportunities,
  policies,
  customerInteractions,
  getPoliciesByHousehold,
}: UseHouseholdDetailParams): HouseholdDetailData {
  const householdPersons = useMemo(
    () =>
      customer
        ? persons
            .filter((p) => p.householdId === customerId)
            .sort(
              (a, b) =>
                (RELATION_ORDER[a.relation] ?? 9) -
                (RELATION_ORDER[b.relation] ?? 9),
            )
        : [],
    [persons, customerId, customer],
  );

  const historyEntries = useMemo<TimelineEntry[]>(() => {
    if (!customer) return [];
    const entries: TimelineEntry[] = [];
    for (const r of reports) {
      for (const b of r.blocks) {
        if (b.customerId === customerId) {
          entries.push({
            reportId: r.id,
            reportDate: r.date,
            reportUserId: r.userId,
            block: b,
          });
        }
      }
    }
    entries.sort((a, b) => {
      if (a.reportDate !== b.reportDate)
        return a.reportDate < b.reportDate ? 1 : -1;
      return (a.block.startTime || "") < (b.block.startTime || "") ? 1 : -1;
    });
    return entries;
  }, [reports, customerId, customer]);

  const householdOpportunities = useMemo(
    () =>
      customer ? opportunities.filter((o) => o.householdId === customerId) : [],
    [opportunities, customerId, customer],
  );

  /* eslint-disable react-hooks/exhaustive-deps */
  const householdPolicies = useMemo(
    () => (customerId ? getPoliciesByHousehold(customerId) : []),
    [policies, customerId],
  );
  /* eslint-enable react-hooks/exhaustive-deps */

  const householdInteractions = useMemo(
    () =>
      customerId
        ? customerInteractions
            .filter((i) => i.householdId === customerId)
            .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
        : [],
    [customerInteractions, customerId],
  );

  const activePolicies = useMemo(
    () =>
      householdPolicies.filter(
        (p) => p.status === "inforce" || p.status === "pending",
      ),
    [householdPolicies],
  );

  const closedPolicies = useMemo(
    () =>
      householdPolicies.filter(
        (p) => p.status !== "inforce" && p.status !== "pending",
      ),
    [householdPolicies],
  );

  const totalMonthlyPremium = useMemo(
    () =>
      activePolicies
        .filter((p) => p.status === "inforce")
        .reduce((s, p) => s + p.monthlyPremium, 0),
    [activePolicies],
  );

  return {
    householdPersons,
    historyEntries,
    householdOpportunities,
    householdPolicies,
    householdInteractions,
    activePolicies,
    closedPolicies,
    totalMonthlyPremium,
  };
}
