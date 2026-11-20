// =====================================================
// ContractDetailSubComponents.tsx — S7ContractDetail 子UIコンポーネント
// =====================================================

import type { SalesContract } from "../../types";
import type { SortKey, SortDir } from "./contractDetailTypes";
import { confidenceLabel } from "./contractDetailHelpers";

// ----------------------------------------
// ソートヘッダーボタン
// ----------------------------------------
interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  align?: "left" | "right" | "center";
}

export function SortHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  align = "left",
}: SortHeaderProps) {
  const isActive = currentKey === sortKey;
  const arrow = isActive ? (currentDir === "asc" ? " ▲" : " ▼") : "";
  const alignClass =
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

  return (
    <th
      className={`px-2 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 ${alignClass}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {arrow && <span className="text-blue-500 text-[10px]">{arrow}</span>}
    </th>
  );
}

// ----------------------------------------
// ライン表示
// ----------------------------------------
export function LineBadge({ line }: { line: SalesContract["line"] }) {
  if (line === "life") {
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
        生
      </span>
    );
  }
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700">
      損
    </span>
  );
}

// ----------------------------------------
// 確度バッジ
// ----------------------------------------
const CONFIDENCE_COLOR_MAP: Record<string, string> = {
  確定: "bg-green-100 text-green-700",
  S: "bg-blue-100 text-blue-700",
  A: "bg-cyan-100 text-cyan-700",
  B: "bg-yellow-100 text-yellow-700",
  C: "bg-orange-100 text-orange-700",
  D: "bg-red-100 text-red-700",
  初見: "bg-gray-100 text-gray-600",
  不明: "bg-gray-100 text-gray-400",
};

export function ConfidenceBadge({ contract }: { contract: SalesContract }) {
  const label = confidenceLabel(contract);
  const cls = CONFIDENCE_COLOR_MAP[label] ?? "bg-gray-100 text-gray-500";
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

// ----------------------------------------
// CSV エクスポートボタン(将来用・非活性)
// ----------------------------------------
export function CsvExportButton() {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title="CSV エクスポートは将来実装予定"
      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded border border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed opacity-60"
    >
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 16 16"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 10.5v2h8v-2M8 2v7m0 0-2.5-2.5M8 9l2.5-2.5"
        />
      </svg>
      CSV エクスポート
      <span className="text-[9px] text-gray-300 ml-0.5">(将来)</span>
    </button>
  );
}

// ----------------------------------------
// 空状態
// ----------------------------------------
export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <svg
        className="w-10 h-10 mb-3 opacity-30"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h5l2 2h3a2 2 0 012 2v2"
        />
      </svg>
      <p className="text-sm">該当する契約データがありません</p>
      <p className="text-xs mt-1 text-gray-300">
        フィルタ条件を確認してください
      </p>
    </div>
  );
}
