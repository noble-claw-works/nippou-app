import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MapPin, Tag } from 'lucide-react';
import { useAppStore } from '../store';
import { canDeleteCustomer, hasCustomerAttachment } from '../utils/customerAttachment';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState, FormField } from '../components/ui/EmptyState';
import type { Customer, CustomerType } from '../types';

const TYPE_LABELS: Record<CustomerType, string> = { individual: '個人', corporate: '法人', prospect: '見込み' };

function CustomerForm({ initial, onSave, onCancel }: {
  initial?: Partial<Customer>;
  onSave: (data: Partial<Customer>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<Customer>>({
    name: '', type: 'individual', area: '', tags: [], memo: '', ...initial,
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
      <FormField label="顧客名" required>
        <input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </FormField>
      <FormField label="区分">
        <div className="flex gap-2">
          {(['individual', 'corporate', 'prospect'] as CustomerType[]).map(t => (
            <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
              className={`px-3 py-1.5 text-xs rounded-lg border ${form.type === t ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </FormField>
      <FormField label="エリア">
        <input value={form.area ?? ''} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </FormField>
      <FormField label="主担当">
        <select value={form.primaryUserId ?? ''} onChange={e => setForm(f => ({ ...f, primaryUserId: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
          {users.filter(u => u.status === 'active').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </FormField>
      <FormField label="タグ">
        <div className="flex gap-2 mb-2 flex-wrap">
          {(form.tags ?? []).map(tag => (
            <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
              {tag}
              <button onClick={() => setForm(f => ({ ...f, tags: f.tags?.filter(t => t !== tag) }))} className="text-blue-400 hover:text-blue-700">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag()}
            placeholder="タグを入力してEnter"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
          <button onClick={addTag} className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200">追加</button>
        </div>
      </FormField>
      <FormField label="メモ">
        <textarea value={form.memo ?? ''} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
          rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
      </FormField>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">キャンセル</button>
        <button onClick={() => onSave(form)} disabled={!form.name?.trim()}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">保存</button>
      </div>
    </div>
  );
}

export function CustomersPage() {
  const navigate = useNavigate();
  const { customers, users, reports, addCustomer, updateCustomer, deactivateCustomer, deleteCustomer, currentRole, addToast } = useAppStore();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // P0 付帯情報判定用 state
  const attachmentState = { reports };

  // 顧客 ID → 対応履歴件数 マップを一度だけ計算
  const historyCountByCustomer = (() => {
    const map = new Map<string, number>();
    for (const r of reports) {
      for (const b of r.blocks) {
        if (b.customerId) map.set(b.customerId, (map.get(b.customerId) ?? 0) + 1);
      }
    }
    return map;
  })();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  // CUS-1: ソート順
  type SortKey = 'name_asc' | 'name_desc' | 'lastContact_desc' | 'nextAppt_asc' | 'created_desc';
  const [sortKey, setSortKey] = useState<SortKey>('name_asc');
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  // CUS-3: 全ロールで CRUD 可能とする
  const canAdd = currentRole !== undefined;
  const canEdit = currentRole !== undefined;
  const canDeactivate = currentRole !== undefined;

  const filtered = customers.filter(c => {
    if (query && !c.name.toLowerCase().includes(query.toLowerCase()) && !c.area.toLowerCase().includes(query.toLowerCase())) return false;
    if (typeFilter && c.type !== typeFilter) return false;
    return true;
  });

  // CUS-1: ソートロジック
  const sorted = [...filtered].sort((a, b) => {
    switch (sortKey) {
      case 'name_asc':
        return a.name.localeCompare(b.name, 'ja');
      case 'name_desc':
        return b.name.localeCompare(a.name, 'ja');
      case 'lastContact_desc': {
        const av = a.lastContactDate ?? '';
        const bv = b.lastContactDate ?? '';
        if (av === bv) return a.name.localeCompare(b.name, 'ja');
        return bv.localeCompare(av); // 新しい順
      }
      case 'nextAppt_asc': {
        const av = a.nextAppointment ?? '9999-12-31';
        const bv = b.nextAppointment ?? '9999-12-31';
        if (av === bv) return a.name.localeCompare(b.name, 'ja');
        return av.localeCompare(bv); // 近い順
      }
      case 'created_desc':
        return (b.id ?? '').localeCompare(a.id ?? '');
      default:
        return 0;
    }
  });

  const editingCustomer = editId ? customers.find(c => c.id === editId) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">顧客マスタ</h1>
        {canAdd && (
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> 新規追加
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-2 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="顧客名・エリアで検索"
            className="w-full pl-9 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="">すべての区分</option>
          <option value="individual">個人</option>
          <option value="corporate">法人</option>
          <option value="prospect">見込み</option>
        </select>
        {/* CUS-1: ソート選択 */}
        <select
          value={sortKey}
          onChange={e => setSortKey(e.target.value as SortKey)}
          aria-label="ソート順"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="name_asc">氏名順（あ→ん）</option>
          <option value="name_desc">氏名順（ん→あ）</option>
          <option value="lastContact_desc">最終接触日（新しい順）</option>
          <option value="nextAppt_asc">次回AP（近い順）</option>
          <option value="created_desc">登録順（新しい順）</option>
        </select>
      </div>

      {/* CUS-1: 件数表示 */}
      <div className="flex items-center justify-between mb-2 px-1 text-xs text-gray-600">
        <span>
          全 <strong className="text-gray-900">{sorted.length}</strong> 件
          {(query || typeFilter) && (
            <span className="text-gray-400">（全顧客 {customers.length} 件中）</span>
          )}
        </span>
        {(query || typeFilter) && (
          <button
            type="button"
            onClick={() => { setQuery(''); setTypeFilter(''); }}
            className="text-blue-600 hover:underline"
          >
            条件をクリア
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon="👥" title="顧客が見つかりません"
          action={canAdd ? { label: '+ 顧客を追加', onClick: () => setShowNew(true) } : undefined} />
      ) : (
        <div className="space-y-2">
          {sorted.map(customer => {
            const primaryUser = users.find(u => u.id === customer.primaryUserId);
            return (
              <div key={customer.id}
                className={`bg-white rounded-xl border p-4 transition-all ${customer.status === 'inactive' ? 'opacity-50 border-gray-100' : 'border-gray-200 hover:shadow-sm cursor-pointer hover:border-blue-200'}`}
                onClick={() => navigate(`/customers/${customer.id}`)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-gray-900">{customer.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{TYPE_LABELS[customer.type]}</span>
                      {customer.status === 'inactive' && <span className="text-xs text-red-500">無効</span>}
                      {customer.isFavorite && <span>⭐</span>}
                      {hasCustomerAttachment(attachmentState, customer.id) && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded" title="日報ブロックまたは TODO に結びつきあり">
                          🔗 付帯情報あり
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {customer.area && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{customer.area}</span>}
                      {primaryUser && <span>担当: {primaryUser.name}</span>}
                      {customer.lastContactDate && <span>最終接触: {customer.lastContactDate}</span>}
                      {customer.nextAppointment && <span className="text-blue-600">次回AP: {customer.nextAppointment}</span>}
                      {(historyCountByCustomer.get(customer.id) ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                          📅 履歴{historyCountByCustomer.get(customer.id)}件
                        </span>
                      )}
                    </div>
                    {customer.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {customer.tags.map(tag => (
                          <span key={tag} className="flex items-center gap-0.5 text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                            <Tag className="w-2.5 h-2.5" />{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2" onClick={e => e.stopPropagation()}>
                    {(historyCountByCustomer.get(customer.id) ?? 0) > 0 && (
                      <button onClick={() => navigate(`/customers/${customer.id}#history`)}
                        className="px-2.5 py-1 text-xs text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
                        aria-label={`${customer.name} の対応履歴を見る`}>
                        📅 履歴
                      </button>
                    )}
                    {canEdit && customer.status === 'active' && (
                      <button onClick={() => setEditId(customer.id)}
                        className="px-2.5 py-1 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                        ✎ 編集
                      </button>
                    )}
                    {canDeactivate && customer.status === 'active' && (
                      <button onClick={() => setDeactivateId(customer.id)}
                        className="px-2.5 py-1 text-xs text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50"
                        aria-label={`${customer.name} を無効化`}>
                        🚫 無効化
                      </button>
                    )}
                    {(() => {
                      const customerHasAttach = hasCustomerAttachment(attachmentState, customer.id);
                      const canDeleteThis = canDeleteCustomer(attachmentState, customer.id, currentRole);
                      return currentRole !== undefined && (
                        <button
                          disabled={!canDeleteThis}
                          title={
                            customerHasAttach
                              ? (canDeleteThis ? '付帯情報あり顧客 (admin/executive 削除可)' : '付帯情報あり: admin/executive のみ削除可')
                              : ''
                          }
                          onClick={() => canDeleteThis && setDeleteId(customer.id)}
                          className={`px-2.5 py-1 text-xs border rounded-lg ${
                            canDeleteThis
                              ? 'text-red-700 border-red-300 hover:bg-red-50'
                              : 'text-red-300 border-red-200 opacity-50 cursor-not-allowed pointer-events-none'
                          }`}
                          aria-label={`${customer.name} を削除`}
                          aria-disabled={!canDeleteThis}
                        >
                          🗑 削除
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Customer Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="新しい顧客を追加" size="md">
        <CustomerForm
          onSave={(data) => {
            addCustomer({ ...data, id: '', status: 'active', tags: data.tags ?? [], memo: data.memo ?? '' } as Omit<Customer, 'id'>);
            setShowNew(false);
            addToast({ type: 'success', message: '顧客を追加しました' });
          }}
          onCancel={() => setShowNew(false)}
        />
      </Modal>

      {/* Edit Modal */}
      {editingCustomer && (
        <Modal open={!!editId} onClose={() => setEditId(null)} title="顧客を編集" size="md">
          <CustomerForm
            initial={editingCustomer}
            onSave={(data) => {
              updateCustomer(editingCustomer.id, data);
              setEditId(null);
              addToast({ type: 'success', message: '変更を保存しました' });
            }}
            onCancel={() => setEditId(null)}
          />
          {/* CUS-3: 編集モーダル内の危険ゾーン (削除・無効化) */}
          {(currentRole !== undefined) && (
            <div className="mt-6 pt-4 border-t border-red-100">
              <p className="text-xs font-semibold text-red-700 mb-2">⚠ 危険ゾーン</p>
              <div className="flex gap-2 flex-wrap">
                {canDeactivate && editingCustomer.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => { setEditId(null); setDeactivateId(editingCustomer.id); }}
                    className="px-3 py-1.5 text-xs text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-50"
                  >
                    🚫 無効化する
                  </button>
                )}
                {(() => {
                  const modalHasAttach = hasCustomerAttachment(attachmentState, editingCustomer.id);
                  const modalCanDelete = canDeleteCustomer(attachmentState, editingCustomer.id, currentRole);
                  return (
                    <button
                      type="button"
                      disabled={!modalCanDelete}
                      title={
                        modalHasAttach
                          ? (modalCanDelete ? '付帯情報あり顧客 (admin/executive 削除可)' : '付帯情報あり: admin/executive のみ削除可')
                          : ''
                      }
                      onClick={() => { if (modalCanDelete) { setEditId(null); setDeleteId(editingCustomer.id); } }}
                      className={`px-3 py-1.5 text-xs border rounded-lg font-medium ${
                        modalCanDelete
                          ? 'text-red-700 border-red-300 hover:bg-red-50'
                          : 'text-red-300 border-red-200 opacity-50 cursor-not-allowed pointer-events-none'
                      }`}
                      aria-label={`${editingCustomer.name} を完全削除`}
                      aria-disabled={!modalCanDelete}
                    >
                      🗑 この顧客を削除
                    </button>
                  );
                })()}
              </div>
              <p className="text-[10px] text-gray-500 mt-1.5">削除は不可逆です。予定・履歴を保全したい場合は「無効化」を推奨します。</p>
            </div>
          )}
        </Modal>
      )}

      {/* Deactivate Confirm */}
      <ConfirmDialog
        open={!!deactivateId}
        onClose={() => setDeactivateId(null)}
        onConfirm={() => {
          deactivateCustomer(deactivateId!);
          addToast({ type: 'info', message: '顧客を無効化しました' });
        }}
        title="顧客を無効化しますか？"
        message={
          <div className="space-y-2">
            <p>「{customers.find(c => c.id === deactivateId)?.name}」を無効化します。</p>
            <p className="text-sm text-gray-500">⚠ 過去の日報からは引き続き参照できますが、新規日報の顧客選択候補からは外れます。</p>
          </div>
        }
        confirmLabel="無効化する"
      />

      {/* CUS-3: Delete Confirm (完全削除) */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          // P0 defense-in-depth: ダイアログ表示中に状態が変わっていても再判定
          if (deleteId && !canDeleteCustomer(attachmentState, deleteId, currentRole)) {
            addToast({ type: 'error', message: '付帯情報あり顧客は admin/executive のみ削除可能です' });
            setDeleteId(null);
            return;
          }
          deleteCustomer(deleteId!);
          addToast({ type: 'success', message: '顧客を削除しました' });
          setDeleteId(null);
        }}
        title="顧客を完全に削除しますか？"
        message={
          <div className="space-y-2">
            <p>「{customers.find(c => c.id === deleteId)?.name}」を削除します。</p>
            <p className="text-sm text-red-600">❌ この操作は取り消しできません。過去の日報では顧客名が「不明」と表示されます。</p>
            <p className="text-xs text-gray-500">手順保全が要な場合は「無効化」を推奨します。</p>
          </div>
        }
        confirmLabel="削除する"
      />
    </div>
  );
}
