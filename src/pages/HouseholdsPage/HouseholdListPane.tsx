// HouseholdListPane.tsx — ①世帯リストペイン（3ペイン統合・工程D）
// 400行以内・ペイン分割

import { useState } from 'react';
import { Search, MapPin, Tag, Plus } from 'lucide-react';
import type { Customer, CustomerType } from '../../types';
import { useAppStore } from '../../store';
import { canDeleteCustomer } from '../../utils/customerAttachment';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState, FormField } from '../../components/ui/EmptyState';

const TYPE_LABELS: Record<string, string> = {
  individual: '個人',
  corporate: '法人',
  prospect: '見込み', // LegacyProspect 互換
};

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
              >
                ×
              </button>
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
          <button onClick={addTag} className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200">
            追加
          </button>
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
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
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

interface HouseholdListPaneProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function HouseholdListPane({ selectedId, onSelect }: HouseholdListPaneProps) {
  const {
    customers,
    persons,
    users,
    reports,
    addCustomer,
    updateCustomer,
    deactivateCustomer,
    deleteCustomer,
    currentRole,
    addToast,
  } = useAppStore();

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  type SortKey = 'name_asc' | 'name_desc' | 'lastContact_desc' | 'created_desc';
  const [sortKey, setSortKey] = useState<SortKey>('name_asc');
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const attachmentState = { reports };

  const personCountByHousehold = (() => {
    const map = new Map<string, number>();
    for (const p of persons) {
      map.set(p.householdId, (map.get(p.householdId) ?? 0) + 1);
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

  const editingCustomer = editId ? customers.find(c => c.id === editId) : null;
  const canAdd = currentRole !== undefined;
  const canEdit = currentRole !== undefined;
  const canDeactivate = currentRole !== undefined;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">👥 世帯一覧</h2>
        {canAdd && (
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-3 h-3" /> 追加
          </button>
        )}
      </div>

      {/* フィルタ */}
      <div className="px-2 py-2 border-b border-gray-100 space-y-1.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="世帯名・エリアで検索"
            className="w-full pl-7 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <div className="flex gap-1.5">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none"
          >
            <option value="">すべて</option>
            <option value="individual">個人</option>
            <option value="corporate">法人</option>
            <option value="prospect">見込み</option>
          </select>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            aria-label="ソート順"
            className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none"
          >
            <option value="name_asc">氏名順↑</option>
            <option value="name_desc">氏名順↓</option>
            <option value="lastContact_desc">接触日↓</option>
            <option value="created_desc">登録順↓</option>
          </select>
        </div>
        <p className="text-[10px] text-gray-400 px-0.5">
          {sorted.length} 件{query || typeFilter ? `（全${customers.length}件中）` : ''}
          {(query || typeFilter) && (
            <button
              onClick={() => { setQuery(''); setTypeFilter(''); }}
              className="ml-1 text-blue-500 hover:underline"
            >
              クリア
            </button>
          )}
        </p>
      </div>

      {/* リスト */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <EmptyState
            icon="👥"
            title="世帯が見つかりません"
            action={canAdd ? { label: '+ 世帯を追加', onClick: () => setShowNew(true) } : undefined}
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {sorted.map(customer => {
              const primaryUser = users.find(u => u.id === customer.primaryUserId);
              const personCount = personCountByHousehold.get(customer.id) ?? 0;
              const isSelected = customer.id === selectedId;
              return (
                <li
                  key={customer.id}
                  onClick={() => onSelect(customer.id)}
                  className={`px-3 py-2.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border-l-2 border-l-blue-500'
                      : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                  } ${customer.status === 'inactive' ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-gray-900 text-sm truncate">{customer.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {TYPE_LABELS[customer.type]}
                        </span>
                        {personCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded-full">
                            👪 {personCount}名
                          </span>
                        )}
                        {customer.isFavorite && <span className="text-xs">⭐</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400 flex-wrap">
                        {customer.area && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />{customer.area}
                          </span>
                        )}
                        {primaryUser && <span>担当: {primaryUser.name}</span>}
                      </div>
                      {customer.tags.length > 0 && (
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {customer.tags.map(tag => (
                            <span key={tag} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                              <Tag className="w-2 h-2" />{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 ml-1 shrink-0" onClick={e => e.stopPropagation()}>
                      {canEdit && customer.status === 'active' && (
                        <button
                          onClick={() => setEditId(customer.id)}
                          className="px-1.5 py-0.5 text-[10px] text-gray-500 border border-gray-200 rounded hover:bg-gray-50"
                        >
                          ✎
                        </button>
                      )}
                      {canDeactivate && customer.status === 'active' && (
                        <button
                          onClick={() => setDeactivateId(customer.id)}
                          className="px-1.5 py-0.5 text-[10px] text-amber-600 border border-amber-200 rounded hover:bg-amber-50"
                          aria-label={`${customer.name} を無効化`}
                        >
                          🚫
                        </button>
                      )}
                      {currentRole !== undefined && (() => {
                        const canDel = canDeleteCustomer(attachmentState, customer.id, currentRole);
                        return (
                          <button
                            disabled={!canDel}
                            onClick={() => canDel && setDeleteId(customer.id)}
                            className={`px-1.5 py-0.5 text-[10px] border rounded ${canDel ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-red-300 border-red-100 opacity-50 cursor-not-allowed'}`}
                            aria-label={`${customer.name} を削除`}
                            aria-disabled={!canDel}
                          >
                            🗑
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* New Modal */}
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

      {/* Edit Modal */}
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

      {/* Deactivate Confirm */}
      <ConfirmDialog
        open={!!deactivateId}
        onClose={() => setDeactivateId(null)}
        onConfirm={() => {
          deactivateCustomer(deactivateId!);
          addToast({ type: 'info', message: '世帯を無効化しました' });
        }}
        title="世帯を無効化しますか？"
        message={
          <p>「{customers.find(c => c.id === deactivateId)?.name}」を無効化します。</p>
        }
        confirmLabel="無効化する"
      />

      {/* Delete Confirm */}
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
