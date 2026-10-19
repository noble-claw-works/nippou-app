import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { OpportunityStage, ProductCategory, ProposalProduct, ConfidenceUnified } from '../../types';
import { useAppStore } from '../../store';
import { STAGE_META } from '../../components/opportunity/StageBadge';
import { CONFIDENCE_LABELS, CONFIDENCE_OPTIONS } from '../../utils/householdBatchEntry';
import { ProposalProductListEditor } from '../../components/opportunity/ProposalProductListEditor';

// =====================================================
// NewOpportunityForm — 新規案件作成ページの本体フォーム
// QuickOpportunityModal の入力一式を広いレイアウトで提供
// =====================================================

const INITIAL_STAGES: OpportunityStage[] = [
  'approach', 'fact_finding', 'needs_analysis', 'proposal',
];

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
  householdName: string;
  onCreated: (opportunityId: string) => void;
  onCancel: () => void;
}

export function NewOpportunityForm({ householdId, householdName, onCreated, onCancel }: Props) {
  const { addOpportunity, currentUserId, users, getPersonsByHousehold } = useAppStore();
  const navigate = useNavigate();
  const persons = getPersonsByHousehold(householdId);

  const [title, setTitle] = useState('');
  const [ownerId, setOwnerId] = useState(() =>
    users.some(u => u.id === currentUserId) ? currentUserId : (users[0]?.id ?? currentUserId)
  );
  const [stage, setStage] = useState<OpportunityStage>('approach');
  const [targetPersonIds, setTargetPersonIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [proposalProducts, setProposalProducts] = useState<ProposalProduct[]>([]);
  const [confidence, setConfidence] = useState<ConfidenceUnified | ''>('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');

  const toggleCategory = (cat: ProductCategory) => {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleTarget = (personId: string) => {
    setTargetPersonIds(prev =>
      prev.includes(personId) ? prev.filter(id => id !== personId) : [...prev, personId]
    );
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      setError('案件名は必須です');
      return;
    }
    if (!ownerId) {
      setError('担当者は必須です');
      return;
    }
    const derivedCategories = Array.from(
      new Set<ProductCategory>([...categories, ...proposalProducts.map(p => p.productCategory)])
    );
    const opp = addOpportunity({
      householdId,
      ownerId,
      title: title.trim(),
      stage,
      status: 'open',
      targetPersonIds,
      productCategories: derivedCategories,
      proposalProducts,
      ...(confidence ? { confidence } : {}),
      needsAnalysisDone: false,
      illustrationProvided: false,
      tags: [],
      memo: memo.trim(),
    });
    onCreated(opp.id);
  };

  return (
    <div className="pb-24">
      {/* Household info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="text-sm text-gray-500">
          世帯: <span className="font-medium text-gray-800">{householdName}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 基本情報 */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">📋 基本情報</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              案件名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="例: 田中家 生命保険 見直し"
              value={title}
              onChange={e => { setTitle(e.target.value); setError(''); }}
              autoFocus
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              担当者 <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={ownerId}
              onChange={e => { setOwnerId(e.target.value); setError(''); }}
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">対象者 (提案対象世帯員・複数可)</label>
            {persons.length === 0 ? (
              <p className="text-xs text-gray-400">世帯員が登録されていません</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {persons.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleTarget(p.id)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      targetPersonIds.includes(p.id)
                        ? 'bg-blue-100 border-blue-400 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ステージ・確度・カテゴリ */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">🎯 ステージ・確度</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">初期ステージ</label>
            <div className="grid grid-cols-2 gap-2">
              {INITIAL_STAGES.map(s => {
                const meta = STAGE_META[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStage(s)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                      stage === s
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <span>{meta.emoji}</span>
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">確度 (任意)</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={confidence}
              onChange={e => setConfidence(e.target.value as ConfidenceUnified | '')}
            >
              <option value="">（未設定）</option>
              {CONFIDENCE_OPTIONS.map(c => (
                <option key={c} value={c}>{CONFIDENCE_LABELS[c]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">検討カテゴリ (複数可)</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(PRODUCT_CATEGORY_LABELS) as [ProductCategory, string][]).map(([cat, label]) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    categories.includes(cat)
                      ? 'bg-indigo-100 border-indigo-400 text-indigo-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* 提案商品 */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 mt-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">💼 提案商品</h2>
        <ProposalProductListEditor
          householdId={householdId}
          products={proposalProducts}
          onChange={setProposalProducts}
        />
      </section>

      {/* メモ */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">メモ (任意)</label>
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={3}
          placeholder="案件メモ"
          value={memo}
          onChange={e => setMemo(e.target.value)}
        />
      </section>

      {/* Footer (fixed) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => (onCancel ? onCancel() : navigate(-1))}
            className="px-5 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg"
          >
            作成する
          </button>
        </div>
      </div>
    </div>
  );
}
