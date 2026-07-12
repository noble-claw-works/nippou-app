import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useAppStore } from '../store';
import type { OpportunityStage, ProductCategory, Opportunity } from '../types';
import { StageBadge, STAGE_META } from '../components/opportunity/StageBadge';
import { TwoLevelAccordion } from '../components/ui/TwoLevelAccordion';
import { groupByHouseholdThenContractor } from '../utils/grouping';

// ─── SortIcon コンポーネント（レンダー内定義を回避するためコンポーネント外部に定義） ──
type SortKey = 'stage' | 'expectedCloseDate' | 'totalMonthlyPremium' | 'updatedAt';

function SortIcon({ k, sortKey, sortAsc }: { k: SortKey; sortKey: SortKey; sortAsc: boolean }) {
  if (sortKey !== k) return <ChevronDown className="w-3 h-3 text-gray-300" />;
  return sortAsc
    ? <ChevronUp className="w-3 h-3 text-blue-500" />
    : <ChevronDown className="w-3 h-3 text-blue-500" />;
}

// =====================================================
// OpportunitiesPage — 商談案件一覧（世帯>契約者 2段グループ化）
// =====================================================

const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  life: '生命保険', medical: '医療保険', cancer: 'がん保険',
  income: '就業不能保険', nursing: '介護保険', savings: '学資・貯蓄',
  auto: '自動車保険', fire: '火災保険', liability: '賠償責任保険', other: 'その他',
};

const STAGE_ORDER: OpportunityStage[] = [
  'approach', 'fact_finding', 'needs_analysis', 'proposal',
  'negotiation', 'application', 'underwriting', 'issued', 'lost',
];

const OPP_COL_SPAN = 6;

