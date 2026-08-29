import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Filter } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { useAppStore } from "../store";
import type { ProductCategory, Opportunity } from "../types";
import { StageBadge } from "../components/opportunity/StageBadge";
import { HouseholdAccordion } from "../components/ui/HouseholdAccordion";
import {
  effectiveStage,
  effectiveExpectedCloseDate,
  isRagged,
  householdActiveOpps,
  representativeOpp,
} from "../utils/opportunityStage";
import {
  STAGE_TABS,
  PRODUCT_CATEGORY_LABELS,
  type StageTabKey,
  type SortKey,
  type ViewMode,
} from "./opportunities/constants";
import { OpportunityTableHeader } from "./opportunities/OpportunityTableHeader";
import { OpportunityTableRow } from "./opportunities/OpportunityTableRow";
import { ProductView } from "./opportunities/ProductView";
import { useOpportunitiesFilter } from "./opportunities/useOpportunitiesFilter";

export function OpportunitiesPage() {
  const navigate = useNavigate();

  const { opportunities, customers, persons, currentUserId, currentRole } =
    useAppStore(
      useShallow((s) => ({
        opportunities: s.opportunities,
        customers: s.customers,
        persons: s.persons,
        currentUserId: s.currentUserId,
        currentRole: s.currentRole,
      })),
    );

  const [activeTab, setActiveTab] = useState<StageTabKey>("first_consult");
  const [ownerFilter] = useState<string>("all");
  const [openOnly, setOpenOnly] = useState(true);
  const [catFilter, setCatFilter] = useState<ProductCategory | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("contractor");
  const [sortAsc, setSortAsc] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("household");

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
    householdGroups,
    productGroups,
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

  const renderHouseholdMeta = useMemo(() => {
    return (householdId: string) => {
      const activeOpps = householdActiveOpps(visibleOpportunities, householdId);
      const repOpp = representativeOpp(activeOpps);
      if (!repOpp) return null;
      const effStage = effectiveStage(repOpp);
      const closeDate = effectiveExpectedCloseDate(repOpp);
      const ragged = isRagged(repOpp);
      return (
        <span className="flex items-center gap-1.5 ml-2 text-xs text-gray-600">
          <StageBadge stage={effStage} size="sm" />
          {closeDate && (
            <span className="text-gray-500 whitespace-nowrap">{closeDate}</span>
          )}
          {ragged && (
            <span
              title="商品間で進捗/日付が揃っていません。案件詳細で内訳を確認"
              className="text-amber-500"
            >
              ⚠️
            </span>
          )}
        </span>
      );
    };
  }, [visibleOpportunities]);

  const renderHouseholdActions = useMemo(() => {
    return (householdId: string) => {
      const activeOpps = householdActiveOpps(visibleOpportunities, householdId);
      const repOpp = representativeOpp(activeOpps);
      if (!repOpp) return null;
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/opportunities/${repOpp.id}/report`);
          }}
          className="min-h-[44px] min-w-[44px] flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
        >
          📝 報告
        </button>
      );
    };
  }, [visibleOpportunities, navigate]);

  const renderTableHeader = () => (
    <OpportunityTableHeader
      sortKey={sortKey}
      sortAsc={sortAsc}
      onSort={handleSort}
    />
  );

  const renderItem = (opp: Opportunity) => (
    <OpportunityTableRow
      key={opp.id}
      opp={opp}
      getContractorName={getContractorName}
      onNavigate={(id) => navigate(`/opportunities/${id}`)}
    />
  );

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
                : "（全件）"}{" "}
            /{" "}
            {viewMode === "household"
              ? `${householdGroups.length} 世帯`
              : `${productGroups.length} カテゴリ`}
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
            onClick={() => setShowQuickAdd(true)}
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

      {/* View mode toggle */}
      <div className="flex items-center justify-between mb-3 mt-2">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          {(["household", "product"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === mode
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {mode === "household" ? "🏠 世帯別" : "📦 商品別"}
            </button>
          ))}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
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

      {/* Main content */}
      {viewMode === "household" ? (
        <HouseholdAccordion
          groups={householdGroups}
          allOpenDefault={true}
          renderItem={renderItem}
          renderTableHeader={renderTableHeader}
          colSpan={7}
          itemLabel="商談"
          emptyMessage="該当する案件がありません"
          renderHouseholdMeta={renderHouseholdMeta}
          renderHouseholdActions={renderHouseholdActions}
        />
      ) : (
        <ProductView
          groups={productGroups}
          getContractorName={getContractorName}
        />
      )}

      {/* Quick add modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">
              世帯を選択して案件を作成
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {customers
                .filter((c) => c.status === "active")
                .map((c) => (
                  <button
                    key={c.id}
                    className="w-full text-left px-3 py-2 border border-gray-200 rounded-lg hover:bg-blue-50 text-sm"
                    onClick={() => setShowQuickAdd(false)}
                  >
                    {c.name}
                  </button>
                ))}
            </div>
            <button
              onClick={() => setShowQuickAdd(false)}
              className="mt-3 w-full px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
