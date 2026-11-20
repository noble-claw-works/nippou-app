import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Filter } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { useAppStore } from "../store";
import type { ProductCategory, Opportunity } from "../types";
import {
  STAGE_TABS,
  PRODUCT_CATEGORY_LABELS,
  type StageTabKey,
  type SortKey,
} from "./opportunities/constants";
import { OpportunityCard } from "./opportunities/OpportunityCard";
import { useOpportunitiesFilter } from "./opportunities/useOpportunitiesFilter";

export function OpportunitiesPage() {
  const navigate = useNavigate();

  const {
    opportunities,
    customers,
    persons,
    users,
    currentUserId,
    currentRole,
    toggleOppTaskDone,
  } = useAppStore(
    useShallow((s) => ({
      opportunities: s.opportunities,
      customers: s.customers,
      persons: s.persons,
      users: s.users,
      currentUserId: s.currentUserId,
      currentRole: s.currentRole,
      toggleOppTaskDone: s.toggleOppTaskDone,
    })),
  );

  const [activeTab, setActiveTab] = useState<StageTabKey>("first_consult");
  const [ownerFilter] = useState<string>("all");
  const [openOnly, setOpenOnly] = useState(true);
  const [catFilter, setCatFilter] = useState<ProductCategory | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("contractor");
  const [sortAsc, setSortAsc] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const isLostTab = activeTab === "lost";

  // Role-based filtering
  const visibleOpportunities = useMemo(() => {
    return opportunities.filter((o) => {
      if (currentRole === "general") return o.ownerId === currentUserId;
      return true;
    });
  }, [opportunities, currentRole, currentUserId]);

  const {
    filtered,
    tabCounts,
    getContractorName,
  } = useOpportunitiesFilter({
    opportunities: visibleOpportunities,
    persons,
    customers,
    activeTab,
    openOnly,
    ownerFilter,
    catFilter,
    sortKey,
    sortAsc,
    isLostTab,
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  // suppress unused warning for handleSort (kept for future sort UI)
  void handleSort;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">🤝 商談案件</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} 件表示
            {isLostTab
              ? "（失注・全期間）"
              : openOnly
                ? "（進行中のみ）"
                : "（全件）"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg ${showFilters ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
          >
            <Filter className="w-4 h-4" />
            フィルタ
          </button>
          <button
            onClick={() => navigate("/opportunities/new")}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            新規案件
          </button>
        </div>
      </div>

      {/* Stage tabs */}
      <div className="mb-1">
        <div className="flex overflow-x-auto scrollbar-none border-b border-gray-200 gap-0">
          {STAGE_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tabCounts[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px",
                  isActive
                    ? "border-blue-500 text-blue-600 bg-blue-50/60"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50",
                ].join(" ")}
              >
                <span>{tab.label}</span>
                <span
                  className={[
                    "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold",
                    isActive
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-600",
                  ].join(" ")}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
          <label className="flex items-center gap-2 col-span-2 md:col-span-1">
            <input
              type="checkbox"
              checked={openOnly}
              onChange={(e) => setOpenOnly(e.target.checked)}
              className="rounded"
              disabled={isLostTab}
            />
            <span
              className={`text-sm ${isLostTab ? "text-gray-400" : "text-gray-700"}`}
            >
              進行中のみ{isLostTab ? "（失注タブは無効）" : ""}
            </span>
          </label>
          <div>
            <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              value={catFilter}
              onChange={(e) =>
                setCatFilter(e.target.value as ProductCategory | "all")
              }
            >
              <option value="all">すべて</option>
              {(
                Object.entries(PRODUCT_CATEGORY_LABELS) as [
                  ProductCategory,
                  string,
                ][]
              ).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Card list */}
      <div className="mt-3">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">
            該当する案件がありません
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((opp: Opportunity) => (
              <OpportunityCard
                key={opp.id}
                opp={opp}
                users={users}
                getContractorName={getContractorName}
                onNavigate={(id) => navigate(`/opportunities/${id}`)}
                onToggleTask={(oppId, taskId, done) =>
                  toggleOppTaskDone(oppId, taskId, done)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