export function OpportunitiesPage() {
  const navigate = useNavigate();

  // ★ useShallow で配列の参照安定化（無限ループ防止）
  const { opportunities, customers, persons } = useAppStore(
    useShallow(s => ({
      opportunities: s.opportunities,
      customers: s.customers,
      persons: s.persons,
    })),
  );
  const { currentUserId, currentRole } = useAppStore(
    useShallow(s => ({ currentUserId: s.currentUserId, currentRole: s.currentRole })),
  );

  const [stageFilter, setStageFilter] = useState<OpportunityStage | 'all'>('all');
  const [ownerFilter] = useState<string>('all');
  const [openOnly, setOpenOnly] = useState(true);
  const [catFilter, setCatFilter] = useState<ProductCategory | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Role-based filtering
  const visibleOpportunities = useMemo(() => {
    return opportunities.filter(o => {
      if (currentRole === 'general') return o.ownerId === currentUserId;
      if (currentRole === 'manager') {
        // Simplified: manager sees self + teammates (use all for demo)
        return true;
      }
      return true; // executive/admin sees all
    });
  }, [opportunities, currentRole, currentUserId]);

  const filtered = useMemo(() => {
    let list = [...visibleOpportunities];
    if (openOnly) list = list.filter(o => o.status === 'open');
    if (stageFilter !== 'all') list = list.filter(o => o.stage === stageFilter);
    if (ownerFilter !== 'all') list = list.filter(o => o.ownerId === ownerFilter);
    if (catFilter !== 'all') list = list.filter(o => o.productCategories.includes(catFilter));

    list.sort((a, b) => {
      let cmp: number;
      if (sortKey === 'stage') {
        cmp = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage);
      } else if (sortKey === 'expectedCloseDate') {
        cmp = (a.expectedCloseDate ?? '9999').localeCompare(b.expectedCloseDate ?? '9999');
      } else if (sortKey === 'totalMonthlyPremium') {
        cmp = (b.totalMonthlyPremium ?? 0) - (a.totalMonthlyPremium ?? 0);
      } else {
        cmp = b.updatedAt.localeCompare(a.updatedAt);
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [visibleOpportunities, openOnly, stageFilter, ownerFilter, catFilter, sortKey, sortAsc]);

  // ★ グルーピング（派生計算なので useMemo で安定化）
  const groups = useMemo(
    () => groupByHouseholdThenContractor(filtered, customers, persons),
    [filtered, customers, persons],
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(false); }
  };

  // アコーディオン内の行レンダラー
  const renderOppRow = (opp: Opportunity) => (
    <tr
      key={opp.id}
      className="hover:bg-gray-50 cursor-pointer"
      onClick={() => navigate(`/opportunities/${opp.id}`)}
    >
      <td className="px-4 py-3">
        <span className="font-medium text-gray-800">{opp.title}</span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <StageBadge stage={opp.stage} size="sm" />
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <div className="flex flex-wrap gap-1">
          {opp.productCategories.map(cat => (
            <span key={cat} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
              {PRODUCT_CATEGORY_LABELS[cat]}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap hidden md:table-cell">
        {opp.totalMonthlyPremium
          ? `¥${opp.totalMonthlyPremium.toLocaleString()}`
          : '—'}
      </td>
      <td className="px-4 py-3 text-gray-600 hidden lg:table-cell max-w-[180px] truncate">
        {opp.nextAction ?? '—'}
      </td>
      <td className="px-4 py-3 text-gray-600 whitespace-nowrap hidden lg:table-cell">
        {opp.expectedCloseDate ?? '—'}
      </td>
    </tr>
  );

  // テーブルヘッダーレンダラー（アコーディオン内で使用）
  const renderTableHeader = () => (
    <tr>
      <th className="px-4 py-3 text-left font-medium text-gray-600">案件名</th>
      <th
        className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer whitespace-nowrap select-none"
        onClick={() => handleSort('stage')}
      >
        <span className="flex items-center gap-1">ステージ <SortIcon k="stage" sortKey={sortKey} sortAsc={sortAsc} /></span>
      </th>
      <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">カテゴリ</th>
      <th
        className="px-4 py-3 text-right font-medium text-gray-600 cursor-pointer whitespace-nowrap select-none hidden md:table-cell"
        onClick={() => handleSort('totalMonthlyPremium')}
      >
        <span className="flex items-center justify-end gap-1">月払 <SortIcon k="totalMonthlyPremium" sortKey={sortKey} sortAsc={sortAsc} /></span>
      </th>
      <th className="px-4 py-3 text-left font-medium text-gray-600 hidden lg:table-cell">次アクション</th>
      <th
        className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer whitespace-nowrap select-none hidden lg:table-cell"
        onClick={() => handleSort('expectedCloseDate')}
      >
        <span className="flex items-center gap-1">期日 <SortIcon k="expectedCloseDate" sortKey={sortKey} sortAsc={sortAsc} /></span>
      </th>
    </tr>
  );

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">🤝 商談案件</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} 件表示{openOnly ? '（進行中のみ）' : '（全件）'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
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

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="flex items-center gap-2 col-span-2 md:col-span-1">
            <input
              type="checkbox"
              checked={openOnly}
              onChange={e => setOpenOnly(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">進行中のみ</span>
          </label>
          <div>
            <label className="block text-xs text-gray-500 mb-1">ステージ</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value as OpportunityStage | 'all')}
            >
              <option value="all">すべて</option>
              {STAGE_ORDER.map(s => (
                <option key={s} value={s}>{STAGE_META[s].emoji} {STAGE_META[s].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              value={catFilter}
              onChange={e => setCatFilter(e.target.value as ProductCategory | 'all')}
            >
              <option value="all">すべて</option>
              {(Object.entries(PRODUCT_CATEGORY_LABELS) as [ProductCategory, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 2段グループ化アコーディオン */}
      <TwoLevelAccordion
        groups={groups}
        allOpenDefault={true}
        renderItem={renderOppRow}
        renderTableHeader={renderTableHeader}
        colSpan={OPP_COL_SPAN}
        emptyMessage="該当する案件がありません"
      />

      {/* Quick add modal (needs household — show simple selector) */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">世帯を選択して案件を作成</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {customers.filter(c => c.status === 'active').map(c => (
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
