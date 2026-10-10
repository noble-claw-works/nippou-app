import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useAppStore } from '../store';
import type { PolicyStatus, ProductCategory, Policy } from '../types';
import { PolicyStatusBadge } from '../components/policy/PolicyStatusBadge';
import { PolicyEditModal } from '../components/policy/PolicyEditModal';
import { HouseholdAccordion } from '../components/ui/HouseholdAccordion';
import { groupByHousehold } from '../utils/groupByHousehold';


const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  life: '生命保険', medical: '医療保険', cancer: 'がん保険',
  income: '就業不能保険', nursing: '介護保険', savings: '学資・貯蓄',
  auto: '自動車保険', fire: '火災保険', liability: '賠償責任保険', other: 'その他',
};

const ALL_STATUSES: PolicyStatus[] = ['inforce', 'pending', 'lapsed', 'surrendered', 'matured', 'paid_up', 'reduced'];

type PolicySortKey = 'startDate' | 'monthlyPremium' | 'maturityDate' | 'contractor';

export function PoliciesPage() {
  // useShallow で無限ループ防止（React#185対策）
  const { policies, customers, persons, users, currentRole, currentUserId } = useAppStore(
    useShallow(s => ({
      policies: s.policies,
      customers: s.customers,
      persons: s.persons,
      users: s.users,
      currentRole: s.currentRole,
      currentUserId: s.currentUserId,
    })),
  );

  const [showAdd, setShowAdd] = useState(false);
  const [addHouseholdId, setAddHouseholdId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<PolicyStatus | ''>('');
  const [filterCategory, setFilterCategory] = useState<ProductCategory | ''>('');
  const [filterOwner, setFilterOwner] = useState('');
  // 既定ソートを契約者(contractor)昇順に（主上修正指示2026-07-12）
  const [sortKey, setSortKey] = useState<PolicySortKey>('contractor');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // 契約者名を取得するヘルパー（ソート・表示共用）
  const getContractorName = useMemo(() => {
    return (contractorPersonId: string): string => {
      if (!contractorPersonId) return '';
      return persons.find(p => p.id === contractorPersonId)?.name ?? '';
    };
  }, [persons]);

  // 世帯名を取得するヘルパー
  const getHouseholdName = useMemo(() => {
    return (householdId: string): string =>
      customers.find(c => c.id === householdId)?.name ?? householdId;
  }, [customers]);

  // ロール別フィルタ
  const visiblePolicies = useMemo(() => {
    if (currentRole === 'executive' || currentRole === 'admin') return policies;
    if (currentRole === 'manager') {
      const myTeamUserIds = users
        .filter(u => u.teamIds.some(tid =>
          users.find(m => m.id === currentUserId)?.teamIds.includes(tid)
        ))
        .map(u => u.id);
      return policies.filter(p => myTeamUserIds.includes(p.ownerId) || p.ownerId === currentUserId);
    }
    return policies.filter(p => p.ownerId === currentUserId);
  }, [policies, currentRole, currentUserId, users]);

  const filtered = useMemo(() => {
    let list = visiblePolicies;

    if (filterStatus) list = list.filter(p => p.status === filterStatus);
    if (filterCategory) list = list.filter(p => p.productCategory === filterCategory);
    if (filterOwner) list = list.filter(p => p.ownerId === filterOwner);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.productName.toLowerCase().includes(q) ||
        p.insurer.toLowerCase().includes(q) ||
        p.policyNumber?.toLowerCase().includes(q) ||
        customers.find(c => c.id === p.householdId)?.name.toLowerCase().includes(q)
      );
    }

    // Sort
    list = [...list].sort((a, b) => {
      let cmp: number;
      if (sortKey === 'contractor') {
        const nameA = getContractorName(a.contractorPersonId);
        const nameB = getContractorName(b.contractorPersonId);
        // 未設定は末尾
        if (!nameA && !nameB) cmp = 0;
        else if (!nameA) cmp = 1;
        else if (!nameB) cmp = -1;
        else cmp = nameA.localeCompare(nameB, 'ja');
      } else if (sortKey === 'monthlyPremium') {
        cmp = a.monthlyPremium - b.monthlyPremium;
      } else {
        const va = a[sortKey] ?? '';
        const vb = b[sortKey] ?? '';
        cmp = va < vb ? -1 : va > vb ? 1 : 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [visiblePolicies, filterStatus, filterCategory, filterOwner, search, sortKey, sortDir, customers, getContractorName]);

  // 世帯1段グループ化（フィルタ後。世帯名昇順・世帯内は上記ソート順を維持）
  const householdGroups = useMemo(() => {
    return groupByHousehold(
      filtered,
      (p: Policy) => p.householdId,
      getHouseholdName,
    );
  }, [filtered, getHouseholdName]);

  if (currentRole === 'general') {
    // general is allowed to view own policies, so no block
  }

  const handleSort = (key: PolicySortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const totalActive = filtered.filter(p => p.status === 'inforce').length;
  const totalMonthly = filtered
    .filter(p => p.status === 'inforce')
    .reduce((s, p) => s + p.monthlyPremium, 0);

  // Active customers with policies for add modal
  const activeCustomers = customers.filter(c => c.status === 'active');

  const renderTableHeader = () => (
    <tr>
      <th
        className="text-left px-4 py-3 text-gray-600 font-medium cursor-pointer hover:text-blue-600"
        onClick={() => handleSort('contractor')}
      >
        契約者 {sortKey === 'contractor' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
      </th>
      <th className="text-left px-3 py-3 text-gray-600 font-medium">商品名</th>
      <th className="text-left px-3 py-3 text-gray-600 font-medium">保険会社</th>
      <th className="text-left px-3 py-3 text-gray-600 font-medium">カテゴリ</th>
      <th className="text-left px-3 py-3 text-gray-600 font-medium">ステータス</th>
      <th
        className="text-right px-3 py-3 text-gray-600 font-medium cursor-pointer hover:text-blue-600"
        onClick={() => handleSort('monthlyPremium')}
      >
        月払 {sortKey === 'monthlyPremium' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
      </th>
      <th
        className="text-left px-3 py-3 text-gray-600 font-medium cursor-pointer hover:text-blue-600"
        onClick={() => handleSort('startDate')}
      >
        契約日 {sortKey === 'startDate' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
      </th>
      <th
        className="text-left px-3 py-3 text-gray-600 font-medium cursor-pointer hover:text-blue-600"
        onClick={() => handleSort('maturityDate')}
      >
        満期日 {sortKey === 'maturityDate' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
      </th>
      <th className="text-left px-3 py-3 text-gray-600 font-medium">担当</th>
    </tr>
  );

  const renderItem = (policy: Policy) => {
    const owner = users.find(u => u.id === policy.ownerId);
    return (
      <tr key={policy.id} className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 text-gray-700 pl-8">
          {getContractorName(policy.contractorPersonId) || <span className="text-gray-300">契約者未設定</span>}
        </td>
        <td className="px-3 py-3">
          <Link
            to={`/policies/${policy.id}`}
            className="text-gray-900 hover:text-blue-600 hover:underline font-medium"
            onClick={e => e.stopPropagation()}
          >
            {policy.productName}
          </Link>
          {policy.policyNumber && (
            <div className="text-[10px] text-gray-400">{policy.policyNumber}</div>
          )}
        </td>
        <td className="px-3 py-3 text-gray-700">{policy.insurer}</td>
        <td className="px-3 py-3 text-gray-600">
          {PRODUCT_CATEGORY_LABELS[policy.productCategory] ?? policy.productCategory}
        </td>
        <td className="px-3 py-3">
          <PolicyStatusBadge status={policy.status} size="sm" />
        </td>
        <td className="px-3 py-3 text-right font-semibold text-gray-900">
          {policy.monthlyPremium > 0
            ? `¥${policy.monthlyPremium.toLocaleString()}`
            : '—'
          }
        </td>
        <td className="px-3 py-3 text-gray-600">{policy.startDate}</td>
        <td className="px-3 py-3 text-gray-600">{policy.maturityDate ?? '—'}</td>
        <td className="px-3 py-3 text-gray-600">{owner?.name ?? '—'}</td>
      </tr>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">📜 契約一覧</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            有効中 {totalActive}件 / 月払合計 ¥{totalMonthly.toLocaleString()} / {householdGroups.length} 世帯
          </p>
        </div>
        <button
          onClick={() => { setAddHouseholdId(activeCustomers[0]?.id ?? customers[0]?.id ?? ''); setShowAdd(true); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          新規契約
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
        <div className="relative sm:col-span-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="商品名・保険会社・世帯"
            className="w-full text-sm border border-gray-200 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as PolicyStatus | '')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">ステータス: 全て</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value as ProductCategory | '')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">カテゴリ: 全て</option>
          {(Object.keys(PRODUCT_CATEGORY_LABELS) as ProductCategory[]).map(k => (
            <option key={k} value={k}>{PRODUCT_CATEGORY_LABELS[k]}</option>
          ))}
        </select>
        {(currentRole === 'manager' || currentRole === 'executive' || currentRole === 'admin') && (
          <select
            value={filterOwner}
            onChange={e => setFilterOwner(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">担当者: 全て</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
      </div>

      {/* 世帯1段グループ化アコーディオン */}
      <HouseholdAccordion
        groups={householdGroups}
        allOpenDefault={true}
        renderItem={renderItem}
        renderTableHeader={renderTableHeader}
        colSpan={9}
        itemLabel="契約"
        emptyMessage="契約が見つかりません"
      />

      {/* Add Modal */}
      {showAdd && addHouseholdId && (
        <PolicyEditModal
          householdId={addHouseholdId}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
