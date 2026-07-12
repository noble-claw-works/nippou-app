// =====================================================
// HouseholdBatchEntryPage — 世帯まとめ入力画面 B-2a/B-2b
// 設計書: docs/HOUSEHOLD_BATCH_ENTRY_UX.md §3-§9
// ★ useShallow 必須 / getSnapshot 無限ループ回避厳守
// =====================================================
import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import {
  ArrowLeft, Plus, ChevronDown, ChevronRight,
  Copy, Trash2, AlertCircle, CheckCircle2,
  ChevronUp,
} from 'lucide-react';
import { useAppStore } from '../store';
import { SALES_CHANNELS } from '../data/salesChannels';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type {
  Opportunity, ProposalProduct, ProductCategory, ConfidenceUnified,
  ContractMilestones, ContractTasks, InsuredTaskState, DeficiencyItem,
} from '../types';
import {
  calcTotalMonthlyPremium,
  toDraft,
  createEmptyDraft,
  duplicateDraft,
  validateDraft,
  countInvalidDrafts,
  filterDrafts,
  createEmptyProduct,
  duplicateProduct,
  getParentChannels,
  getChildChannels,
  getParentChannelId,
  CONFIDENCE_LABELS,
  CONFIDENCE_OPTIONS,
  MILESTONE_LABELS,
  MILESTONE_ORDER,
  getMilestoneOrderWarnings,
  syncInsuredTasks,
  toggleAllIntentSheet,
  toggleAllSignature,
  createEmptyDeficiency,
  removeDeficiency,
  updateDeficiency,
  type DraftOpportunity,
  type ShowFilter,
  type MilestoneOrderWarning,
} from '../utils/householdBatchEntry';

// ─────────────────────────────────────────────────────────────
// 定数・ラベル
// ─────────────────────────────────────────────────────────────
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

const PRODUCT_CATEGORIES: ProductCategory[] = [
  'life', 'medical', 'cancer', 'income', 'nursing',
  'savings', 'auto', 'fire', 'liability', 'other',
];

// ─────────────────────────────────────────────────────────────
// チャネル2段プルダウン（共通コンポーネント）
// ─────────────────────────────────────────────────────────────
interface ChannelSelectProps {
  channelId: string | undefined;
  onChange: (channelId: string) => void;
  hasError?: boolean;
  className?: string;
}

