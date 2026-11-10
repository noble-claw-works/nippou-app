import { ChevronUp, ChevronDown } from "lucide-react";
import type { SortKey } from "./constants";

export function SortIcon({
  k,
  sortKey,
  sortAsc,
}: {
  k: SortKey;
  sortKey: SortKey;
  sortAsc: boolean;
}) {
  if (sortKey !== k) return <ChevronDown className="w-3 h-3 text-gray-300" />;
  return sortAsc ? (
    <ChevronUp className="w-3 h-3 text-blue-500" />
  ) : (
    <ChevronDown className="w-3 h-3 text-blue-500" />
  );
}
