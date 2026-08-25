import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Filter,
  ChevronUp,
  ChevronDown,
  CheckSquare,
} from "lucide-react";
import { useShallow } from "zustand/shallow";
import { useAppStore } from "../store";
import type { ProductCategory, Task } from "../types";
import { StageBadge } from "../components/opportunity/StageBadge";
import { HouseholdAccordion } from "../components/ui/HouseholdAccordion";
import { groupByHousehold } from "../utils/groupByHousehold";
import type { Opportunity } from "../types";
import {
  effectiveStage,
  effectiveExpectedCloseDate,
  isRagged,
  tabOf,
  householdActiveOpps,
  representativeOpp,
} from "../utils/opportunityStage";
import type { StageTabKey7 } from "../utils/opportunityStage";

// ─── 7タブ定義（ADR-B3 確定仕様 2026-08-06） ────────────────────────────────────
// 新案件/訪問済み/提案済み/契約予定/契約/成立/失注 の 7タブ。
// 件数は tabOf(opp) による案件単位カウント・商品数非依存。

type StageTabKey = StageTabKey7;

interface StageTab {
  key: StageTabKey;
  label: string;
}

const STAGE_TABS: StageTab[] = [
  { key: "first_consult", label: "初回相談" },
  { key: "lifeplan", label: "LP提案" },
  { key: "proposed", label: "提案" },
  { key: "contract_pending", label: "契約予定" },
  { key: "contract", label: "契約" },
  { key: "issued", label: "成立" },
  { key: "lost", label: "失注" },
];

// ─── ビュー切替 ──────────────────────────────────────────────────────────────
type ViewMode = "household" | "product";

// ─── SortIcon コンポーネント（レンダー内定義を回避するためコンポーネント外部に定義） ──
// 要件1 (ADR-B4 v2): ステージ列削除に伴い 'stage' キーを除去
type SortKey =
  "expectedCloseDate" | "totalMonthlyPremium" | "updatedAt" | "contractor";

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

// ─── タスク進捗バッジ（項目3） ─────────────────────────────────────────────────
// コンパクトなバッジ＋細い進捗バー + 展開式タスクリスト
// F2: タスク進捗バッジ（トグル剪除・進捗バーのみ）
interface TaskProgressProps {
  tasks: Task[];
}

function TaskProgressBadge({ tasks }: TaskProgressProps) {
  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="flex items-center gap-1.5">
      <CheckSquare className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      <span className="text-xs font-medium text-gray-500">
        {done}/{total}
      </span>
      {total > 0 && (
        <div className="flex-1 min-w-[40px] h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ─── タスクリスト展開パネル（항目3） ──────────────────────────────────────────
interface TaskListPreviewProps {
  tasks: Task[];
  onNavigate: () => void;
}

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  high: "高",
  medium: "中",
  low: "低",
};

function TaskListPreview({ tasks, onNavigate }: TaskListPreviewProps) {
  const [showDone, setShowDone] = useState(false);
  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const previewPending = pending.slice(0, 5);

  if (tasks.length === 0) {
    return (
      <div className="px-4 py-2 bg-gray-50 text-xs text-gray-400 border-t border-gray-100">
        タスクなし
      </div>
    );
  }

  return (
    <div
      className="bg-gray-50 border-t border-gray-100"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 未完了タスク（最大5件） */}
      {previewPending.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2 px-8 py-1.5 text-xs border-b border-gray-100 last:border-b-0"
        >
          <span className="w-3.5 h-3.5 rounded border border-gray-300 flex-shrink-0" />
          <span className="flex-1 text-gray-700 truncate">{t.title}</span>
          {t.dueDate && (
            <span className="text-gray-400 whitespace-nowrap">{t.dueDate}</span>
          )}
          <span className="text-gray-400 text-[10px]">
            {PRIORITY_LABEL[t.priority]}
          </span>
        </div>
      ))}
      {pending.length > 5 && (
        <div className="px-8 py-1 text-xs text-gray-400">
          他 {pending.length - 5} 件の未完了タスク
        </div>
      )}
      {/* 完了タスク（折りたたみ） */}
      {done.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-1 px-8 py-1.5 text-xs text-gray-500 hover:text-gray-700 w-full text-left border-t border-gray-100"
          >
            <ChevronDown
              className={`w-3 h-3 transition-transform ${showDone ? "rotate-180" : ""}`}
            />
            完了 {done.length} 件
          </button>
          {showDone &&
            done.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 px-8 py-1.5 text-xs border-b border-gray-100 last:border-b-0"
              >
                <span className="w-3.5 h-3.5 rounded border border-blue-400 bg-blue-400 flex-shrink-0 flex items-center justify-center text-white text-[8px]">
                  ✓
                </span>
                <span className="flex-1 text-gray-400 line-through truncate">
                  {t.title}
                </span>
              </div>
            ))}
        </>
      )}
      {/* 詳細リンク */}
      <div className="px-8 py-1.5 border-t border-gray-100">
        <button
          type="button"
          onClick={onNavigate}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          案件詳細でタスク管理 →
        </button>
      </div>
    </div>
  );
}

