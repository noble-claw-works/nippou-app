import { Copy, Trash2 } from "lucide-react";
import type { ProposalProduct, ProductCategory } from "../../types";
import { PRODUCT_CATEGORY_LABELS, PRODUCT_CATEGORIES } from "./constants";

interface ProductRowProps {
  product: ProposalProduct;
  persons: Array<{ id: string; name: string }>;
  onUpdate: (patch: Partial<ProposalProduct>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  showDelete: boolean;
}

export function ProductRow({
  product,
  persons,
  onUpdate,
  onDuplicate,
  onDelete,
  showDelete,
}: ProductRowProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* 被保険者 */}
        <div className="flex-1 min-w-[120px]">
          <label className="block text-[10px] text-gray-500 mb-0.5">
            被保険者
          </label>
          <select
            value={product.insuredPersonId ?? ""}
            onChange={(e) => onUpdate({ insuredPersonId: e.target.value })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">─ 選択 ─</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* 種目 */}
        <div className="flex-1 min-w-[100px]">
          <label className="block text-[10px] text-gray-500 mb-0.5">種目</label>
          <select
            value={product.productCategory}
            onChange={(e) =>
              onUpdate({
                productCategory: e.target.value as ProductCategory,
              })
            }
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PRODUCT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {PRODUCT_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* 操作ボタン */}
        <div className="flex gap-1 shrink-0 self-end pb-1">
          <button
            type="button"
            onClick={onDuplicate}
            title="この商品を複製"
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {showDelete && (
            <button
              type="button"
              onClick={onDelete}
              title="この商品を削除"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* 保険会社 */}
        <div className="flex-1 min-w-[120px]">
          <label className="block text-[10px] text-gray-500 mb-0.5">
            保険会社
          </label>
          <input
            type="text"
            value={product.insurer}
            onChange={(e) => onUpdate({ insurer: e.target.value })}
            placeholder="例: ◯◯生命"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 月払保険料 */}
        <div className="w-28">
          <label className="block text-[10px] text-gray-500 mb-0.5">
            月払保険料 (円)
          </label>
          <input
            type="number"
            min={0}
            value={product.monthlyPremium || ""}
            onChange={(e) =>
              onUpdate({ monthlyPremium: Number(e.target.value) || 0 })
            }
            placeholder="0"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
          />
        </div>

        {/* 初年度手数料 */}
        <div className="w-32">
          <label className="block text-[10px] text-gray-500 mb-0.5">
            初年度手数料 (円)
          </label>
          <input
            type="number"
            min={0}
            value={product.firstYearCommission ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              onUpdate({
                firstYearCommission: v === "" ? undefined : Number(v),
              });
            }}
            placeholder="未設定"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
          />
        </div>
      </div>
    </div>
  );
}
