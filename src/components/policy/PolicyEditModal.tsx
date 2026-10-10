import { useState } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../../store';
import type { Policy, PolicyStatus, PayMode, ProductCategory } from '../../types';

const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  life: '生命保険', medical: '医療保険', cancer: 'がん保険',
  income: '就業不能保険', nursing: '介護保険', savings: '学資・貯蓄',
  auto: '自動車保険', fire: '火災保険', liability: '賠償責任保険', other: 'その他',
};

const STATUS_LABELS: Record<PolicyStatus, string> = {
  inforce: '有効中', pending: '申込中', lapsed: '失効',
  surrendered: '解約', matured: '満期', paid_up: '払済', reduced: '減額',
};

const PAY_MODE_LABELS: Record<PayMode, string> = {
  monthly: '月払', semi_annual: '半年払', annual: '年払', lump_sum: '一括払',
};

interface Props {
  householdId: string;
  policy?: Policy;
  onClose: () => void;
}

type Draft = Omit<Policy, 'id' | 'createdAt' | 'updatedAt' | 'coverages'>;

export function PolicyEditModal({ householdId, policy, onClose }: Props) {
  const { addPolicy, updatePolicy, getPersonsByHousehold, currentUserId, addToast } = useAppStore();
  const persons = getPersonsByHousehold(householdId);

  const [draft, setDraft] = useState<Draft>(() => policy
    ? { ...policy }
    : {
        householdId,
        ownerId: currentUserId,
        contractorPersonId: persons[0]?.id ?? '',
        insuredPersonIds: persons[0]?.id ? [persons[0].id] : [],
        insurer: '',
        productName: '',
        productCategory: 'life',
        status: 'pending',
        startDate: new Date().toISOString().slice(0, 10),
        monthlyPremium: 0,
        payMode: 'monthly',
        hasCashValue: false,
        tags: [],
        memo: '',
      }
  );

  const set = <K extends keyof Draft>(key: K, val: Draft[K]) =>
    setDraft(d => ({ ...d, [key]: val }));

  const handleSave = () => {
    if (!draft.insurer || !draft.productName) {
      addToast({ type: 'error', message: '保険会社・商品名は必須です' });
      return;
    }
    if (policy) {
      updatePolicy(policy.id, draft);
      addToast({ type: 'success', message: '契約を更新しました' });
    } else {
      addPolicy({ ...draft, coverages: [] });
      addToast({ type: 'success', message: '契約を追加しました' });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {policy ? '契約を編集' : '新規契約'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Product */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">商品カテゴリ *</label>
              <select
                value={draft.productCategory}
                onChange={e => set('productCategory', e.target.value as ProductCategory)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {(Object.keys(PRODUCT_CATEGORY_LABELS) as ProductCategory[]).map(k => (
                  <option key={k} value={k}>{PRODUCT_CATEGORY_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ステータス</label>
              <select
                value={draft.status}
                onChange={e => set('status', e.target.value as PolicyStatus)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {(Object.keys(STATUS_LABELS) as PolicyStatus[]).map(k => (
                  <option key={k} value={k}>{STATUS_LABELS[k]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">保険会社 *</label>
            <input
              value={draft.insurer}
              onChange={e => set('insurer', e.target.value)}
              placeholder="例: 日本生命"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">商品名 *</label>
            <input
              value={draft.productName}
              onChange={e => set('productName', e.target.value)}
              placeholder="例: ニッセイ終身保険"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">証券番号</label>
            <input
              value={draft.policyNumber ?? ''}
              onChange={e => set('policyNumber', e.target.value || undefined)}
              placeholder="発行後に入力"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* Persons */}
          {persons.length > 0 && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">契約者</label>
                <select
                  value={draft.contractorPersonId}
                  onChange={e => set('contractorPersonId', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">主被保険者</label>
                <select
                  value={draft.insuredPersonIds[0] ?? ''}
                  onChange={e => set('insuredPersonIds', [e.target.value])}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">契約日</label>
              <input
                type="date"
                value={draft.startDate}
                onChange={e => set('startDate', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">満期日</label>
              <input
                type="date"
                value={draft.maturityDate ?? ''}
                onChange={e => set('maturityDate', e.target.value || undefined)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          {/* Premium */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">月払換算 (円)</label>
              <input
                type="number"
                value={draft.monthlyPremium}
                onChange={e => set('monthlyPremium', Number(e.target.value))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">払込方法</label>
              <select
                value={draft.payMode}
                onChange={e => set('payMode', e.target.value as PayMode)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {(Object.keys(PAY_MODE_LABELS) as PayMode[]).map(k => (
                  <option key={k} value={k}>{PAY_MODE_LABELS[k]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hasCashValue"
              checked={draft.hasCashValue}
              onChange={e => set('hasCashValue', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="hasCashValue" className="text-sm text-gray-700">解約返戻金あり</label>
          </div>

          {draft.hasCashValue && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">現在の解約返戻金 (円)</label>
              <input
                type="number"
                value={draft.cashValue ?? ''}
                onChange={e => set('cashValue', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">メモ</label>
            <textarea
              value={draft.memo}
              onChange={e => set('memo', e.target.value)}
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
          >
            {policy ? '更新する' : '追加する'}
          </button>
        </div>
      </div>
    </div>
  );
}
