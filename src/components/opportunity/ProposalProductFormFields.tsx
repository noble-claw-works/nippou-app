// ProposalProductFormFields.tsx — 提案商品の入力欄 7 項目と検証
// 案件詳細のモーダル（ProposalProductEditModal）と新規案件作成③ペインのインラインフォームで共用する。
// 11/08 指示書 S1 でモーダル本体から中身を変えずに切り出した。

import type { ProductCategory, Person } from '../../types';
import { useAppStore } from '../../store';
import {
  PRODUCT_CATEGORY_LABELS,
  COMMON_INSURERS,
  type ProposalProductDraft,
  type ProposalProductErrors,
} from './proposalProductMeta';

interface Props {
  value: ProposalProductDraft;
  /** 1 項目の変更。呼び出し側で該当エラーも消す */
  onChange: (key: keyof ProposalProductDraft, value: unknown) => void;
  errors: ProposalProductErrors;
  householdId: string;
  /** 保険会社候補の datalist id（同一画面で重複しないよう呼び出し側が渡す） */
  datalistId: string;
}

export function ProposalProductFormFields({ value, onChange, errors, householdId, datalistId }: Props) {
  const { getPersonsByHousehold } = useAppStore();
  const persons: Person[] = getPersonsByHousehold(householdId);
  const form = value;
  const set = onChange;

  return (
    <>
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
        list={datalistId}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.insurer ? 'border-red-400' : 'border-gray-300'}`}
        placeholder="例: 東京海上日動"
        value={form.insurer}
        onChange={e => set('insurer', e.target.value)}
      />
      <datalist id={datalistId}>
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
    </>
  );
}
