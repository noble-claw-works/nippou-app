// HouseholdListFull.tsx — 世帯タブ本格一覧（工程F改修・#305）
// PC: テーブル表示 / スマホ: カード表示
// 400行以内

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Tag, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store';
import { canDeleteCustomer } from '../../utils/customerAttachment';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState, FormField } from '../../components/ui/EmptyState';
import type { Customer, CustomerType } from '../../types';

const TYPE_LABELS: Record<string, string> = {
  individual: '個人',
  corporate: '法人',
  prospect: '見込み',
};

type SortKey = 'name_asc' | 'name_desc' | 'lastContact_desc' | 'created_desc';

// ── インライン HouseholdForm（HouseholdListPane と同一ロジック） ──────────────
function HouseholdForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Customer>;
  onSave: (data: Partial<Customer>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<Customer>>({
    name: '',
    type: 'individual',
    area: '',
    tags: [],
    memo: '',
    familyMemo: '',
    ...initial,
  });
  const [tagInput, setTagInput] = useState('');
  const { users } = useAppStore();

  const addTag = () => {
    if (tagInput.trim() && !(form.tags ?? []).includes(tagInput.trim())) {
      setForm(f => ({ ...f, tags: [...(f.tags ?? []), tagInput.trim()] }));
      setTagInput('');
    }
  };

  return (
    <div className="space-y-4">
      <FormField label="世帯名" required>
        <input
          value={form.name ?? ''}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </FormField>
      <FormField label="区分">
        <div className="flex gap-2 flex-wrap">
          {(['individual', 'corporate'] as CustomerType[]).map(t => (
            <button
              key={t}
              onClick={() => setForm(f => ({ ...f, type: t }))}
              className={`px-3 py-1.5 text-xs rounded-lg border ${
                form.type === t
                  ? 'bg-blue-50 border-blue-400 text-blue-700'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </FormField>
      <FormField label="エリア">
        <input
          value={form.area ?? ''}
          onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </FormField>
      <FormField label="主担当">
        <select
          value={form.primaryUserId ?? ''}
          onChange={e => setForm(f => ({ ...f, primaryUserId: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">選択なし</option>
          {users.filter(u => u.status === 'active').map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </FormField>
      <FormField label="家族構成メモ">
        <textarea
          value={form.familyMemo ?? ''}
          onChange={e => setForm(f => ({ ...f, familyMemo: e.target.value }))}
          rows={2}
          placeholder="例: 配偶者・子2名あり"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
        />
      </FormField>
      <FormField label="タグ">
        <div className="flex gap-2 mb-2 flex-wrap">
          {(form.tags ?? []).map(tag => (
            <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
              {tag}
              <button
                onClick={() => setForm(f => ({ ...f, tags: f.tags?.filter(t => t !== tag) }))}
                className="text-blue-400 hover:text-blue-700"
              >×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag()}
            placeholder="タグを入力してEnter"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          />
          <button onClick={addTag} className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200">追加</button>
        </div>
      </FormField>
      <FormField label="メモ">
        <textarea
          value={form.memo ?? ''}
          onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
        />
      </FormField>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          キャンセル
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.name?.trim()}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          保存
        </button>
      </div>
    </div>
  );
}

// ── ソートアイコン ──────────────────────────────────────────────────────────
function SortIcon({ col, current }: { col: string; current: SortKey }) {
  if (current === `${col}_asc`) return <ChevronUp className="w-3 h-3 inline ml-0.5 text-blue-500" />;
  if (current === `${col}_desc`) return <ChevronDown className="w-3 h-3 inline ml-0.5 text-blue-500" />;
  return null;
}

// ── メイン ──────────────────────────────────────────────────────────────────
export function HouseholdListFull() {
  const navigate = useNavigate();
  const {
    customers,
    persons,
    users,
    reports,
    opportunities,
    addCustomer,
    updateCustomer,
    deactivateCustomer,
    deleteCustomer,
    currentRole,
    addToast,
  } = useAppStore();

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name_asc');
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const attachmentState = { reports };

  // 構成員数
  const personCountByHousehold = (() => {
    const map = new Map<string, number>();
    for (const p of persons) {
      map.set(p.householdId, (map.get(p.householdId) ?? 0) + 1);
    }
    return map;
  })();

  // 契約数 (proposalProducts 合計)
  const contractCountByHousehold = (() => {
    const map = new Map<string, number>();
    for (const opp of opportunities) {
      const cnt = opp.proposalProducts?.length ?? 0;
      map.set(opp.householdId, (map.get(opp.householdId) ?? 0) + cnt);
    }
    return map;
  })();

  const filtered = customers.filter(c => {
    if (query && !c.name.toLowerCase().includes(query.toLowerCase()) && !c.area.toLowerCase().includes(query.toLowerCase())) return false;
    if (typeFilter && c.type !== typeFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortKey) {
      case 'name_asc': return a.name.localeCompare(b.name, 'ja');
      case 'name_desc': return b.name.localeCompare(a.name, 'ja');
      case 'lastContact_desc': {
        const av = a.lastContactDate ?? '';
        const bv = b.lastContactDate ?? '';
        return av === bv ? a.name.localeCompare(b.name, 'ja') : bv.localeCompare(av);
      }
      case 'created_desc': return (b.id ?? '').localeCompare(a.id ?? '');
      default: return 0;
    }
  });

  const toggleSort = (col: 'name' | 'lastContact' | 'created') => {
    const asc = `${col}_asc` as SortKey;
    const desc = `${col}_desc` as SortKey;
    setSortKey(s => (s === asc ? desc : asc));
  };

  const editingCustomer = editId ? customers.find(c => c.id === editId) : null;
  const canAdd = currentRole !== undefined;
  const canEdit = currentRole !== undefined;
  const canDeactivate = currentRole !== undefined;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      {/* ── ヘッダーバー ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
        <h1 className="text-base font-semibold text-gray-800">👥 世帯一覧</h1>
        {canAdd && (
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> 世帯を追加
          </button>
        )}
      </div>

      {/* ── フィルタバー ── */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-white border-b border-gray-100 shrink-0">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="世帯名・エリアで検索"
            className="w-full pl-8 pr-3 border border-gray-200 rounded-lg py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
        >
          <option value="">すべての区分</option>
          <option value="individual">個人</option>
          <option value="corporate">法人</option>
          <option value="prospect">見込み</option>
        </select>
        <select
          value={sortKey}
          onChange={e => setSortKey(e.target.value as SortKey)}
          aria-label="ソート順"
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
        >
          <option value="name_asc">氏名順↑</option>
          <option value="name_desc">氏名順↓</option>
          <option value="lastContact_desc">最終接触↓</option>
          <option value="created_desc">登録順↓</option>
        </select>
        <span className="text-sm text-gray-500">
          {sorted.length}件{(query || typeFilter) ? `（全${customers.length}件中）` : ''}
        </span>
        {(query || typeFilter) && (
          <button
            onClick={() => { setQuery(''); setTypeFilter(''); }}
            className="text-sm text-blue-500 hover:underline"
          >
            クリア
          </button>
        )}
      </div>

      {/* ── コンテンツ ── */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon="👥"
              title="世帯が見つかりません"
              action={canAdd ? { label: '+ 世帯を追加', onClick: () => setShowNew(true) } : undefined}
            />
          </div>
        ) : (
          <>
            {/* ── PC: テーブル ── */}
            <div className="hidden md:block px-4 py-3">
              <table className="w-full bg-white rounded-xl border border-gray-200 text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th
                      className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap"
                      onClick={() => toggleSort('name')}
                    >
                      世帯名 <SortIcon col="name" current={sortKey} />
                    </th>
                    <th className="text-left px-3 py-3 font-medium text-gray-600 whitespace-nowrap">区分</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600 whitespace-nowrap">構成員</th>
                    <th className="text-left px-3 py-3 font-medium text-gray-600 whitespace-nowrap">エリア</th>
                    <th className="text-left px-3 py-3 font-medium text-gray-600 whitespace-nowrap">主担当</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600 whitespace-nowrap">契約数</th>
                    <th
                      className="text-left px-3 py-3 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap"
                      onClick={() => toggleSort('lastContact')}
                    >
                      最終接触 <SortIcon col="lastContact" current={sortKey} />
                    </th>
                    <th className="text-left px-3 py-3 font-medium text-gray-600 whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sorted.map(customer => {
                    const primaryUser = users.find(u => u.id === customer.primaryUserId);
                    const personCount = personCountByHousehold.get(customer.id) ?? 0;
                    const contractCount = contractCountByHousehold.get(customer.id) ?? 0;
                    const canDel = canDeleteCustomer(attachmentState, customer.id, currentRole);
                    return (
                      <tr
                        key={customer.id}
                        className={`hover:bg-blue-50 transition-colors cursor-pointer ${customer.status === 'inactive' ? 'opacity-50' : ''}`}
                        onClick={() => navigate(`/households/${customer.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-gray-900">{customer.name}</span>
                            {customer.isFavorite && <span className="text-sm">⭐</span>}
                          </div>
                          {customer.tags.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {customer.tags.map(tag => (
                                <span key={tag} className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                                  <Tag className="w-2.5 h-2.5" />{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                            {TYPE_LABELS[customer.type] ?? customer.type}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          {personCount > 0 ? (
                            <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full">👪 {personCount}名</span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {customer.area ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />{customer.area}
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">
                          {primaryUser?.name ?? <span className="text-gray-400">未設定</span>}
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          {contractCount > 0 ? (
                            <span className="text-sm font-medium text-indigo-700">{contractCount}</span>
                          ) : <span className="text-gray-400 text-sm">0</span>}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {customer.lastContactDate ?? <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => navigate(`/households/${customer.id}`)}
                              className="px-2.5 py-1 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                            >
                              詳細
                            </button>
                            {canEdit && customer.status === 'active' && (
                              <button
                                onClick={() => setEditId(customer.id)}
                                className="px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                              >
                                編集
                              </button>
                            )}
                            {canDeactivate && customer.status === 'active' && (
                              <button
                                onClick={() => setDeactivateId(customer.id)}
                                className="px-2 py-1 text-xs text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50"
                                aria-label={`${customer.name} を無効化`}
                              >
                                無効化
                              </button>
                            )}
                            {currentRole !== undefined && (
                              <button
                                disabled={!canDel}
                                onClick={() => canDel && setDeleteId(customer.id)}
                                className={`px-2 py-1 text-xs border rounded-lg ${canDel ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-red-300 border-red-100 opacity-50 cursor-not-allowed'}`}
                                aria-label={`${customer.name} を削除`}
                                aria-disabled={!canDel}
                              >
                                削除
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── スマホ: カード ── */}
            <div className="md:hidden px-3 py-3 space-y-3">
              {sorted.map(customer => {
                const primaryUser = users.find(u => u.id === customer.primaryUserId);
                const personCount = personCountByHousehold.get(customer.id) ?? 0;
                const contractCount = contractCountByHousehold.get(customer.id) ?? 0;
                const canDel = canDeleteCustomer(attachmentState, customer.id, currentRole);
                return (
                  <div
                    key={customer.id}
                    className={`bg-white rounded-xl border border-gray-200 p-4 shadow-sm ${customer.status === 'inactive' ? 'opacity-50' : ''}`}
                    onClick={() => navigate(`/households/${customer.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-gray-900 text-base">{customer.name}</span>
                          {customer.isFavorite && <span>⭐</span>}
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            {TYPE_LABELS[customer.type] ?? customer.type}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                          {personCount > 0 && <span className="text-green-700">👪 {personCount}名</span>}
                          {customer.area && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" />{customer.area}
                            </span>
                          )}
                          {primaryUser && <span>担当: {primaryUser.name}</span>}
                          {contractCount > 0 && <span className="text-indigo-700">契約{contractCount}件</span>}
                        </div>
                        {customer.tags.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {customer.tags.map(tag => (
                              <span key={tag} className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                                <Tag className="w-2.5 h-2.5" />{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {customer.lastContactDate && (
                          <p className="text-xs text-gray-400 mt-1">最終接触: {customer.lastContactDate}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/households/${customer.id}`)}
                        className="flex-1 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 text-center"
                      >
                        詳細を見る
                      </button>
                      {canEdit && customer.status === 'active' && (
                        <button
                          onClick={() => setEditId(customer.id)}
                          className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          編集
                        </button>
                      )}
                      {canDeactivate && customer.status === 'active' && (
                        <button
                          onClick={() => setDeactivateId(customer.id)}
                          className="px-3 py-1.5 text-xs text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50"
                          aria-label={`${customer.name} を無効化`}
                        >
                          無効化
                        </button>
                      )}
                      {currentRole !== undefined && (
                        <button
                          disabled={!canDel}
                          onClick={() => canDel && setDeleteId(customer.id)}
                          className={`px-3 py-1.5 text-xs border rounded-lg ${canDel ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-red-300 border-red-100 opacity-50 cursor-not-allowed'}`}
                          aria-label={`${customer.name} を削除`}
                          aria-disabled={!canDel}
                        >
                          削除
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── 世帯追加モーダル ── */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="新しい世帯を追加" size="md">
        <HouseholdForm
          onSave={data => {
            addCustomer({
              ...data,
              id: '',
              status: 'active',
              tags: data.tags ?? [],
              memo: data.memo ?? '',
              familyMemo: data.familyMemo ?? '',
            } as Omit<Customer, 'id'>);
            setShowNew(false);
            addToast({ type: 'success', message: '世帯を追加しました' });
          }}
          onCancel={() => setShowNew(false)}
        />
      </Modal>

      {/* ── 世帯編集モーダル ── */}
      {editingCustomer && (
        <Modal open={!!editId} onClose={() => setEditId(null)} title="世帯を編集" size="md">
          <HouseholdForm
            initial={editingCustomer}
            onSave={data => {
              updateCustomer(editingCustomer.id, data);
              setEditId(null);
              addToast({ type: 'success', message: '変更を保存しました' });
            }}
            onCancel={() => setEditId(null)}
          />
        </Modal>
      )}

      {/* ── 無効化確認 ── */}
      <ConfirmDialog
        open={!!deactivateId}
        onClose={() => setDeactivateId(null)}
        onConfirm={() => {
          deactivateCustomer(deactivateId!);
          addToast({ type: 'info', message: '世帯を無効化しました' });
          setDeactivateId(null);
        }}
        title="世帯を無効化しますか？"
        message={<p>「{customers.find(c => c.id === deactivateId)?.name}」を無効化します。</p>}
        confirmLabel="無効化する"
      />

      {/* ── 削除確認 ── */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId && !canDeleteCustomer(attachmentState, deleteId, currentRole)) {
            addToast({ type: 'error', message: '付帯情報あり世帯は admin/executive のみ削除可能です' });
            setDeleteId(null);
            return;
          }
          deleteCustomer(deleteId!);
          addToast({ type: 'success', message: '世帯を削除しました' });
          setDeleteId(null);
        }}
        title="世帯を完全に削除しますか？"
        message={
          <div className="space-y-2">
            <p>「{customers.find(c => c.id === deleteId)?.name}」を削除します。</p>
            <p className="text-sm text-red-600">❌ この操作は取り消しできません。</p>
          </div>
        }
        confirmLabel="削除する"
      />
    </div>
  );
}
