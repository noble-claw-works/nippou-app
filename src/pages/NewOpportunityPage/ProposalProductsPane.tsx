// ProposalProductsPane.tsx — 新規案件作成③ペイン: 提案商品のインライン追加・編集・削除（11/08 指示書 design.md §1.6）
// 保存は案件作成時にまとめて行う（下書きの proposalProducts を書き換えるだけ）。

import { useState } from 'react';
import { ShieldPlus, Pencil, Trash2 } from 'lucide-react';
import type { ProposalProduct } from '../../types';
import { useAppStore } from '../../store';
import { ProposalProductInlineForm } from '../../components/opportunity/ProposalProductInlineForm';
import { PRODUCT_CATEGORY_LABELS } from '../../components/opportunity/proposalProductMeta';
import { formatMonthlyTotal, sumMonthlyPremium } from './newOpportunityDraft';

interface Props {
  householdId: string;
  products: ProposalProduct[];
  onChange: (products: ProposalProduct[]) => void;
}

/** 開いているフォーム: 追加 / 編集中の id / なし（同時に 1 つだけ） */
type Editing = 'add' | string | null;

export function ProposalProductsPane({ householdId, products, onChange }: Props) {
  const { persons } = useAppStore();
  const [editing, setEditing] = useState<Editing>(null);
  const personName = (id: string) => persons.find(p => p.id === id)?.name ?? '';

  const handleAdd = (p: ProposalProduct) => {
    onChange([...products, p]);
    setEditing(null);
  };
  const handleUpdate = (p: ProposalProduct) => {
    onChange(products.map(x => (x.id === p.id ? p : x)));
    setEditing(null);
  };
  const handleDelete = (id: string) => {
    onChange(products.filter(x => x.id !== id));
    if (editing === id) setEditing(null);
  };

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">提案商品</h3>
        <button
          type="button"
          onClick={() => setEditing(v => (v === 'add' ? null : 'add'))}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ShieldPlus className="w-3 h-3" />
          {editing === 'add' ? '閉じる' : '追加'}
        </button>
      </div>

      {editing === 'add' && (
        <ProposalProductInlineForm
          mode="add"
          householdId={householdId}
          onSave={handleAdd}
          onCancel={() => setEditing(null)}
        />
      )}

      {products.length === 0 ? (
        editing !== 'add' && (
          <div className="flex flex-col items-center gap-2 text-gray-400 py-8">
            <p className="text-sm">提案商品が登録されていません</p>
            <button type="button" onClick={() => setEditing('add')} className="text-xs text-blue-600 hover:underline">
              + 提案商品を追加
            </button>
          </div>
        )
      ) : (
        <ul className="divide-y divide-gray-100">
          {products.map(p =>
            editing === p.id ? (
              <li key={p.id}>
                <ProposalProductInlineForm
                  mode="edit"
                  initial={p}
                  householdId={householdId}
                  onSave={handleUpdate}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={p.id} className="px-3 py-2 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">{p.productName}</span>
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                      {PRODUCT_CATEGORY_LABELS[p.productCategory]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {p.insurer}
                    {p.insuredPersonId && personName(p.insuredPersonId) && ` · 被保険者 ${personName(p.insuredPersonId)}`}
                  </p>
                  <p className="text-xs text-gray-700">¥{p.monthlyPremium.toLocaleString()} / 月</p>
                </div>
                <button
                  type="button"
                  aria-label={`${p.productName} を編集`}
                  onClick={() => setEditing(p.id)}
                  className="p-1 text-gray-400 hover:text-blue-600"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  aria-label={`${p.productName} を削除`}
                  onClick={() => handleDelete(p.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </li>
            ),
          )}
        </ul>
      )}

      {products.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 text-xs flex justify-between text-gray-600">
          <span>{products.length}件</span>
          <span className="font-medium text-gray-800">{formatMonthlyTotal(sumMonthlyPremium(products))}</span>
        </div>
      )}
    </div>
  );
}
