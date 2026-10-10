import { useMemo } from "react";
import type { Opportunity, ProductCategory, Person } from "../../types";
import {
  effectiveExpectedCloseDate,
  tabOf,
  householdActiveOpps,
  representativeOpp,
} from "../../utils/opportunityStage";
import { groupByHousehold } from "../../utils/groupByHousehold";
import { buildProductGroups } from "./productHelpers";
import type { SortKey, StageTabKey } from "./constants";

interface UseOpportunitiesFilterParams {
  opportunities: Opportunity[];
  persons: Person[];
  customers: Array<{ id: string; name: string; status: string }>;
  activeTab: StageTabKey;
  openOnly: boolean;
  ownerFilter: string;
  catFilter: ProductCategory | "all";
  sortKey: SortKey;
  sortAsc: boolean;
  isLostTab: boolean;
}

export function useOpportunitiesFilter({
  opportunities,
  persons,
  customers,
  activeTab,
  openOnly,
  ownerFilter,
  catFilter,
  sortKey,
  sortAsc,
  isLostTab,
}: UseOpportunitiesFilterParams) {
  const getContractorName = useMemo(() => {
    return (contractorPersonId: string | undefined): string => {
      if (!contractorPersonId) return "";
      return persons.find((p) => p.id === contractorPersonId)?.name ?? "";
    };
  }, [persons]);

  const getHouseholdName = useMemo(() => {
    return (householdId: string): string =>
      customers.find((c) => c.id === householdId)?.name ?? householdId;
  }, [customers]);

  const tabCounts = useMemo(() => {
    const counts: Record<StageTabKey, number> = {
      first_consult: 0,
      lifeplan: 0,
      proposed: 0,
      contract_pending: 0,
      contract: 0,
      issued: 0,
      lost: 0,
    };
    for (const o of opportunities) {
      if (catFilter !== "all" && !o.productCategories.includes(catFilter))
        continue;
      const tabKey = tabOf(o);
      if (tabKey !== "lost" && openOnly && o.status !== "open") continue;
      counts[tabKey]++;
    }
    return counts;
  }, [opportunities, catFilter, openOnly]);

  const filtered = useMemo(() => {
    let list = [...opportunities];
    if (!isLostTab && openOnly) list = list.filter((o) => o.status === "open");
    list = list.filter((o) => tabOf(o) === activeTab);
    if (ownerFilter !== "all")
      list = list.filter((o) => o.ownerId === ownerFilter);
    if (catFilter !== "all")
      list = list.filter((o) => o.productCategories.includes(catFilter));

    list.sort((a, b) => {
      let cmp: number;
      if (sortKey === "expectedCloseDate") {
        const da = effectiveExpectedCloseDate(a) ?? "9999";
        const db = effectiveExpectedCloseDate(b) ?? "9999";
        cmp = da.localeCompare(db);
      } else if (sortKey === "totalMonthlyPremium") {
        cmp = (b.totalMonthlyPremium ?? 0) - (a.totalMonthlyPremium ?? 0);
      } else if (sortKey === "contractor") {
        const nameA = getContractorName(a.contractorPersonId);
        const nameB = getContractorName(b.contractorPersonId);
        if (!nameA && !nameB) cmp = 0;
        else if (!nameA) cmp = 1;
        else if (!nameB) cmp = -1;
        else cmp = nameA.localeCompare(nameB, "ja");
      } else {
        cmp = b.updatedAt.localeCompare(a.updatedAt);
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [
    opportunities,
    openOnly,
    isLostTab,
    activeTab,
    ownerFilter,
    catFilter,
    sortKey,
    sortAsc,
    getContractorName,
  ]);

  const householdGroups = useMemo(() => {
    return groupByHousehold(
      filtered,
      (o: Opportunity) => o.householdId,
      getHouseholdName,
    );
  }, [filtered, getHouseholdName]);

  const productGroups = useMemo(() => {
    return buildProductGroups(filtered, catFilter);
  }, [filtered, catFilter]);

  const renderHouseholdMeta = useMemo(() => {
    return (householdId: string) => {
      const activeOpps = householdActiveOpps(opportunities, householdId);
      return representativeOpp(activeOpps);
    };
  }, [opportunities]);

  return {
    filtered,
    householdGroups,
    productGroups,
    tabCounts,
    getContractorName,
    renderHouseholdMeta,
  };
}
