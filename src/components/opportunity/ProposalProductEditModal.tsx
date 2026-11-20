import { useState } from 'react';
import { X } from 'lucide-react';
import type { ProposalProduct } from '../../types';
import {
  newProposalProductId,
  validateProposalProduct,
  type ProposalProductErrors,
} from './proposalProductMeta';
import { ProposalProductFormFields } from './ProposalProductFormFields';

// =====================================================
// ProposalProductEditModal — 提案商品編集モーダル
// =====================================================

interface Props {
  product?: ProposalProduct;  // undefined = new
  opportunityId: string;
  householdId: string;
  onClose: () => void;
  onSave: (product: ProposalProduct) => void;
}

export function ProposalProductEditModal({ product, householdId, onClose, onSave }: Props) {
  const [form, setForm] = useState<Omit<ProposalProduct, 'id'>>({
    productCategory: product?.productCategory ?? 'life',
    productName: product?.productName ?? '',
    insurer: product?.insurer ?? '',
    insuredPersonId: product?.insuredPersonId ?? '',
    monthlyPremium: product?.monthlyPremium ?? 0,
    faceAmount: product?.faceAmount,
    memo: product?.memo ?? '',
  });
  const [errors, setErrors] = useState<ProposalProductErrors>({});

  const set = (key: keyof typeof form, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const e = { ...prev }; delete e[key as keyof ProposalProductErrors]; return e; });
  };

  const validate = () => {
    const e = validateProposalProduct(form);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      ...form,
      id: product?.id ?? newProposalProductId(),
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
          <ProposalProductFormFields
            value={form}
            onChange={set}
            errors={errors}
            householdId={householdId}
            datalistId="insurers-list"
          />
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
