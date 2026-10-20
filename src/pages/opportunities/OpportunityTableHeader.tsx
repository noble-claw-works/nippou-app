import type { SortKey } from "./constants";
import { SortIcon } from "./SortIcon";

interface OpportunityTableHeaderProps {
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
}

export function OpportunityTableHeader({
  sortKey,
  sortAsc,
  onSort,
}: OpportunityTableHeaderProps) {
  return (
    <tr>
      <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
        契約者
      </th>
      <th className="px-4 py-3 text-left font-medium text-gray-600">案件名</th>
      <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">
        カテゴリ
      </th>
      <th
        className="px-4 py-3 text-right font-medium text-gray-600 cursor-pointer whitespace-nowrap select-none hidden md:table-cell"
        onClick={() => onSort("totalMonthlyPremium")}
      >
        <span className="flex items-center justify-end gap-1">
          月払{" "}
          <SortIcon
            k="totalMonthlyPremium"
            sortKey={sortKey}
            sortAsc={sortAsc}
          />
        </span>
      </th>
      <th className="px-4 py-3 text-left font-medium text-gray-600 hidden lg:table-cell">
        タスク
      </th>
      <th className="px-4 py-3 text-left font-medium text-gray-600 hidden lg:table-cell">
        次アクション
      </th>
      <th
        className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer whitespace-nowrap select-none hidden lg:table-cell"
        onClick={() => onSort("expectedCloseDate")}
      >
        <span className="flex items-center gap-1">
          期日{" "}
          <SortIcon k="expectedCloseDate" sortKey={sortKey} sortAsc={sortAsc} />
        </span>
      </th>
    </tr>
  );
}
