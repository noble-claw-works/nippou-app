import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Filter, ChevronUp, ChevronDown } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { useAppStore } from "../store";
import type { OpportunityStage, ProductCategory } from "../types";
import { StageBadge } from "../components/opportunity/StageBadge";
import { HouseholdAccordion } from "../components/ui/HouseholdAccordion";
import { groupByHousehold } from "../utils/groupByHousehold";
import type { Opportunity } from "../types";

// ─── タブ定義（確定仕様 2026-07-28） ─────────────────────────────────────────
// 既存 OpportunityStage（9値）を「表示グループ」としてまとめる。型・seed・他コンポは変更しない。

type StageTabKey =
  "new" | "proposed" | "contract_pending" | "contract" | "issued" | "lost";

interface StageTab {
  key: StageTabKey;
  label: string;
  stages: OpportunityStage[];
}

const STAGE_TABS: StageTab[] = [
  {
    key: "new",
    label: "新案件",
    stages: ["approach", "fact_finding", "needs_analysis"],
  },
  { key: "proposed", label: "提案済み", stages: ["proposal", "negotiation"] },
  { key: "contract_pending", label: "契約予定", stages: ["application"] },
  { key: "contract", label: "契約", stages: ["underwriting"] },
  { key: "issued", label: "成立", stages: ["issued"] },
  { key: "lost", label: "失注", stages: ["lost"] },
];

/** ステージ → タブキー逆引き */
const STAGE_TO_TAB: Record<OpportunityStage, StageTabKey> = Object.fromEntries(
  STAGE_TABS.flatMap((tab) => tab.stages.map((s) => [s, tab.key])),
) as Record<OpportunityStage, StageTabKey>;

// ─── SortIcon コンポーネント（レンダー内定義を回避するためコンポーネント外部に定義） ──
type SortKey =
  | "stage"
  | "expectedCloseDate"
  | "totalMonthlyPremium"
  | "updatedAt"
  | "contractor";

