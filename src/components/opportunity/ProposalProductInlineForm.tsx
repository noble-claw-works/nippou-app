// ProposalProductInlineForm.tsx — 提案商品のインライン追加・編集フォーム（11/08 指示書 design.md §1.6）
// 入力欄はモーダルと同じ ProposalProductFormFields。ペインの中に差し込んで使う。

import { useState } from 'react';
import type { ProposalProduct } from '../../types';
import { ProposalProductFormFields } from './ProposalProductFormFields';
import {
  emptyProposalProduct,
  newProposalProductId,
  validateProposalProduct,
  type ProposalProductDraft,
  type ProposalProductErrors,
} from './proposalProductMeta';

interface Props {
  mode: 'add' | 'edit';
  initial?: ProposalProduct;
  householdId: string;
  onSave: (product: ProposalProduct) => void;
  onCancel: () => void;
}

export function ProposalProductInlineForm({ mode, initial, householdId, onSave, onCancel }: Props) {
  const [form, setForm] = useState<ProposalProductDraft>(() => {
    if (!initial) return emptyProposalProduct();
    const { id: _id, ...rest } = initial;
    void _id;
    return rest;
  });
  const [errors, setErrors] = useState<ProposalProductErrors>({});

  const set = (key: keyof ProposalProductDraft, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      const e = { ...prev };
      delete e[key as keyof ProposalProductErrors];
      return e;
    });
  };

  const handleSave = () => {
    const e = validateProposalProduct(form);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    onSave({
      ...form,
      id: mode === 'edit' && initial ? initial.id : newProposalProductId(),
      productName: form.productName.trim(),
      insurer: form.insurer.trim(),
    });
  };

  return (
    <div className="px-3 py-3 border-b border-blue-100 bg-blue-50 space-y-3">
      <p className="text-xs font-semibold text-blue-700">{mode === 'add' ? '提案商品を追加' : '提案商品を編集'}</p>
      <ProposalProductFormFields
        value={form}
        onChange={set}
        errors={errors}
        householdId={householdId}
        datalistId={`insurers-inline-${mode}`}
      />
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {mode === 'add' ? '追加する' : '保存する'}
        </button>
      </div>
    </div>
  );
}
