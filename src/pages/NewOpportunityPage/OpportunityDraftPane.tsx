// OpportunityDraftPane.tsx — 新規案件作成②ペイン: 案件の基本項目（11/08 指示書 design.md §1.5）
// 3ペイン化前の旧フォームの入力欄から提案商品とボタンを除いたもの。値は下書き（useNewOpportunityDraft）に持つ。

import type { ConfidenceUnified, ProductCategory } from '../../types';
import { useAppStore } from '../../store';
import { STAGE_META } from '../../components/opportunity/StageBadge';
import { CONFIDENCE_LABELS, CONFIDENCE_OPTIONS } from '../../utils/householdBatchEntry';
import { PRODUCT_CATEGORY_LABELS } from '../../components/opportunity/proposalProductMeta';
import { INITIAL_STAGES, toggleIn, type OpportunityDraft } from './newOpportunityDraft';

interface Props {
  householdId: string;
  draft: OpportunityDraft;
  onChange: (patch: Partial<OpportunityDraft>) => void;
  error: string;
}

const LABEL = 'block text-sm font-medium text-gray-700 mb-1';
const INPUT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

function chipCls(on: boolean, color: 'blue' | 'indigo') {
  if (!on) return 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300';
  return color === 'blue' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-indigo-100 border-indigo-400 text-indigo-700';
}

export function OpportunityDraftPane({ householdId, draft, onChange, error }: Props) {
  const { users, customers, getPersonsByHousehold } = useAppStore();
  const household = customers.find(c => c.id === householdId);
  const persons = householdId ? getPersonsByHousehold(householdId) : [];

  return (
    <div className="p-4 space-y-4">
      <p className="text-sm text-gray-600">
        世帯: <span className="font-medium text-gray-800">{household?.name ?? '（未選択）'}</span>
      </p>

      <div>
        <label htmlFor="no-title" className={LABEL}>
          案件名 <span className="text-red-500">*</span>
        </label>
        <input
          id="no-title"
          type="text"
          className={`${INPUT} ${error ? 'border-red-400' : ''}`}
          placeholder="例: 田中家 生命保険 見直し"
          value={draft.title}
          onChange={e => onChange({ title: e.target.value })}
        />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      <div>
        <label htmlFor="no-owner" className={LABEL}>
          担当者 <span className="text-red-500">*</span>
        </label>
        <select id="no-owner" className={INPUT} value={draft.ownerId} onChange={e => onChange({ ownerId: e.target.value })}>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      <div>
        <span className={LABEL}>初期ステージ</span>
        <div className="grid grid-cols-2 gap-2">
          {INITIAL_STAGES.map(s => {
            const meta = STAGE_META[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => onChange({ stage: s })}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                  draft.stage === s
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
        <span className={LABEL}>対象者 (提案対象世帯員・複数可)</span>
        {persons.length === 0 ? (
          <p className="text-xs text-gray-400">世帯員が登録されていません</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {persons.map(p => (
              <button
                key={p.id}
                type="button"
                aria-pressed={draft.targetPersonIds.includes(p.id)}
                onClick={() => onChange({ targetPersonIds: toggleIn(draft.targetPersonIds, p.id) })}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${chipCls(draft.targetPersonIds.includes(p.id), 'blue')}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <span className={LABEL}>検討カテゴリ (複数可)</span>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(PRODUCT_CATEGORY_LABELS) as [ProductCategory, string][]).map(([cat, label]) => (
            <button
              key={cat}
              type="button"
              aria-pressed={draft.categories.includes(cat)}
              onClick={() => onChange({ categories: toggleIn(draft.categories, cat) })}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${chipCls(draft.categories.includes(cat), 'indigo')}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="no-confidence" className={LABEL}>確度 (任意)</label>
        <select
          id="no-confidence"
          className={INPUT}
          value={draft.confidence}
          onChange={e => onChange({ confidence: e.target.value as ConfidenceUnified | '' })}
        >
          <option value="">（未設定）</option>
          {CONFIDENCE_OPTIONS.map(c => (
            <option key={c} value={c}>{CONFIDENCE_LABELS[c]}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="no-memo" className={LABEL}>メモ (任意)</label>
        <textarea
          id="no-memo"
          className={`${INPUT} resize-none`}
          rows={3}
          placeholder="案件メモ"
          value={draft.memo}
          onChange={e => onChange({ memo: e.target.value })}
        />
      </div>
    </div>
  );
}
