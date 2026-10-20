import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { ProposalProduct, ProductCategory } from '../../types';
import { ProposalProductEditModal } from './ProposalProductEditModal';

// =====================================================
// ProposalProductListEditor — 新規案件作成用の提案商品行リスト
// ProposalProductEditModal を再利用して行を 追加/編集/削除 する
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

interface Props {
  householdId: string;
  products: ProposalProduct[];
  onChange: (products: ProposalProduct[]) => void;
}

export function ProposalProductListEditor({ householdId, products, onChange }: Props) {
  // editing: undefined=closed, null=new, ProposalProduct=edit existing
  const [editing, setEditing] = useState<ProposalProduct | null | undefined>(undefined);

  const handleSave = (product: ProposalProduct) => {
    const exists = products.some(p => p.id === product.id);
    if (exists) {
      onChange(products.map(p => (p.id === product.id ? product : p)));
    } else {
      onChange([...products, product]);
    }
    setEditing(undefined);
  };

  const handleRemove = (id: string) => {
    onChange(products.filter(p => p.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">提案商品 (任意)</label>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
        >
          <Plus className="w-3.5 h-3.5" /> 追加
        </button>
      </div>

      {products.length === 0 ? (
        <p className="text-xs text-gray-400 py-1">まだ提案商品はありません</p>
      ) : (
        <ul className="space-y-1.5">
          {products.map(p => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px]">
                    {PRODUCT_CATEGORY_LABELS[p.productCategory]}
                  </span>
                  <span className="font-medium text-gray-800 truncate">{p.productName || '(商品名未入力)'}</span>
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {p.insurer || '保険会社未入力'} · 月払 {p.monthlyPremium.toLocaleString()}円
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditing(p)}
                  className="p-1 text-gray-400 hover:text-blue-600"
                  aria-label="編集"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(p.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  aria-label="削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing !== undefined && (
        <ProposalProductEditModal
          product={editing ?? undefined}
          opportunityId=""
          householdId={householdId}
          onClose={() => setEditing(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