// =====================================================
// OpportunitiesPage — 商談案件一覧（世帯別/商品別ビュー切替）
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

// 商品カテゴリ別グループ（項目5）
interface ProductGroup {
  category: ProductCategory;
  label: string;
  items: Opportunity[];
}

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

  const [activeTab, setActiveTab] = useState<StageTabKey>("first_consult");
  const [ownerFilter] = useState<string>("all");
  const [openOnly, setOpenOnly] = useState(true);
  const [catFilter, setCatFilter] = useState<ProductCategory | "all">("all");
  // 既定ソートを契約者(contractor)昇順に（主上修正指示2026-07-12）
  const [sortKey, setSortKey] = useState<SortKey>("contractor");
  const [sortAsc, setSortAsc] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  // 項目5: ビュー切替
  const [viewMode, setViewMode] = useState<ViewMode>("household");
  // F2: タスク一覧は既定表示のため expandedTasks ステート削除

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

  /** 各タブの件数バッジ計算（ADR-B3: tabOf による案件単位カウント） */
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
    for (const o of visibleOpportunities) {
      if (catFilter !== "all" && !o.productCategories.includes(catFilter))
        continue;
      const tabKey = tabOf(o);
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
    // tabOf(opp) でアクティブタブに一致する案件のみ表示（ADR-B3: 実効ステージベース）
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

  // 項目5: 商品別グループ化（1案件が複数カテゴリを持つ場合は全カテゴリに出現）
  // "代表カテゴリ" 方式ではなく "カテゴリごとに出現" 方式を採用
  // （1案件が生保+医療の場合、生命保険グループ・医療保険グループ両方に表示）
  // → 件数は案件数でなくカテゴリ出現数になる。実装上わかりやすいので明記。
  const productGroups = useMemo((): ProductGroup[] => {
    const catMap = new Map<ProductCategory, Opportunity[]>();
    for (const opp of filtered) {
      const cats =
        opp.productCategories.length > 0
          ? opp.productCategories
          : (["other"] as ProductCategory[]);
      for (const cat of cats) {
        if (catFilter !== "all" && cat !== catFilter) continue;
        if (!catMap.has(cat)) catMap.set(cat, []);
        catMap.get(cat)!.push(opp);
      }
    }
    // PRODUCT_CATEGORY_LABELS のキー順に並べる（定義順 = 重要度順）
    const groups: ProductGroup[] = [];
    for (const [cat, label] of Object.entries(PRODUCT_CATEGORY_LABELS) as [
      ProductCategory,
      string,
    ][]) {
      const items = catMap.get(cat);
      if (items && items.length > 0) {
        groups.push({ category: cat, label, items });
      }
    }
    return groups;
  }, [filtered, catFilter]);

  // 世帯ヘッダー行: 代表アクティブ案件メタ（ADR-B3 §B3-5-1）
  // visibleOpportunities 全体から計算（タブフィルタ後の filtered ではなく全案件が対象）
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

  // 要件3 (ADR-B4 v2): 世帯ヘッダー行右端「報告」ボタン
  // 代表アクティブ案件がある世帯のみ表示。遅辺でも navigate まで実装。
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
        タスク
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

  const renderItem = (opp: Opportunity) => {
    const tasks = opp.tasks ?? [];
    // F2: タスク一覧は展開トグルなしで常時表示
    return (
      <>
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
          {/* F2: タスク進捗バッジ（トグルなし・進捗バーのみ） */}
          <td className="px-4 py-3 hidden lg:table-cell">
            <TaskProgressBadge tasks={tasks} />
          </td>
          <td className="px-4 py-3 text-gray-600 hidden lg:table-cell max-w-[180px] truncate">
            {opp.nextAction ?? "—"}
          </td>
          <td className="px-4 py-3 text-gray-600 whitespace-nowrap hidden lg:table-cell">
            {effectiveExpectedCloseDate(opp) ?? "—"}
          </td>
        </tr>
        {/* F2: タスクリストは常時既定表示 */}
        <tr key={`${opp.id}-tasks`}>
          <td colSpan={7} className="p-0">
            <TaskListPreview
              tasks={tasks}
              onNavigate={() => navigate(`/opportunities/${opp.id}`)}
            />
          </td>
        </tr>
      </>
    );
  };

  // 商品別ビュー用のレンダラ（項目5）
  const renderProductView = () => (
    <div className="space-y-4">
      {productGroups.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">
          該当する案件がありません
        </div>
      )}
      {productGroups.map((group) => (
        <div
          key={group.category}
          className="bg-white border border-gray-200 rounded-xl overflow-hidden"
        >
          {/* グループヘッダー */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {group.label}
            </span>
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-600">
              {group.items.length}
            </span>
          </div>
          {/* 案件リスト */}
          <div className="divide-y divide-gray-100">
            {group.items.map((opp) => {
              const tasks = opp.tasks ?? [];
              // F2: タスク一覧は常時既定表示
              return (
                <div key={opp.id}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/opportunities/${opp.id}`)}
                  >
                    {/* 契約者 */}
                    <div className="w-24 text-xs text-gray-600 whitespace-nowrap flex-shrink-0">
                      {getContractorName(opp.contractorPersonId) || (
                        <span className="text-gray-300">未設定</span>
                      )}
                    </div>
                    {/* 案件名 */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-800 truncate">
                        {opp.title}
                      </div>
                      {opp.nextAction && (
                        <div className="text-xs text-gray-400 truncate mt-0.5">
                          {opp.nextAction}
                        </div>
                      )}
                    </div>
                    {/* F2: タスク進捗（トグルなし） */}
                    <div className="flex-shrink-0">
                      <TaskProgressBadge tasks={tasks} />
                    </div>
                    {/* 期日 */}
                    <div className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 hidden md:block">
                      {effectiveExpectedCloseDate(opp) ?? "—"}
                    </div>
                    {/* 月払 */}
                    <div className="text-xs text-gray-600 whitespace-nowrap flex-shrink-0 hidden lg:block">
                      {opp.totalMonthlyPremium
                        ? `¥${opp.totalMonthlyPremium.toLocaleString()}`
                        : "—"}
                    </div>
                  </div>
                  {/* F2: タスクリストは常時表示 */}
                  <TaskListPreview
                    tasks={tasks}
                    onNavigate={() => navigate(`/opportunities/${opp.id}`)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
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
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg ${
              showFilters
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
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

      {/* ── タブ（カンバン風 7タブ） ───────────────────────────────────────── */}
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

      {/* 項目5: ビュー切替トグル */}
      <div className="flex items-center justify-between mb-3 mt-2">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("household")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === "household"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🏠 世帯別
          </button>
          <button
            type="button"
            onClick={() => setViewMode("product")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === "product"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📦 商品別
          </button>
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
              className={`text-sm ${
                isLostTab ? "text-gray-400" : "text-gray-700"
              }`}
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

      {/* メインコンテンツ: 世帯別 or 商品別 */}
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
        renderProductView()
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
