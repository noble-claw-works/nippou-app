// PolicyCardInlineEdit.tsx — 商品カードのインライン編集フォーム
import { X } from 'lucide-react';
import type { Person, InsuranceCompany, ProductCategoryMaster } from '../../types';
import { ProductFormFields, type PolicyFormState } from './ProductFormFields';

interface PolicyCardInlineEditProps {
  editForm: PolicyFormState;
  onChange: (patch: Partial<PolicyFormState>) => void;
  hPersons: Person[];
  activeInsurers: InsuranceCompany[];
  activeCategories: ProductCategoryMaster[];
  submitting: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function PolicyCardInlineEdit({
  editForm,
  onChange,
  hPersons,
  activeInsurers,
  activeCategories,
  submitting,
  onSave,
  onCancel,
}: PolicyCardInlineEditProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-amber-700">✏️ 編集中</p>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
          aria-label="キャンセル"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <ProductFormFields
        form={editForm}
        onChange={onChange}
        hPersons={hPersons}
        activeInsurers={activeInsurers}
        activeCategories={activeCategories}
      />
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={submitting}
          className="px-3 py-1.5 text-xs text-white bg-amber-600 rounded hover:bg-amber-700 disabled:opacity-50"
        >
          保存する
        </button>
      </div>
    </div>
  );
}
