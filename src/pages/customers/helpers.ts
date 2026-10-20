import type { Customer } from "../../types";
import type { SortKey } from "./constants";

export function buildHistoryCountMap(
  reports: Array<{ blocks: Array<{ customerId?: string }> }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of reports) {
    for (const b of r.blocks) {
      if (b.customerId) map.set(b.customerId, (map.get(b.customerId) ?? 0) + 1);
    }
  }
  return map;
}

export function sortCustomers(
  customers: Customer[],
  sortKey: SortKey,
): Customer[] {
  return [...customers].sort((a, b) => {
    switch (sortKey) {
      case "name_asc":
        return a.name.localeCompare(b.name, "ja");
      case "name_desc":
        return b.name.localeCompare(a.name, "ja");
      case "lastContact_desc": {
        const av = a.lastContactDate ?? "";
        const bv = b.lastContactDate ?? "";
        if (av === bv) return a.name.localeCompare(b.name, "ja");
        return bv.localeCompare(av);
      }
      case "nextAppt_asc": {
        const av = a.nextAppointment ?? "9999-12-31";
        const bv = b.nextAppointment ?? "9999-12-31";
        if (av === bv) return a.name.localeCompare(b.name, "ja");
        return av.localeCompare(bv);
      }
      case "created_desc":
        return (b.id ?? "").localeCompare(a.id ?? "");
      default:
        return 0;
    }
  });
}

export function filterCustomers(
  customers: Customer[],
  query: string,
  typeFilter: string,
): Customer[] {
  return customers.filter((c) => {
    if (
      query &&
      !c.name.toLowerCase().includes(query.toLowerCase()) &&
      !c.area.toLowerCase().includes(query.toLowerCase())
    )
      return false;
    if (typeFilter && c.type !== typeFilter) return false;
    return true;
  });
}
