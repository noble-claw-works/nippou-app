import { useState } from 'react';
import { X } from 'lucide-react';
import type { ProposalProduct, ProductCategory, Person } from '../../types';
import { useAppStore } from '../../store';

// =====================================================
// ProposalProductEditModal — 提案商品編集モーダル
// =====================================================

const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  life:      '生命保険',
  medical:   '医療保険',
  cancer:    'がん保険',
  income:    '就業不能保険',
  nursing:   '介護保険',
  savings:   '学資・貯蓄',
  auto:      '自動車保険',
  fire:      '火災保険',
  liability: '賠償責任保険',
  other:     'その他',
};

const COMMON_INSURERS = [
  '東京海上日動', '損保ジャパン', '三井住友海上',
  '明治安田生命', 'ソニー生命', '住友生命', '日本生命',
  '第一生命', '東京海上日動あんしん生命', 'アフラック',
  'その他',
];

interface Props {
  product?: ProposalProduct;  // undefined = new
  opportunityId: string;
  householdId: string;
  onClose: () => void;
  onSave: (product: ProposalProduct) => void;
}

function uid() { return `pp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

export function ProposalProductEditModal({ product, opportunityId, householdId, onClose, onSave }: Props) {
  const { getPersonsByHousehold } = useAppStore();
  const persons: Person[] = getPersonsByHousehold(householdId);

  const [form, setForm] = useState<Omit<ProposalProduct, 'id'>>({
    productCategory: product?.productCategory ?? 'life',
    productName: product?.productName ?? '',
    insurer: product?.insurer ?? '',
    insuredPersonId: product?.insuredPersonId ?? '',
    monthlyPremium: product?.monthlyPremium ?? 0,
    faceAmount: product?.faceAmount,
    memo: product?.memo ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof typeof form, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.productName.trim()) e.productName = '商品名は必須です';
    if (!form.insurer.trim()) e.insurer = '保険会社は必須です';
    if (form.monthlyPremium <= 0) e.monthlyPremium = '月払額を入力してください';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      ...form,
      id: product?.id ?? uid(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-gray-800">
            {product ? '提案商品を編集' : '提案商品を追加'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">商品カテゴリ</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.productCategory}
              onChange={e => set('productCategory', e.target.value as ProductCategory)}
            >
              {(Object.entries(PRODUCT_CATEGORY_LABELS) as [ProductCategory, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Product name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              商品名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.productName ? 'border-red-400' : 'border-gray-300'}`}
              placeholder="例: 収入保障保険"
              value={form.productName}
              onChange={e => set('productName', e.target.value)}
            />
            {errors.productName && <p className="text-xs text-red-500 mt-1">{errors.productName}</p>}
          </div>

          {/* Insurer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              保険会社 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              list="insurers-list"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.insurer ? 'border-red-400' : 'border-gray-300'}`}
              placeholder="例: 東京海上日動"
              value={form.insurer}
              onChange={e => set('insurer', e.target.value)}
            />
            <datalist id="insurers-list">
              {COMMON_INSURERS.map(i => <option key={i} value={i} />)}
            </datalist>
            {errors.insurer && <p className="text-xs text-red-500 mt-1">{errors.insurer}</p>}
          </div>

          {/* Insured person */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">被保険者</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.insuredPersonId}
              onChange={e => set('insuredPersonId', e.target.value)}
            >
              <option value="">（未選択）</option>
              {persons.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Monthly premium */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              月払額 (円) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="100"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.monthlyPremium ? 'border-red-400' : 'border-gray-300'}`}
              placeholder="例: 4800"
              value={form.monthlyPremium || ''}
              onChange={e => set('monthlyPremium', Number(e.target.value))}
            />
            {errors.monthlyPremium && <p className="text-xs text-red-500 mt-1">{errors.monthlyPremium}</p>}
          </div>

          {/* Face amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">保険金額 (円・任意)</label>
            <input
              type="number"
              min="0"
              step="1000000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: 5000000"
              value={form.faceAmount ?? ''}
              onChange={e => set('faceAmount', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>

          {/* Memo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ (任意)</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              placeholder="特約・条件など"
              value={form.memo}
              onChange={e => set('memo', e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-5 pb-5 sticky bottom-0 bg-white border-t pt-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            キャンセル
          </button>
          <button type="button" onClick={handleSave} className="px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg">
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
