// HouseholdDetailPage.tsx — 世帯詳細 (Phase 1: 世帯員セクション追加)

import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MapPin, Tag, Edit, Clock, User as UserIcon, FileText, CheckCircle2, Calendar as CalendarIcon } from 'lucide-react';
import { useAppStore } from '../store';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PersonEditModal } from '../components/household/PersonEditModal';
import { BLOCK_EMOJIS, BLOCK_LABELS } from '../utils';
import type { Customer, CustomerType, Person, PersonRelation, PersonGender } from '../types';

const TYPE_LABELS: Record<CustomerType, string> = { individual: '個人', corporate: '法人', prospect: '見込み' };
const RELATION_LABELS: Record<PersonRelation, string> = {
  head: '世帯主', spouse: '配偶者', child: '子', parent: '親', sibling: '兄弟姉妹', other: 'その他',
};
const GENDER_LABELS: Record<PersonGender, string> = { M: '男性', F: '女性', other: 'その他' };

function calcAge(birthDate?: string): string {
  if (!birthDate) return '';
  const birth = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear()
    - (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) ? 1 : 0);
  return `${age}歳`;
}

function CustomerEditForm({ initial, onSave, onCancel }: {
  initial: Customer;
  onSave: (data: Partial<Customer>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<Customer>>({ ...initial });
  const { users } = useAppStore();
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">世帯名</label>
        <input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">エリア</label>
        <input value={form.area ?? ''} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">主担当</label>
        <select value={form.primaryUserId ?? ''} onChange={e => setForm(f => ({ ...f, primaryUserId: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
          {users.filter(u => u.status === 'active').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">家族構成メモ</label>
        <textarea value={form.familyMemo ?? ''} onChange={e => setForm(f => ({ ...f, familyMemo: e.target.value }))}
          rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
        <textarea value={form.memo ?? ''} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
          rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">キャンセル</button>
        <button onClick={() => onSave(form)} disabled={!form.name?.trim()}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">保存</button>
      </div>
    </div>
  );
}

export function HouseholdDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.hash === '#history') {
      const el = document.getElementById('history');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  const {
    customers, users, reports, persons,
    currentRole, updateCustomer, deactivateCustomer, addToast,
    addPerson, updatePerson, deletePerson,
  } = useAppStore();

  const [showEdit, setShowEdit] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [editPersonId, setEditPersonId] = useState<string | null>(null);
  const [deletePersonId, setDeletePersonId] = useState<string | null>(null);

  const customer = customers.find(c => c.id === customerId);
  if (!customer) return <div className="px-4 py-8"><EmptyState icon="🔍" title="世帯が見つかりません" /></div>;

  const primaryUser = users.find(u => u.id === customer.primaryUserId);

  const householdPersons = useMemo(
    () => persons.filter(p => p.householdId === customerId).sort((a, b) => {
      const order: Record<PersonRelation, number> = { head: 0, spouse: 1, child: 2, parent: 3, sibling: 4, other: 5 };
      return (order[a.relation] ?? 9) - (order[b.relation] ?? 9);
    }),
    [persons, customerId]
  );

  const historyEntries = useMemo(() => {
    const entries: Array<{
      reportId: string;
      reportDate: string;
      reportUserId: string;
      block: typeof reports[number]['blocks'][number];
    }> = [];
    for (const r of reports) {
      for (const b of r.blocks) {
        if (b.customerId === customerId) {
          entries.push({ reportId: r.id, reportDate: r.date, reportUserId: r.userId, block: b });
        }
      }
    }
    entries.sort((a, b) => {
      if (a.reportDate !== b.reportDate) return a.reportDate < b.reportDate ? 1 : -1;
      return (a.block.startTime || '') < (b.block.startTime || '') ? 1 : -1;
    });
    return entries;
  }, [reports, customerId]);

  const canEdit = currentRole === 'manager' || currentRole === 'admin';
  const canDeactivate = currentRole === 'admin';
  const editingPerson = editPersonId ? householdPersons.find(p => p.id === editPersonId) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <button onClick={() => navigate('/households')}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4" /> 世帯一覧へ
      </button>

      {/* 世帯情報カード */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">🏠 {customer.name}</h1>
              {customer.isFavorite && <span>⭐</span>}
              {customer.status === 'inactive' && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">無効</span>}
            </div>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{TYPE_LABELS[customer.type]}</span>
          </div>
          <div className="flex gap-2">
            {canEdit && <button onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              <Edit className="w-4 h-4" /> 編集
            </button>}
            {canDeactivate && customer.status === 'active' && (
              <button onClick={() => setDeactivating(true)}
                className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                無効化
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">エリア:</span>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span>{customer.area || '未設定'}</span>
            </div>
          </div>
          <div>
            <span className="text-gray-500">主担当:</span>
            <p className="mt-0.5">{primaryUser?.name ?? '未設定'}</p>
          </div>
          <div>
            <span className="text-gray-500">最終接触:</span>
            <p className="mt-0.5">{customer.lastContactDate ?? '未記録'}</p>
          </div>
          <div>
            <span className="text-gray-500">次回AP:</span>
            <p className="mt-0.5 text-blue-600">{customer.nextAppointment ?? '未設定'}</p>
          </div>
        </div>

        {customer.familyMemo && (
          <div className="mt-4">
            <span className="text-xs text-gray-500 block mb-1">家族構成メモ:</span>
            <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-3">{customer.familyMemo}</p>
          </div>
        )}

        {customer.tags.length > 0 && (
          <div className="mt-4">
            <span className="text-xs text-gray-500 block mb-1">タグ:</span>
            <div className="flex gap-1 flex-wrap">
              {customer.tags.map(tag => (
                <span key={tag} className="flex items-center gap-0.5 text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                  <Tag className="w-2.5 h-2.5" />{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {customer.memo && (
          <div className="mt-4">
            <span className="text-xs text-gray-500 block mb-1">メモ:</span>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{customer.memo}</p>
          </div>
        )}
      </div>

      {/* 👨‍👩‍👧 世帯員セクション */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">👨‍👩‍👧 世帯員 ({householdPersons.length}名)</h2>
          <button
            onClick={() => setShowAddPerson(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50"
          >
            + 世帯員を追加
          </button>
        </div>

        {householdPersons.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">世帯員が登録されていません</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {householdPersons.map(person => (
              <div key={person.id} className="border border-gray-200 rounded-lg p-3 hover:border-blue-200 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 text-sm">{person.name}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                        {RELATION_LABELS[person.relation]}
                      </span>
                      {person.relation === 'head' && <span className="text-xs text-yellow-600">👑</span>}
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      {person.kana && <p>{person.kana}</p>}
                      <div className="flex gap-3 flex-wrap">
                        {person.gender && <span>{GENDER_LABELS[person.gender]}</span>}
                        {person.birthDate && <span>{person.birthDate} ({calcAge(person.birthDate)})</span>}
                        {person.occupation && <span>職業: {person.occupation}</span>}
                      </div>
                      <div className="flex gap-2 flex-wrap mt-1">
                        {person.smoker && <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded text-[10px]">🚬 喫煙</span>}
                        {person.healthNotes && (
                          <span className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-[10px]" title={person.healthNotes}>
                            🏥 {person.healthNotes.length > 12 ? person.healthNotes.slice(0, 12) + '…' : person.healthNotes}
                          </span>
                        )}
                      </div>
                      {person.memo && <p className="text-gray-600 mt-1">{person.memo}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 ml-2">
                    <button
                      onClick={() => setEditPersonId(person.id)}
                      className="px-2 py-1 text-[10px] text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
                    >
                      ✎ 編集
                    </button>
                    <button
                      onClick={() => setDeletePersonId(person.id)}
                      className="px-2 py-1 text-[10px] text-red-600 border border-red-200 rounded hover:bg-red-50"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 対応履歴 */}
      <section id="history" className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">📅 対応履歴 ({historyEntries.length}件)</h2>
          {historyEntries.length > 0 && <span className="text-xs text-gray-400">新しい順</span>}
        </div>
        {historyEntries.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">対応履歴がありません</p>
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-blue-200 via-blue-100 to-transparent" aria-hidden="true" />
            <ul className="space-y-3">
              {historyEntries.map(({ reportDate, reportUserId, block }) => {
                const handler = users.find(u => u.id === reportUserId);
                const hasResult = !!(block.result || block.proposal || block.collected || block.nextAppointment);
                const typeAccent: Record<string, string> = {
                  visit: 'border-l-blue-400 bg-blue-50/30',
                  office: 'border-l-gray-400 bg-gray-50/30',
                  phone: 'border-l-amber-400 bg-amber-50/30',
                  travel: 'border-l-emerald-400 bg-emerald-50/30',
                  break: 'border-l-pink-300 bg-pink-50/30',
                  meeting: 'border-l-purple-400 bg-purple-50/30',
                  lunch: 'border-l-orange-400 bg-orange-50/30',
                };
                return (
                  <li key={block.id} className="relative">
                    <span className="absolute -left-[18px] top-3 w-3 h-3 rounded-full bg-white border-2 border-blue-400 shadow-sm" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => navigate(`/reports/${reportDate}`)}
                      className={`block w-full text-left rounded-lg border border-gray-200 border-l-4 ${typeAccent[block.type] ?? 'border-l-gray-300 bg-gray-50/30'} p-3 hover:shadow-md hover:border-blue-300 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      aria-label={`${reportDate} ${block.startTime}〜${block.endTime} ${BLOCK_LABELS[block.type]} の日報を開く`}
                    >
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1.5">
                        <span className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                          {reportDate}
                        </span>
                        <span className="text-xs text-gray-600 tabular-nums inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {block.startTime || '--:--'} 〜 {block.endTime || '--:--'}
                        </span>
                        <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                          {BLOCK_EMOJIS[block.type]} {BLOCK_LABELS[block.type]}
                        </span>
                      </div>
                      {block.title && <p className="text-sm font-medium text-gray-900 mb-1">{block.title}</p>}
                      {block.memo && <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mb-2 leading-relaxed">{block.memo}</p>}
                      {hasResult && (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                          {block.result && (
                            <div className="flex items-start gap-1.5 bg-white rounded px-2 py-1.5 border border-gray-100">
                              <FileText className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
                              <div className="min-w-0">
                                <span className="block text-[10px] text-gray-500 uppercase tracking-wide">結果</span>
                                <span className="text-gray-800">{block.result}</span>
                              </div>
                            </div>
                          )}
                          {block.proposal && (
                            <div className="flex items-start gap-1.5 bg-white rounded px-2 py-1.5 border border-gray-100">
                              <span className="text-purple-600 flex-shrink-0">💡</span>
                              <div className="min-w-0">
                                <span className="block text-[10px] text-gray-500 uppercase tracking-wide">提案</span>
                                <span className="text-gray-800">{block.proposal}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                        {handler && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                            <UserIcon className="w-3 h-3 text-gray-400" />
                            {handler.name}
                          </span>
                        )}
                        {!block.isActual && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px]">予定</span>}
                        {block.collected && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> 集金済
                          </span>
                        )}
                        {block.nextAppointment && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]">
                            📆 次回: {block.nextAppointment}
                          </span>
                        )}
                        <span className="ml-auto text-[10px] text-blue-600 hover:underline">日報を開く →</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Edit Household Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="世帯を編集" size="md">
        <CustomerEditForm
          initial={customer}
          onSave={(data) => {
            updateCustomer(customer.id, data);
            setShowEdit(false);
            addToast({ type: 'success', message: '変更を保存しました' });
          }}
          onCancel={() => setShowEdit(false)}
        />
      </Modal>

      {/* Add Person Modal */}
      <PersonEditModal
        open={showAddPerson}
        onClose={() => setShowAddPerson(false)}
        title="世帯員を追加"
        onSave={(data) => {
          addPerson(customerId!, data);
          addToast({ type: 'success', message: '世帯員を追加しました' });
        }}
      />

      {/* Edit Person Modal */}
      {editingPerson && (
        <PersonEditModal
          open={!!editPersonId}
          onClose={() => setEditPersonId(null)}
          title="世帯員を編集"
          initial={editingPerson}
          onSave={(data) => {
            updatePerson(editingPerson.id, data);
            setEditPersonId(null);
            addToast({ type: 'success', message: '世帯員を更新しました' });
          }}
        />
      )}

      {/* Delete Person Confirm */}
      <ConfirmDialog
        open={!!deletePersonId}
        onClose={() => setDeletePersonId(null)}
        onConfirm={() => {
          const result = deletePerson(deletePersonId!);
          if (result.ok) {
            addToast({ type: 'success', message: '世帯員を削除しました' });
          } else {
            addToast({ type: 'error', message: result.error ?? '削除に失敗しました' });
          }
          setDeletePersonId(null);
        }}
        title="世帯員を削除しますか？"
        message={
          <div className="space-y-2">
            <p>「{householdPersons.find(p => p.id === deletePersonId)?.name}」を削除します。</p>
            {householdPersons.find(p => p.id === deletePersonId)?.relation === 'head' && householdPersons.length > 1 && (
              <p className="text-sm text-amber-600">⚠ 世帯主を削除します。次の世帯員が自動的に世帯主になります。</p>
            )}
          </div>
        }
        confirmLabel="削除する"
      />

      {/* Deactivate Household Confirm */}
      <ConfirmDialog open={deactivating} onClose={() => setDeactivating(false)}
        onConfirm={() => { deactivateCustomer(customer.id); addToast({ type: 'info', message: '無効化しました' }); navigate('/households'); }}
        title="世帯を無効化しますか？"
        message={`「${customer.name}」を無効化します。`}
        confirmLabel="無効化する" />
    </div>
  );
}