function ChannelSelect({ channelId, onChange, hasError, className = '' }: ChannelSelectProps) {
  const parentChannels = useMemo(() => getParentChannels(SALES_CHANNELS), []);
  const parentId = useMemo(
    () => getParentChannelId(channelId, SALES_CHANNELS),
    [channelId]
  );
  const childChannels = useMemo(
    () => parentId ? getChildChannels(parentId, SALES_CHANNELS) : [],
    [parentId]
  );

  return (
    <div className={`flex gap-2 ${className}`}>
      {/* 親チャネル */}
      <select
        value={parentId}
        onChange={e => {
          const newParent = e.target.value;
          if (!newParent) { onChange(''); return; }
          const children = getChildChannels(newParent, SALES_CHANNELS);
          if (children.length > 0) onChange(children[0].id);
        }}
        className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">─ 分類を選択 ─</option>
        {parentChannels.map(ch => (
          <option key={ch.id} value={ch.id}>{ch.name}</option>
        ))}
      </select>

      {/* 子チャネル */}
      <select
        value={channelId ?? ''}
        onChange={e => onChange(e.target.value)}
        disabled={!parentId}
        className={`flex-1 min-w-0 border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50 ${
          hasError ? 'border-red-400 bg-red-50' : 'border-gray-300'
        }`}
      >
        <option value="">─ 詳細を選択 ─</option>
        {childChannels.map(ch => (
          <option key={ch.id} value={ch.id}>{ch.name}</option>
        ))}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 商品行
// ─────────────────────────────────────────────────────────────
interface ProductRowProps {
  product: ProposalProduct;
  persons: Array<{ id: string; name: string }>;
  onUpdate: (patch: Partial<ProposalProduct>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  showDelete: boolean;
}

function ProductRow({ product, persons, onUpdate, onDuplicate, onDelete, showDelete }: ProductRowProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* 被保険者 */}
        <div className="flex-1 min-w-[120px]">
          <label className="block text-[10px] text-gray-500 mb-0.5">被保険者</label>
          <select
            value={product.insuredPersonId ?? ''}
            onChange={e => onUpdate({ insuredPersonId: e.target.value })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">─ 選択 ─</option>
            {persons.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* 種目 */}
        <div className="flex-1 min-w-[100px]">
          <label className="block text-[10px] text-gray-500 mb-0.5">種目</label>
          <select
            value={product.productCategory}
            onChange={e => onUpdate({ productCategory: e.target.value as ProductCategory })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PRODUCT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{PRODUCT_CATEGORY_LABELS[cat]}</option>
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
          <label className="block text-[10px] text-gray-500 mb-0.5">保険会社</label>
          <input
            type="text"
            value={product.insurer}
            onChange={e => onUpdate({ insurer: e.target.value })}
            placeholder="例: ◯◯生命"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 月払保険料 */}
        <div className="w-28">
          <label className="block text-[10px] text-gray-500 mb-0.5">月払保険料 (円)</label>
          <input
            type="number"
            min={0}
            value={product.monthlyPremium || ''}
            onChange={e => onUpdate({ monthlyPremium: Number(e.target.value) || 0 })}
            placeholder="0"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
          />
        </div>

        {/* 初年度手数料 */}
        <div className="w-32">
          <label className="block text-[10px] text-gray-500 mb-0.5">初年度手数料 (円)</label>
          <input
            type="number"
            min={0}
            value={product.firstYearCommission ?? ''}
            onChange={e => {
              const v = e.target.value;
              onUpdate({ firstYearCommission: v === '' ? undefined : Number(v) });
            }}
            placeholder="未設定"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// B-2b: マイルストーン日付フィールド（小コンポーネント）
// ─────────────────────────────────────────────────────────────
interface MilestoneDateFieldProps {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  today: string;
}

function MilestoneDateField({ label, value, onChange, today }: MilestoneDateFieldProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="block text-[10px] text-gray-500">{label}</label>
      <input
        type="date"
        value={value ?? ''}
        onChange={e => onChange(e.target.value || undefined)}
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        aria-label={label}
      />
      {!value && (
        <button
          type="button"
          onClick={() => onChange(today)}
          className="text-[10px] text-blue-500 hover:text-blue-700 text-left px-0 py-0 leading-tight"
          tabIndex={-1}
        >
          今日
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 案件カード（折りたたみ）
// ─────────────────────────────────────────────────────────────
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

function OpportunityCard({
  draft, index, persons, headerContractorId,
  onUpdate, onDuplicate, onDeleteRequest, onToggleOpen,
}: OpportunityCardProps) {
  const validation = useMemo(
    () => validateDraft(draft, SALES_CHANNELS),
    [draft]
  );
  const totalPremium = useMemo(
    () => calcTotalMonthlyPremium(draft.proposalProducts),
    [draft.proposalProducts]
  );

  const hasError = !validation.isValid;
  const isOpen = draft._isOpen;

  // 商品操作
  const handleAddProduct = useCallback(() => {
    const newProduct = createEmptyProduct(persons[0]?.id ?? '');
    onUpdate({ proposalProducts: [...draft.proposalProducts, newProduct] });
  }, [draft.proposalProducts, persons, onUpdate]);

  const handleUpdateProduct = useCallback((productId: string, patch: Partial<ProposalProduct>) => {
    const updated = draft.proposalProducts.map(p =>
      p.id === productId ? { ...p, ...patch } : p
    );
    onUpdate({ proposalProducts: updated });
  }, [draft.proposalProducts, onUpdate]);

  const handleDuplicateProduct = useCallback((productId: string) => {
    const product = draft.proposalProducts.find(p => p.id === productId);
    if (!product) return;
    const dup = duplicateProduct(product);
    const idx = draft.proposalProducts.findIndex(p => p.id === productId);
    const updated = [
      ...draft.proposalProducts.slice(0, idx + 1),
      dup,
      ...draft.proposalProducts.slice(idx + 1),
    ];
    onUpdate({ proposalProducts: updated });
  }, [draft.proposalProducts, onUpdate]);

  const handleDeleteProduct = useCallback((productId: string) => {
    onUpdate({ proposalProducts: draft.proposalProducts.filter(p => p.id !== productId) });
  }, [draft.proposalProducts, onUpdate]);

  // B-2b: 詳細セクションの開閉状態（カード内ローカルstate）
  const [detailsOpen, setDetailsOpen] = useState(false);

  // B-2b: 今日の日付文字列
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // B-2b: milestones 操作（useMemoで安定化）
  const milestones = useMemo<ContractMilestones>(
    () => draft.milestones ?? {},
    [draft.milestones]
  );
  const milestoneWarnings = useMemo(
    () => getMilestoneOrderWarnings(draft.milestones),
    [draft.milestones]
  );

  const handleMilestoneChange = useCallback(
    (key: keyof ContractMilestones, value: string | undefined) => {
      onUpdate({ milestones: { ...milestones, [key]: value || undefined } });
    },
    [milestones, onUpdate]
  );

  // B-2b: contractTasks 操作（useMemoで安定化）
  const contractTasks = useMemo<ContractTasks>(
    () => draft.contractTasks ?? { policyCollected: false, policyReviewed: false },
    [draft.contractTasks]
  );

  const handleContractTaskChange = useCallback(
    (patch: Partial<ContractTasks>) => {
      onUpdate({ contractTasks: { ...contractTasks, ...patch } });
    },
    [contractTasks, onUpdate]
  );

  // B-2b: insuredTasks 操作（proposalProducts の insuredPersonId から遅延生成）
  const insuredTasks = useMemo<InsuredTaskState[]>(
    () => syncInsuredTasks(draft.proposalProducts, draft.insuredTasks),
    [draft.proposalProducts, draft.insuredTasks]
  );

  const allIntentDone = insuredTasks.length > 0 && insuredTasks.every(t => t.intentSheetDone);
  const allSignatureDone = insuredTasks.length > 0 && insuredTasks.every(t => t.signatureDone);

  const handleToggleAllIntent = useCallback(() => {
    const next = toggleAllIntentSheet(insuredTasks, !allIntentDone, todayStr);
    onUpdate({ insuredTasks: next });
  }, [insuredTasks, allIntentDone, todayStr, onUpdate]);

  const handleToggleAllSignature = useCallback(() => {
    const next = toggleAllSignature(insuredTasks, !allSignatureDone, todayStr);
    onUpdate({ insuredTasks: next });
  }, [insuredTasks, allSignatureDone, todayStr, onUpdate]);

  const handleInsuredTaskChange = useCallback(
    (personId: string, patch: Partial<InsuredTaskState>) => {
      const updated = insuredTasks.map(t =>
        t.personId === personId ? { ...t, ...patch } : t
      );
      onUpdate({ insuredTasks: updated });
    },
    [insuredTasks, onUpdate]
  );

  // B-2b: deficiencies 操作（useMemoで安定化）
  const deficiencies = useMemo<DeficiencyItem[]>(
    () => draft.deficiencies ?? [],
    [draft.deficiencies]
  );

  const handleAddDeficiency = useCallback(() => {
    onUpdate({ deficiencies: [...deficiencies, createEmptyDeficiency()] });
  }, [deficiencies, onUpdate]);

  const handleRemoveDeficiency = useCallback((id: string) => {
    onUpdate({ deficiencies: removeDeficiency(deficiencies, id) });
  }, [deficiencies, onUpdate]);

  const handleUpdateDeficiencyField = useCallback(
    (id: string, patch: Partial<DeficiencyItem>) => {
      onUpdate({ deficiencies: updateDeficiency(deficiencies, id, patch) });
    },
    [deficiencies, onUpdate]
  );

  // サマリ用: 最初の商品の情報
  const firstProduct = draft.proposalProducts[0];
  const contractorName = persons.find(p => p.id === (draft.contractorPersonId ?? headerContractorId))?.name ?? '─';

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        hasError ? 'border-red-300 shadow-sm shadow-red-100' : 'border-gray-200'
      }`}
    >
      {/* カードヘッダー（クリックで開閉） — divにして内部buttonネストを回避 */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleOpen}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleOpen(); } }}
        aria-expanded={isOpen}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer select-none ${
          isOpen ? 'bg-blue-50 border-b border-blue-100' : 'bg-white hover:bg-gray-50'
        }`}
      >
        <span className="text-blue-600 shrink-0">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>

        {/* 番号 */}
        <span className="text-xs font-bold text-gray-500 shrink-0 w-5">
          {index + 1}
        </span>

        {/* サマリ情報 */}
        <div className="flex-1 min-w-0 text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-800 truncate">
              {draft.title}
            </span>
            {draft.confidence && (
              <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full shrink-0">
                {CONFIDENCE_LABELS[draft.confidence as ConfidenceUnified] ?? draft.confidence}
              </span>
            )}
            {draft.proposalProducts.length > 0 && (
              <span className="text-[10px] text-gray-500 shrink-0">
                {draft.proposalProducts.length}商品
              </span>
            )}
          </div>
          {!isOpen && (
            <div className="text-xs text-gray-500 mt-0.5 flex gap-3 flex-wrap">
              <span>{contractorName}</span>
              {totalPremium > 0 && (
                <span className="font-medium text-blue-700">
                  ¥{totalPremium.toLocaleString()}/月
                </span>
              )}
              {firstProduct && (
                <span>{PRODUCT_CATEGORY_LABELS[firstProduct.productCategory]}</span>
              )}
            </div>
          )}
        </div>

        {/* バリデーションエラー表示 */}
        {hasError && (
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" aria-label="入力エラーあり" />
        )}

        {/* 変更バッジ */}
        {draft._isDirty && (
          <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded shrink-0">
            未保存
          </span>
        )}

        {/* 操作ボタン（開いた時のみ） */}
        {isOpen && (
          <div
            className="flex gap-1 shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onDuplicate}
              title="この案件を複製"
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-100 min-h-[36px]"
            >
              <Copy className="w-3.5 h-3.5" /> 複製
            </button>
            <button
              type="button"
              onClick={onDeleteRequest}
              title="この案件を削除"
              className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 min-h-[36px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* カード本体（開いた時のみ表示） */}
      {isOpen && (
        <div className="p-4 space-y-4 bg-white">
          {/* 案件名 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">案件名</label>
            <input
              type="text"
              value={draft.title}
              onChange={e => onUpdate({ title: e.target.value })}
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
                value={draft.confidence ?? ''}
                onChange={e => onUpdate({ confidence: e.target.value as ConfidenceUnified || undefined })}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validation.errors.noConfidence ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">─ 選択してください ─</option>
                {CONFIDENCE_OPTIONS.map(c => (
                  <option key={c} value={c}>{CONFIDENCE_LABELS[c]}</option>
                ))}
              </select>
              {validation.errors.noConfidence && (
                <p className="text-[11px] text-red-500 mt-0.5">確度は必須です</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                チャネル <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal">（子まで必須）</span>
              </label>
              <ChannelSelect
                channelId={draft.channelId}
                onChange={channelId => onUpdate({ channelId })}
                hasError={validation.errors.noChannel}
              />
              {validation.errors.noChannel && (
                <p className="text-[11px] text-red-500 mt-0.5">チャネル（詳細）は必須です</p>
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
                <p className="text-xs text-gray-400 mb-2">商品が登録されていません</p>
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
                {draft.proposalProducts.map(product => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    persons={persons}
                    onUpdate={patch => handleUpdateProduct(product.id, patch)}
                    onDuplicate={() => handleDuplicateProduct(product.id)}
                    onDelete={() => handleDeleteProduct(product.id)}
                    showDelete={draft.proposalProducts.length > 1}
                  />
                ))}
              </div>
            )}
          </div>

          {/* B-2b: 詳細セクション（日付・タスク・不備）— 折りたたみ */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setDetailsOpen(v => !v)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailsOpen(v => !v); } }}
              aria-expanded={detailsOpen}
              className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 cursor-pointer select-none transition-colors"
            >
              <span className="text-gray-500 shrink-0">
                {detailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </span>
              <span className="text-xs font-semibold text-gray-700">▸ 詳細（日付・タスク・不備）</span>
              {(Object.values(milestones).some(Boolean) || deficiencies.length > 0 ||
                contractTasks.policyCollected || contractTasks.policyReviewed ||
                insuredTasks.some(t => t.intentSheetDone || t.signatureDone)) && (
                <span className="ml-1 text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">入力済</span>
              )}
              {milestoneWarnings.length > 0 && (
                <span className="ml-1 text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">日付順序注意</span>
              )}
            </div>

            {detailsOpen && (
              <div className="p-3 space-y-4 bg-white">

                {/* --- ステージ日付 --- */}
                <div>
                  <p className="text-[11px] font-semibold text-gray-600 mb-2">⏱ ステージ日付</p>
                  {milestoneWarnings.map((w: MilestoneOrderWarning) => (
                    <div key={`${w.earlier}-${w.later}`} className="flex items-center gap-1.5 mb-2 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-700">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>「{w.earlierLabel}」が「{w.laterLabel}」より後になっています（注意）</span>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {MILESTONE_ORDER.map(key => (
                      <MilestoneDateField
                        key={key}
                        label={MILESTONE_LABELS[key]}
                        value={milestones[key]}
                        onChange={v => handleMilestoneChange(key, v)}
                        today={todayStr}
                      />
                    ))}
                    <MilestoneDateField
                      label={MILESTONE_LABELS.inceptionDate}
                      value={milestones.inceptionDate}
                      onChange={v => handleMilestoneChange('inceptionDate', v)}
                      today={todayStr}
                    />
                    <MilestoneDateField
                      label={MILESTONE_LABELS.lostDate}
                      value={milestones.lostDate}
                      onChange={v => handleMilestoneChange('lostDate', v)}
                      today={todayStr}
                    />
                  </div>
                </div>

                {/* --- 案件単位タスク --- */}
                <div>
                  <p className="text-[11px] font-semibold text-gray-600 mb-2">☑️ タスク</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer min-h-[44px]">
                        <input type="checkbox" checked={contractTasks.policyCollected}
                          onChange={e => handleContractTaskChange({ policyCollected: e.target.checked })}
                          className="w-4 h-4 rounded accent-blue-600" />
                        <span>証券回収</span>
                      </label>
                      <input type="date" value={contractTasks.policyCollectDate ?? ''}
                        onChange={e => handleContractTaskChange({ policyCollectDate: e.target.value || undefined })}
                        className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        aria-label="証券回収日" />
                      {!contractTasks.policyCollectDate && (
                        <button type="button" onClick={() => handleContractTaskChange({ policyCollectDate: todayStr })}
                          className="text-[11px] px-1.5 py-0.5 text-blue-600 hover:text-blue-700 border border-blue-300 rounded">今日</button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer min-h-[44px]">
                        <input type="checkbox" checked={contractTasks.policyReviewed}
                          onChange={e => handleContractTaskChange({ policyReviewed: e.target.checked })}
                          className="w-4 h-4 rounded accent-blue-600" />
                        <span>ポリシーレビュー</span>
                      </label>
                      <input type="date" value={contractTasks.policyReviewDate ?? ''}
                        onChange={e => handleContractTaskChange({ policyReviewDate: e.target.value || undefined })}
                        className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        aria-label="ポリシーレビュー日" />
                      {!contractTasks.policyReviewDate && (
                        <button type="button" onClick={() => handleContractTaskChange({ policyReviewDate: todayStr })}
                          className="text-[11px] px-1.5 py-0.5 text-blue-600 hover:text-blue-700 border border-blue-300 rounded">今日</button>
                      )}
                    </div>
                  </div>
                </div>

                {/* --- 被保険者単位タスク --- */}
                {insuredTasks.length > 0 ? (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-600 mb-2">📝 意向シート・署名（被保険者単位）</p>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-[1fr_auto_auto] bg-gray-50 border-b border-gray-200 px-3 py-2 gap-2">
                        <span className="text-[10px] font-medium text-gray-500">被保険者</span>
                        <button type="button" onClick={handleToggleAllIntent}
                          className={`text-[10px] font-medium px-2 py-1 rounded min-h-[36px] min-w-[72px] border transition-colors ${
                            allIntentDone ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                          }`}
                          aria-pressed={allIntentDone}>
                          意向シート {allIntentDone ? '☑' : '☐'}
                        </button>
                        <button type="button" onClick={handleToggleAllSignature}
                          className={`text-[10px] font-medium px-2 py-1 rounded min-h-[36px] min-w-[64px] border transition-colors ${
                            allSignatureDone ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                          }`}
                          aria-pressed={allSignatureDone}>
                          署名 {allSignatureDone ? '☑' : '☐'}
                        </button>
                      </div>
                      {insuredTasks.map(task => {
                        const personName = persons.find(p => p.id === task.personId)?.name ?? task.personId;
                        return (
                          <div key={task.personId} className="grid grid-cols-[1fr_auto_auto] border-b border-gray-100 last:border-0 px-3 py-2 gap-2 items-center">
                            <span className="text-xs text-gray-700 truncate">{personName}</span>
                            <div className="flex flex-col items-center gap-1">
                              <label className="flex items-center gap-1 cursor-pointer min-h-[36px]">
                                <input type="checkbox" checked={task.intentSheetDone}
                                  onChange={e => {
                                    const done = e.target.checked;
                                    handleInsuredTaskChange(task.personId, {
                                      intentSheetDone: done,
                                      intentSheetDate: done ? (task.intentSheetDate || todayStr) : task.intentSheetDate,
                                    });
                                  }}
                                  className="w-4 h-4 accent-blue-600" />
                              </label>
                              <input type="date" value={task.intentSheetDate ?? ''}
                                onChange={e => handleInsuredTaskChange(task.personId, { intentSheetDate: e.target.value || undefined })}
                                className="border border-gray-200 rounded px-1 py-0.5 text-[10px] w-28 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                aria-label={`${personName} 意向シート日付`} />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <label className="flex items-center gap-1 cursor-pointer min-h-[36px]">
                                <input type="checkbox" checked={task.signatureDone}
                                  onChange={e => {
                                    const done = e.target.checked;
                                    handleInsuredTaskChange(task.personId, {
                                      signatureDone: done,
                                      signatureDate: done ? (task.signatureDate || todayStr) : task.signatureDate,
                                    });
                                  }}
                                  className="w-4 h-4 accent-blue-600" />
                              </label>
                              <input type="date" value={task.signatureDate ?? ''}
                                onChange={e => handleInsuredTaskChange(task.personId, { signatureDate: e.target.value || undefined })}
                                className="border border-gray-200 rounded px-1 py-0.5 text-[10px] w-28 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                aria-label={`${personName} 署名日付`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">商品の被保険者が確定すると行が生成されます</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-600 mb-2">📝 意向シート・署名（被保険者単位）</p>
                    <div className="px-3 py-4 border border-dashed border-gray-200 rounded-lg text-center">
                      <p className="text-xs text-gray-400">商品を登録すると被保険者単位のタスクが表示されます</p>
                    </div>
                  </div>
                )}

                {/* --- 不備 --- */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-semibold text-gray-600">⚠️ 不備（転記方式）</p>
                    <button type="button" onClick={handleAddDeficiency}
                      className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 border border-blue-300 hover:bg-blue-50 px-2 py-1 rounded min-h-[36px]">
                      <Plus className="w-3 h-3" /> 不備追加
                    </button>
                  </div>
                  {deficiencies.length === 0 ? (
                    <div className="px-3 py-4 border border-dashed border-gray-200 rounded-lg text-center">
                      <p className="text-xs text-gray-400">不備なし</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {deficiencies.map(def => (
                        <div key={def.id} className="border border-gray-200 rounded-lg p-2.5 space-y-2">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-[10px] text-gray-500 mb-0.5">項目名</label>
                              <input type="text" value={def.item}
                                onChange={e => handleUpdateDeficiencyField(def.id, { item: e.target.value })}
                                placeholder="例: 告知書未記入"
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>
                            <button type="button" onClick={() => handleRemoveDeficiency(def.id)}
                              className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded self-end transition-colors min-h-[36px] min-w-[36px]"
                              aria-label="この不備を削除">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">内容（転記）</label>
                            <textarea value={def.detail ?? ''}
                              onChange={e => handleUpdateDeficiencyField(def.id, { detail: e.target.value })}
                              rows={2} placeholder="不備内容を転記してください"
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer min-h-[36px]">
                              <input type="checkbox" checked={def.resolved}
                                onChange={e => {
                                  const resolved = e.target.checked;
                                  handleUpdateDeficiencyField(def.id, {
                                    resolved,
                                    resolvedDate: resolved ? (def.resolvedDate || todayStr) : def.resolvedDate,
                                  });
                                }}
                                className="w-4 h-4 rounded accent-blue-600" />
                              <span>解消済み</span>
                            </label>
                            {def.resolved && (
                              <input type="date" value={def.resolvedDate ?? ''}
                                onChange={e => handleUpdateDeficiencyField(def.id, { resolvedDate: e.target.value || undefined })}
                                className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                aria-label="解消日" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* 備考 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">備考</label>
            <textarea
              value={draft.memo}
              onChange={e => onUpdate({ memo: e.target.value })}
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
                // 個別保存はバリデーション通過済みか問わず保存シグナルを送る
                // → 親コンポーネントに委譲（ここでは状態更新のみ）
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

// ─────────────────────────────────────────────────────────────
// メインページ
// ─────────────────────────────────────────────────────────────
export function HouseholdBatchEntryPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // B-2c: fromパラメータに基づく戻り先解決
  // from=today → /today, from=report:{date} → /reports/{date}, その他 → /households
  const fromRaw = searchParams.get('from');
  const fromParam = (() => {
    if (!fromRaw) return '/households';
    if (fromRaw === 'today') return '/today';
    if (fromRaw.startsWith('report:')) return `/reports/${fromRaw.slice('report:'.length)}`;
    return '/households';
  })();

  // ── Store 購読（useShallow で無限ループ回避・必須） ──
  const {
    customers,
    persons: allPersons,
    opportunities: allOpportunities,
    currentUserId,
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
    updateCustomer,
    addToast,
  } = useAppStore(useShallow(s => ({
    customers: s.customers,
    persons: s.persons,
    opportunities: s.opportunities,
    currentUserId: s.currentUserId,
    addOpportunity: s.addOpportunity,
    updateOpportunity: s.updateOpportunity,
    deleteOpportunity: s.deleteOpportunity,
    updateCustomer: s.updateCustomer,
    addToast: s.addToast,
  })));

  // ── 派生データは useMemo でコンポーネント側計算（storeセレクタ内でfilterしない） ──
  const household = useMemo(
    () => customers.find(c => c.id === customerId),
    [customers, customerId]
  );

  const householdPersons = useMemo(
    () => allPersons.filter(p => p.householdId === customerId),
    [allPersons, customerId]
  );

  const personOptions = useMemo(
    () => householdPersons.map(p => ({ id: p.id, name: p.name })),
    [householdPersons]
  );

  const rawOpportunities = useMemo(
    () => allOpportunities.filter(o => o.householdId === customerId),
    [allOpportunities, customerId]
  );

  // ── ローカルドラフト state（編集はドラフトに対して行う・storeは保存時のみ更新） ──
  const [drafts, setDrafts] = useState<DraftOpportunity[]>(() =>
    rawOpportunities.map(o => toDraft(o))
  );

  // 世帯ヘッダー state
  const [headerContractorId, setHeaderContractorId] = useState<string>(
    household?.headPersonId ?? ''
  );
  const [headerChannelId, setHeaderChannelId] = useState<string>('');
  const [headerDate, setHeaderDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [annualIncome, setAnnualIncome] = useState<string>(
    household?.annualIncome ? String(household.annualIncome) : ''
  );

  // UI state
  const [showFilter, setShowFilter] = useState<ShowFilter>('active');
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [pendingNavigate, setPendingNavigate] = useState<string | null>(null);

  // 個別保存ハンドラ（OpportunityCard内の「この案件だけ保存」ボタン用）
  const handleSaveSingle = useCallback(async (draft: DraftOpportunity) => {
    if (draft._isNew) {
      // 新規: addOpportunity
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _isNew: _n, _isDirty: _d, _isOpen: _o, id: _id, ...rest } = draft;
      const totalMonthlyPremium = calcTotalMonthlyPremium(rest.proposalProducts);
      addOpportunity({
        ...rest,
        totalMonthlyPremium: totalMonthlyPremium > 0 ? totalMonthlyPremium : undefined,
      } as Omit<Opportunity, 'id' | 'stageHistory' | 'createdAt' | 'updatedAt' | 'totalMonthlyPremium'>);
    } else {
      // 既存: updateOpportunity
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _isNew: _n, _isDirty: _d, _isOpen: _o, ...patch } = draft;
      const totalMonthlyPremium = calcTotalMonthlyPremium(draft.proposalProducts);
      updateOpportunity(draft.id, {
        ...patch,
        totalMonthlyPremium: totalMonthlyPremium > 0 ? totalMonthlyPremium : undefined,
      });
    }
    setDrafts(prev => prev.map(d => d.id === draft.id ? { ...d, _isDirty: false, _isNew: false } : d));
    addToast({ type: 'success', message: '案件を保存しました' });
  }, [addOpportunity, updateOpportunity, addToast]);

  // 全保存
  const handleSaveAll = useCallback(async () => {
    const dirtyDrafts = drafts.filter(d => d._isDirty);
    if (dirtyDrafts.length === 0) {
      addToast({ type: 'info', message: '変更はありません' });
      return;
    }
    setSaving(true);
    try {
      for (const draft of dirtyDrafts) {
        await handleSaveSingle(draft);
      }
      // 年収の更新
      if (customerId) {
        const income = annualIncome ? Number(annualIncome) : undefined;
        updateCustomer(customerId, { annualIncome: income });
      }
      addToast({ type: 'success', message: `${dirtyDrafts.length}件の案件を保存しました` });
    } finally {
      setSaving(false);
    }
  }, [drafts, handleSaveSingle, customerId, annualIncome, updateCustomer, addToast]);

  // ドラフト更新
  const handleUpdateDraft = useCallback((draftId: string, patch: Partial<DraftOpportunity>) => {
    setDrafts(prev => prev.map(d =>
      d.id === draftId ? { ...d, ...patch, _isDirty: true } : d
    ));
  }, []);

  // 案件追加
  const handleAddOpportunity = useCallback(() => {
    const draft = createEmptyDraft({
      householdId: customerId!,
      ownerId: currentUserId,
      contractorPersonId: headerContractorId || undefined,
      channelId: headerChannelId || undefined,
    });
    setDrafts(prev => [...prev, draft]);
  }, [customerId, currentUserId, headerContractorId, headerChannelId]);

  // 案件複製
  const handleDuplicate = useCallback((draftId: string) => {
    const source = drafts.find(d => d.id === draftId);
    if (!source) return;
    const dup = duplicateDraft(source, {
      contractorPersonId: headerContractorId || undefined,
      channelId: headerChannelId || undefined,
    });
    const idx = drafts.findIndex(d => d.id === draftId);
    setDrafts(prev => [
      ...prev.slice(0, idx + 1),
      dup,
      ...prev.slice(idx + 1),
    ]);
  }, [drafts, headerContractorId, headerChannelId]);

  // 案件削除（確認ダイアログ経由）
  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTargetId) return;
    const target = drafts.find(d => d.id === deleteTargetId);
    if (!target) { setDeleteTargetId(null); return; }
    if (!target._isNew) {
      deleteOpportunity(deleteTargetId);
    }
    setDrafts(prev => prev.filter(d => d.id !== deleteTargetId));
    setDeleteTargetId(null);
    addToast({ type: 'success', message: '案件を削除しました' });
  }, [deleteTargetId, drafts, deleteOpportunity, addToast]);

  // カード開閉
  const handleToggleOpen = useCallback((draftId: string) => {
    setDrafts(prev => prev.map(d =>
      d.id === draftId ? { ...d, _isOpen: !d._isOpen } : d
    ));
  }, []);

  // 離脱時の未保存確認
  const hasDirty = useMemo(() => drafts.some(d => d._isDirty), [drafts]);

  const handleBack = useCallback(() => {
    if (hasDirty) {
      setPendingNavigate(fromParam);
      setShowLeaveConfirm(true);
    } else {
      navigate(fromParam);
    }
  }, [hasDirty, fromParam, navigate]);

  // 表示フィルタ後のドラフト
  const visibleDrafts = useMemo(
    () => filterDrafts(drafts, showFilter),
    [drafts, showFilter]
  );

  // バリデーション集計
  const invalidCount = useMemo(
    () => countInvalidDrafts(drafts.filter(d => d._isDirty), SALES_CHANNELS),
    [drafts]
  );

  const dirtyCount = useMemo(
    () => drafts.filter(d => d._isDirty).length,
    [drafts]
  );

  const deleteTargetDraft = useMemo(
    () => drafts.find(d => d.id === deleteTargetId),
    [drafts, deleteTargetId]
  );

  // 世帯が見つからない場合
  if (!household) {
    return (
      <div className="px-4 py-8">
        <EmptyState icon="🔍" title="世帯が見つかりません" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 pb-32">
      {/* ── スティッキーヘッダー ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 -mx-4 px-4 py-3 mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 shrink-0 min-h-[44px] px-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">戻る</span>
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-gray-900 truncate">
            🏠 {household.name} — まとめ入力
          </h1>
          <p className="text-xs text-gray-500">世帯の案件を一括で入力・更新</p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving || dirtyCount === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shrink-0 min-h-[44px]"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {dirtyCount > 0 ? `まとめて保存 (${dirtyCount}件)` : '保存済み'}
          </span>
          <span className="sm:hidden">保存</span>
        </button>
      </div>

      {/* ── 世帯ヘッダー ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h2 className="text-xs font-semibold text-gray-600 mb-3">📋 世帯共通情報（案件の既定値）</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 契約者 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">契約者</label>
            <select
              value={headerContractorId}
              onChange={e => setHeaderContractorId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">─ 選択してください ─</option>
              {personOptions.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 商談日（既定） */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">商談日（既定）</label>
            <input
              type="date"
              value={headerDate}
              onChange={e => setHeaderDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* チャネル */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              チャネル（既定）
            </label>
            <ChannelSelect
              channelId={headerChannelId || undefined}
              onChange={setHeaderChannelId}
            />
            <p className="text-[11px] text-gray-400 mt-1">
              新規追加・複製時にこの値を既定として引き継ぎます
            </p>
          </div>

          {/* 年収 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              年収（円）
            </label>
            <input
              type="number"
              min={0}
              value={annualIncome}
              onChange={e => setAnnualIncome(e.target.value)}
              placeholder="例: 6000000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
            />
          </div>
        </div>
      </section>

      {/* ── 案件一覧ヘッダー ── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">
          💼 案件 ({rawOpportunities.length + drafts.filter(d => d._isNew).length}件)
        </h2>
        <div className="flex items-center gap-2">
          {/* 表示フィルタ */}
          <select
            value={showFilter}
            onChange={e => setShowFilter(e.target.value as ShowFilter)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="active">進行中のみ</option>
            <option value="all">すべて表示</option>
          </select>

          {/* 案件追加 */}
          <button
            type="button"
            onClick={handleAddOpportunity}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" /> 案件を追加
          </button>
        </div>
      </div>

      {/* ── バリデーション警告 ── */}
      {invalidCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 mb-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>未入力の必須項目が {invalidCount} 件あります（赤枠のカードをご確認ください）</span>
        </div>
      )}

      {/* ── 案件カード一覧 ── */}
      {visibleDrafts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
          <p className="text-3xl mb-2">📂</p>
          <p className="text-sm text-gray-500 mb-4">
            {showFilter === 'active' ? '進行中の案件はありません' : '案件がまだありません'}
          </p>
          <button
            type="button"
            onClick={handleAddOpportunity}
            className="text-sm text-blue-600 hover:underline"
          >
            + 最初の案件を追加
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleDrafts.map((draft, idx) => (
            <OpportunityCard
              key={draft.id}
              draft={draft}
              index={idx}
              persons={personOptions}
              headerContractorId={headerContractorId}
              headerChannelId={headerChannelId}
              onUpdate={patch => handleUpdateDraft(draft.id, patch)}
              onDuplicate={() => handleDuplicate(draft.id)}
              onDeleteRequest={() => setDeleteTargetId(draft.id)}
              onToggleOpen={() => handleToggleOpen(draft.id)}
            />
          ))}
        </div>
      )}

      {/* ── スティッキーフッター ── */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            {dirtyCount > 0
              ? <span className="text-amber-600">⚠ {dirtyCount}件 未保存の変更があります</span>
              : <span className="text-green-600">✅ 保存済み</span>
            }
            {invalidCount > 0 && (
              <span className="ml-2 text-red-500">/ 未入力 {invalidCount}件</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving || dirtyCount === 0}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
            >
              {saving ? '保存中...' : `まとめて保存${dirtyCount > 0 ? ` (${dirtyCount}件)` : ''}`}
            </button>
          </div>
        </div>
      </div>

      {/* ── 案件削除確認ダイアログ ── */}
      <ConfirmDialog
        open={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title="案件を削除しますか？"
        message={
          <div>
            <p>「{deleteTargetDraft?.title}」を削除します。</p>
            {deleteTargetDraft && !deleteTargetDraft._isNew && (
              <p className="text-sm text-amber-600 mt-2">⚠ この操作は元に戻せません。</p>
            )}
          </div>
        }
        confirmLabel="削除する"
      />

      {/* ── 離脱確認ダイアログ ── */}
      <ConfirmDialog
        open={showLeaveConfirm}
        onClose={() => { setShowLeaveConfirm(false); setPendingNavigate(null); }}
        onConfirm={() => {
          setShowLeaveConfirm(false);
          if (pendingNavigate) navigate(pendingNavigate);
        }}
        title="変更を破棄しますか？"
        message="未保存の変更があります。このまま離脱すると変更は失われます。"
        confirmLabel="破棄して離脱"
      />
    </div>
  );
}