function SortIcon({
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

// =====================================================
// OpportunitiesPage — 商談案件一覧（世帯1段グループ化）
// =====================================================

const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  life: "生命保険",
  medical: "医療保険",
  cancer: "がん保険",
  income: "就業不能保険",
  nursing: "介護保険",
  savings: "学資・貯蓄",
  auto: "自動車保険",
  fire: "火災保険",
  liability: "賠償責任保険",
  other: "その他",
};

const STAGE_ORDER: OpportunityStage[] = [
  "approach",
  "fact_finding",
  "needs_analysis",
  "proposal",
  "negotiation",
  "application",
  "underwriting",
  "issued",
  "lost",
];

export function OpportunitiesPage() {
  const navigate = useNavigate();

  // useShallow で無限ループ防止（React#185対策）
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

  const [activeTab, setActiveTab] = useState<StageTabKey>("new");
  const [ownerFilter] = useState<string>("all");
  const [openOnly, setOpenOnly] = useState(true);
  const [catFilter, setCatFilter] = useState<ProductCategory | "all">("all");
  // 既定ソートを契約者(contractor)昇順に（主上修正指示2026-07-12）
  const [sortKey, setSortKey] = useState<SortKey>("contractor");
  const [sortAsc, setSortAsc] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Role-based filtering
  const visibleOpportunities = useMemo(() => {
    return opportunities.filter((o) => {
      if (currentRole === "general") return o.ownerId === currentUserId;
      if (currentRole === "manager") {
        // Simplified: manager sees self + teammates (use all for demo)
        return true;
      }
      return true; // executive/admin sees all
    });
  }, [opportunities, currentRole, currentUserId]);

  // 契約者名を取得するヘルパー（ソート・表示共用）
  const getContractorName = useMemo(() => {
    return (contractorPersonId: string | undefined): string => {
      if (!contractorPersonId) return "";
      return persons.find((p) => p.id === contractorPersonId)?.name ?? "";
    };
  }, [persons]);

  // 世帯名を取得するヘルパー
  const getHouseholdName = useMemo(() => {
    return (householdId: string): string =>
      customers.find((c) => c.id === householdId)?.name ?? householdId;
  }, [customers]);

  // 失注タブは openOnly を無視（lost は status!=='open' のため空になるのを防ぐ）
  const isLostTab = activeTab === "lost";

  /** 各タブの件数バッジ計算（カテゴリフィルタ適用後。openOnly扱いはタブと一致させる） */
  const tabCounts = useMemo(() => {
    const counts: Record<StageTabKey, number> = {
      new: 0,
      proposed: 0,
      contract_pending: 0,
      contract: 0,
      issued: 0,
      lost: 0,
    };
    for (const o of visibleOpportunities) {
      if (catFilter !== "all" && !o.productCategories.includes(catFilter))
        continue;
      const tabKey = STAGE_TO_TAB[o.stage];
      if (!tabKey) continue;
      // 失注タブは openOnly 無視。他は openOnly に従う
      if (tabKey !== "lost" && openOnly && o.status !== "open") continue;
      counts[tabKey]++;
    }
    return counts;
  }, [visibleOpportunities, catFilter, openOnly]);

  const filtered = useMemo(() => {
    let list = [...visibleOpportunities];
    // 失注タブは openOnly 無視。他タブは従来通り
    if (!isLostTab && openOnly) list = list.filter((o) => o.status === "open");
    // タブに対応するステージのみ表示
    const tabStages = new Set(
      STAGE_TABS.find((t) => t.key === activeTab)?.stages ?? [],
    );
    list = list.filter((o) => tabStages.has(o.stage));
    if (ownerFilter !== "all")
      list = list.filter((o) => o.ownerId === ownerFilter);
    if (catFilter !== "all")
      list = list.filter((o) => o.productCategories.includes(catFilter));

    list.sort((a, b) => {
      let cmp: number;
      if (sortKey === "stage") {
        cmp = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage);
      } else if (sortKey === "expectedCloseDate") {
        cmp = (a.expectedCloseDate ?? "9999").localeCompare(
          b.expectedCloseDate ?? "9999",
        );
      } else if (sortKey === "totalMonthlyPremium") {
        cmp = (b.totalMonthlyPremium ?? 0) - (a.totalMonthlyPremium ?? 0);
      } else if (sortKey === "contractor") {
        const nameA = getContractorName(a.contractorPersonId);
        const nameB = getContractorName(b.contractorPersonId);
        // 未設定は末尾
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
    visibleOpportunities,
    openOnly,
    isLostTab,
    activeTab,
    ownerFilter,
    catFilter,
    sortKey,
    sortAsc,
    getContractorName,
  ]);

  // 世帯1段グループ化（フィルタ後。世帯名昇順・世帯内は上記ソート順を維持）
  const householdGroups = useMemo(() => {
    return groupByHousehold(
      filtered,
      (o: Opportunity) => o.householdId,
      getHouseholdName,
    );
  }, [filtered, getHouseholdName]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const renderTableHeader = () => (
    <tr>
      <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
        契約者
      </th>
      <th className="px-4 py-3 text-left font-medium text-gray-600">案件名</th>
      <th
        className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer whitespace-nowrap select-none"
        onClick={() => handleSort("stage")}
      >
        <span className="flex items-center gap-1">
          ステージ <SortIcon k="stage" sortKey={sortKey} sortAsc={sortAsc} />
        </span>
      </th>
      <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">
        カテゴリ
      </th>
      <th
        className="px-4 py-3 text-right font-medium text-gray-600 cursor-pointer whitespace-nowrap select-none hidden md:table-cell"
        onClick={() => handleSort("totalMonthlyPremium")}
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
        次アクション
      </th>
      <th
        className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer whitespace-nowrap select-none hidden lg:table-cell"
        onClick={() => handleSort("expectedCloseDate")}
      >
        <span className="flex items-center gap-1">
          期日{" "}
          <SortIcon k="expectedCloseDate" sortKey={sortKey} sortAsc={sortAsc} />
        </span>
      </th>
    </tr>
  );

  const renderItem = (opp: Opportunity) => (
    <tr
      key={opp.id}
      className="hover:bg-gray-50 cursor-pointer"
      onClick={() => navigate(`/opportunities/${opp.id}`)}
    >
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap pl-8">
        {getContractorName(opp.contractorPersonId) || (
          <span className="text-gray-300">契約者未設定</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="font-medium text-gray-800">{opp.title}</span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <StageBadge stage={opp.stage} size="sm" />
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <div className="flex flex-wrap gap-1">
          {opp.productCategories.map((cat) => (
            <span
              key={cat}
              className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
            >
              {PRODUCT_CATEGORY_LABELS[cat]}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap hidden md:table-cell">
        {opp.totalMonthlyPremium
          ? `¥${opp.totalMonthlyPremium.toLocaleString()}`
          : "—"}
      </td>
      <td className="px-4 py-3 text-gray-600 hidden lg:table-cell max-w-[180px] truncate">
        {opp.nextAction ?? "—"}
      </td>
      <td className="px-4 py-3 text-gray-600 whitespace-nowrap hidden lg:table-cell">
        {opp.expectedCloseDate ?? "—"}
      </td>
    </tr>
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
            / {householdGroups.length} 世帯
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

      {/* ── タブ（カンバン風 6タブ） ───────────────────────────────────────── */}
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

      {/* 世帯1段グループ化アコーディオン */}
      <HouseholdAccordion
        groups={householdGroups}
        allOpenDefault={true}
        renderItem={renderItem}
        renderTableHeader={renderTableHeader}
        colSpan={7}
        itemLabel="商談"
        emptyMessage="該当する案件がありません"
      />

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
