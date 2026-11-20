// ProposalProductFormFields.tsx — 提案商品の入力欄 7 項目と検証
// 案件詳細のモーダル（ProposalProductEditModal）と新規案件作成③ペインのインラインフォームで共用する。
// 11/08 指示書 S1 でモーダル本体から中身を変えずに切り出した。

import type { ProductCategory, Person } from '../../types';
import { useAppStore } from '../../store';
import { InsurerSelect } from '../common/InsurerSelect';
import { ChannelSelect } from '../../pages/HouseholdBatchEntryPage/ChannelSelect';
import {
  PRODUCT_CATEGORY_LABELS,
  type ProposalProductDraft,
  type ProposalProductErrors,
} from './proposalProductMeta';

interface Props {
  value: ProposalProductDraft;
  /** 1 項目の変更。呼び出し側で該当エラーも消す */
  onChange: (key: keyof ProposalProductDraft, value: unknown) => void;
  errors: ProposalProductErrors;
  householdId: string;
  /** 旧: 保険会社候補 datalist の id。B3 でプルダウン化したため未使用（呼び出し側互換のため残置） */
  datalistId?: string;
}

export function ProposalProductFormFields({ value, onChange, errors, householdId }: Props) {
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
      <InsurerSelect
        insurer={form.insurer}
        insurerId={form.insurerId}
        invalid={!!errors.insurer}
        onChange={({ insurer, insurerId }) => {
          set('insurer', insurer);
          set('insurerId', insurerId);
        }}
      />
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

    {/* Contractor（被保険者と別） */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">契約者</label>
      <select
        aria-label="契約者"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={form.contractorPersonId ?? ''}
        onChange={e => set('contractorPersonId', e.target.value || undefined)}
      >
        <option value="">（案件の契約者を使う）</option>
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

    {/* First-year commission */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">初年度手数料 (円・任意)</label>
      <input
        type="number"
        min="0"
        step="1"
        aria-label="初年度手数料"
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.firstYearCommission ? 'border-red-400' : 'border-gray-300'}`}
        placeholder="例: 57600"
        value={form.firstYearCommission ?? ''}
        onChange={e => set('firstYearCommission', e.target.value === '' ? undefined : Number(e.target.value))}
      />
      {form.firstYearCommission !== undefined && !errors.firstYearCommission && (
        <p className="text-xs text-gray-500 mt-1">{form.firstYearCommission.toLocaleString('ja-JP')} 円</p>
      )}
      {errors.firstYearCommission && <p className="text-xs text-red-500 mt-1">{errors.firstYearCommission}</p>}
    </div>

    {/* Channel（紹介元） */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">チャネル（紹介元・任意）</label>
      <ChannelSelect
        channelId={form.channelId}
        onChange={id => set('channelId', id || undefined)}
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
