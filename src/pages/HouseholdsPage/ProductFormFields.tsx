// ProductFormFields.tsx — 保険商品フォームの共通フィールド（追加・編集で共用）
// 400行制限遵守のため PoliciesPane.tsx から切り出し

import type { Person, InsuranceCompany, ProductCategoryMaster } from '../../types';

export interface PolicyFormState {
  insuredPersonId: string;
  insurerId: string;
  productCategoryId: string;
  monthlyPremium: string;
  firstYearCommission: string;
  firstConsultDate: string;
}

interface ProductFormFieldsProps {
  form: PolicyFormState;
  onChange: (patch: Partial<PolicyFormState>) => void;
  hPersons: Person[];
  activeInsurers: InsuranceCompany[];
  activeCategories: ProductCategoryMaster[];
}

export function ProductFormFields({
  form,
  onChange,
  hPersons,
  activeInsurers,
  activeCategories,
}: ProductFormFieldsProps) {
  return (
    <div className="space-y-2">
      {/* 被保険者 */}
      <div>
        <label className="block text-[10px] text-gray-500 mb-0.5">
          被保険者 <span className="text-red-500">*</span>
        </label>
        {hPersons.length === 0 ? (
          <p className="text-xs text-amber-600">先に②ペインで構成員を追加してください</p>
        ) : (
          <select
            value={form.insuredPersonId}
            onChange={e => onChange({ insuredPersonId: e.target.value })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">選択してください</option>
            {hPersons.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* 保険会社 */}
      <div>
        <label className="block text-[10px] text-gray-500 mb-0.5">
          保険会社 <span className="text-red-500">*</span>
        </label>
        {activeInsurers.length === 0 ? (
          <p className="text-xs text-amber-600">設定→保険会社マスタで追加してください</p>
        ) : (
          <select
            value={form.insurerId}
            onChange={e => onChange({ insurerId: e.target.value })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">選択してください</option>
            {activeInsurers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* 種目 */}
      <div>
        <label className="block text-[10px] text-gray-500 mb-0.5">
          種目 <span className="text-red-500">*</span>
        </label>
        {activeCategories.length === 0 ? (
          <p className="text-xs text-amber-600">設定→種目マスタで追加してください</p>
        ) : (
          <select
            value={form.productCategoryId}
            onChange={e => onChange({ productCategoryId: e.target.value })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">選択してください</option>
            {activeCategories
              .sort((a, b) => a.order - b.order)
              .map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
        )}
      </div>

      {/* 月払保険料 */}
      <div>
        <label className="block text-[10px] text-gray-500 mb-0.5">
          月払保険料 <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={form.monthlyPremium}
            onChange={e => onChange({ monthlyPremium: e.target.value })}
            placeholder="例: 15000"
            min={0}
            className="w-32 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <span className="text-xs text-gray-500">円/月</span>
        </div>
      </div>

      {/* 初年度手数料 */}
      <div>
        <label className="block text-[10px] text-gray-500 mb-0.5">
          初年度手数料（円・手入力）
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={form.firstYearCommission}
            onChange={e => onChange({ firstYearCommission: e.target.value })}
            placeholder="例: 50000"
            min={0}
            className="w-32 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <span className="text-xs text-gray-500">円</span>
        </div>
      </div>

      {/* 初回相談日 */}
      <div>
        <label className="block text-[10px] text-gray-500 mb-0.5">
          初回相談日
        </label>
        <input
          type="date"
          value={form.firstConsultDate}
          onChange={e => onChange({ firstConsultDate: e.target.value })}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
    </div>
  );
}
