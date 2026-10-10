// 案件カード（折りたたみ）— オーケストレータ
import { useState, useMemo, useCallback } from "react";
import { Plus } from "lucide-react";
import type {
  ProposalProduct,
  ConfidenceUnified,
  ContractMilestones,
} from "../../types";
import {
  calcTotalMonthlyPremium,
  validateDraft,
  createEmptyProduct,
  duplicateProduct,
  CONFIDENCE_OPTIONS,
  CONFIDENCE_LABELS,
  getMilestoneOrderWarnings,
  createEmptyDeficiency,
  removeDeficiency,
  updateDeficiency,
  type DraftOpportunity,
} from "../../utils/householdBatchEntry";
import { SALES_CHANNELS } from "../../data/salesChannels";
import { ChannelSelect } from "./ChannelSelect";
import { ProductRow } from "./ProductRow";
import { OpportunityCardHeader } from "./OpportunityCardHeader";
import { OpportunityCardDetails } from "./OpportunityCardDetails";

interface OpportunityCardProps {
  draft: DraftOpportunity;
  index: number;
  persons: Array<{ id: string; name: string }>;
  headerContractorId?: string;
  headerChannelId?: string;
  onUpdate: (patch: Partial<DraftOpportunity>) => void;
  onDuplicate: () => void;
  onDeleteRequest: () => void;
  onToggleOpen: () => void;
}

export function OpportunityCard({
  draft,
  index,
  persons,
  headerContractorId,
  onUpdate,
  onDuplicate,
  onDeleteRequest,
  onToggleOpen,
}: OpportunityCardProps) {
  const validation = useMemo(
    () => validateDraft(draft, SALES_CHANNELS),
    [draft],
  );
  const totalPremium = useMemo(
    () => calcTotalMonthlyPremium(draft.proposalProducts),
    [draft.proposalProducts],
  );

  const hasError = !validation.isValid;
  const isOpen = draft._isOpen;

  // 商品操作
  const handleAddProduct = useCallback(() => {
    const newProduct = createEmptyProduct(persons[0]?.id ?? "");
    onUpdate({ proposalProducts: [...draft.proposalProducts, newProduct] });
  }, [draft.proposalProducts, persons, onUpdate]);

  const handleUpdateProduct = useCallback(
    (productId: string, patch: Partial<ProposalProduct>) => {
      const updated = draft.proposalProducts.map((p) =>
        p.id === productId ? { ...p, ...patch } : p,
      );
      onUpdate({ proposalProducts: updated });
    },
    [draft.proposalProducts, onUpdate],
  );

  const handleDuplicateProduct = useCallback(
    (productId: string) => {
      const product = draft.proposalProducts.find((p) => p.id === productId);
      if (!product) return;
      const dup = duplicateProduct(product);
      const idx = draft.proposalProducts.findIndex((p) => p.id === productId);
      const updated = [
        ...draft.proposalProducts.slice(0, idx + 1),
        dup,
        ...draft.proposalProducts.slice(idx + 1),
      ];
      onUpdate({ proposalProducts: updated });
    },
    [draft.proposalProducts, onUpdate],
  );

  const handleDeleteProduct = useCallback(
    (productId: string) => {
      onUpdate({
        proposalProducts: draft.proposalProducts.filter(
          (p) => p.id !== productId,
        ),
      });
    },
    [draft.proposalProducts, onUpdate],
  );

  // 詳細セクションの開閉状態（カード内ローカルstate）
  const [detailsOpen, setDetailsOpen] = useState(false);

  // 今日の日付文字列
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // milestones 操作
  const milestones = useMemo<ContractMilestones>(
    () => draft.milestones ?? {},
    [draft.milestones],
  );
  const milestoneWarnings = useMemo(
    () => getMilestoneOrderWarnings(draft.milestones),
    [draft.milestones],
  );

  const handleMilestoneChange = useCallback(
    (key: keyof ContractMilestones, value: string | undefined) => {
      onUpdate({ milestones: { ...milestones, [key]: value || undefined } });
    },
    [milestones, onUpdate],
  );

  // deficiencies 操作
  const deficiencies = useMemo(
    () => draft.deficiencies ?? [],
    [draft.deficiencies],
  );

  const handleAddDeficiency = useCallback(() => {
    onUpdate({ deficiencies: [...deficiencies, createEmptyDeficiency()] });
  }, [deficiencies, onUpdate]);

  const handleRemoveDeficiency = useCallback(
    (id: string) => {
      onUpdate({ deficiencies: removeDeficiency(deficiencies, id) });
    },
    [deficiencies, onUpdate],
  );

  const handleUpdateDeficiencyField = useCallback(
    (id: string, patch: Parameters<typeof updateDeficiency>[2]) => {
      onUpdate({ deficiencies: updateDeficiency(deficiencies, id, patch) });
    },
    [deficiencies, onUpdate],
  );

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        hasError ? "border-red-300 shadow-sm shadow-red-100" : "border-gray-200"
      }`}
    >
      {/* カードヘッダー */}
      <OpportunityCardHeader
        draft={draft}
        index={index}
        persons={persons}
        headerContractorId={headerContractorId}
        totalPremium={totalPremium}
        hasError={hasError}
        isOpen={isOpen}
        onToggleOpen={onToggleOpen}
        onDuplicate={onDuplicate}
        onDeleteRequest={onDeleteRequest}
      />

      {/* カード本体（開いた時のみ表示） */}
      {isOpen && (
        <div className="p-4 space-y-4 bg-white">
          {/* 案件名 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              案件名
            </label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="案件名を入力"
            />
          </div>

          {/* 確度 + チャネル（必須） */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                確度 <span className="text-red-500">*</span>
              </label>
              <select
                value={draft.confidence ?? ""}
                onChange={(e) =>
                  onUpdate({
                    confidence:
                      (e.target.value as ConfidenceUnified) || undefined,
                  })
                }
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validation.errors.noConfidence
                    ? "border-red-400 bg-red-50"
                    : "border-gray-300"
                }`}
              >
                <option value="">─ 選択してください ─</option>
                {CONFIDENCE_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {CONFIDENCE_LABELS[c]}
                  </option>
                ))}
              </select>
              {validation.errors.noConfidence && (
                <p className="text-[11px] text-red-500 mt-0.5">
                  確度は必須です
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                チャネル <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal">
                  （子まで必須）
                </span>
              </label>
              <ChannelSelect
                channelId={draft.channelId}
                onChange={(channelId) => onUpdate({ channelId })}
                hasError={validation.errors.noChannel}
              />
              {validation.errors.noChannel && (
                <p className="text-[11px] text-red-500 mt-0.5">
                  チャネル（詳細）は必須です
                </p>
              )}
            </div>
          </div>

          {/* 商品行 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">
                商品
                {totalPremium > 0 && (
                  <span className="ml-2 text-blue-700 font-semibold">
                    合計 ¥{totalPremium.toLocaleString()}/月
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={handleAddProduct}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5" /> 商品を追加
              </button>
            </div>

            {draft.proposalProducts.length === 0 ? (
              <div className="text-center py-4 border border-dashed border-gray-200 rounded-lg">
                <p className="text-xs text-gray-400 mb-2">
                  商品が登録されていません
                </p>
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="text-xs text-blue-600 hover:underline"
                >
                  + 最初の商品を追加
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {draft.proposalProducts.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    persons={persons}
                    onUpdate={(patch) => handleUpdateProduct(product.id, patch)}
                    onDuplicate={() => handleDuplicateProduct(product.id)}
                    onDelete={() => handleDeleteProduct(product.id)}
                    showDelete={draft.proposalProducts.length > 1}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 詳細セクション（日付・タスク・不備） */}
          <OpportunityCardDetails
            draft={draft}
            detailsOpen={detailsOpen}
            setDetailsOpen={setDetailsOpen}
            milestones={milestones}
            milestoneWarnings={milestoneWarnings}
            deficiencies={deficiencies}
            todayStr={todayStr}
            onMilestoneChange={handleMilestoneChange}
            onAddDeficiency={handleAddDeficiency}
            onRemoveDeficiency={handleRemoveDeficiency}
            onUpdateDeficiencyField={handleUpdateDeficiencyField}
            onUpdate={onUpdate}
          />

          {/* 備考 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              備考
            </label>
            <textarea
              value={draft.memo}
              onChange={(e) => onUpdate({ memo: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="商談メモ・特記事項"
            />
          </div>

          {/* 個別保存ボタン */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                onUpdate({ _isDirty: false } as Partial<DraftOpportunity>);
              }}
              disabled={!draft._isDirty}
              className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 min-h-[36px]"
            >
              この案件だけ保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
