import { useState } from 'react';
import type { Opportunity, OpportunityStage, LostReason } from '../../types';
import { STAGE_META } from './StageBadge';
import { useAppStore } from '../../store';

// =====================================================
// StageSelector — ステージ変更プルダウン
// =====================================================

const STAGE_ORDER: OpportunityStage[] = [
  'approach', 'fact_finding', 'needs_analysis', 'proposal',
  'negotiation', 'application', 'underwriting', 'issued', 'lost',
];

const LOST_REASON_LABELS: Record<LostReason, string> = {
  price:           '保険料が高い',
  competitor:      '他社に決まった',
  family_oppose:   '家族の反対',
  health_decline:  '健康上の理由で加入不可',
  no_need:         '必要性を感じない',
  timing:          'タイミングが合わない',
  budget:          '予算不足',
  undecided:       '検討を保留',
  lost_contact:    '連絡が取れなくなった',
  other:           'その他',
};

interface Props {
  opportunity: Opportunity;
  onClose?: () => void;
  compact?: boolean;
}

export function StageSelector({ opportunity, onClose, compact = false }: Props) {
  const { changeOpportunityStage, updateOpportunity } = useAppStore();
  const [selectedStage, setSelectedStage] = useState<OpportunityStage>(opportunity.stage);
  const [note, setNote] = useState('');
  const [lostReason, setLostReason] = useState<LostReason>('other');
  const [lostReasonDetail, setLostReasonDetail] = useState('');
  const [saving, setSaving] = useState(false);

  const isTerminal = selectedStage === 'issued' || selectedStage === 'lost';

  const handleSave = () => {
    if (selectedStage === opportunity.stage) {
      onClose?.();
      return;
    }
    setSaving(true);
    changeOpportunityStage(opportunity.id, selectedStage, note || undefined);
    if (selectedStage === 'lost') {
      updateOpportunity(opportunity.id, { lostReason, lostReasonDetail: lostReasonDetail || undefined });
    }
    setSaving(false);
    onClose?.();
  };

  return (
    <div className={`space-y-3 ${compact ? '' : 'p-4 border rounded-lg bg-white'}`}>
      {!compact && (
        <h3 className="font-semibold text-gray-800 text-sm">ステージを変更</h3>
      )}
      <div>
        <label className="block text-xs text-gray-500 mb-1">新しいステージ</label>
        <select
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedStage}
          onChange={e => setSelectedStage(e.target.value as OpportunityStage)}
        >
          {STAGE_ORDER.map(s => {
            const meta = STAGE_META[s];
            return (
              <option key={s} value={s}>
                {meta.emoji} {meta.label}
              </option>
            );
          })}
        </select>
      </div>

      {selectedStage === 'lost' && (
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">失注理由</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              value={lostReason}
              onChange={e => setLostReason(e.target.value as LostReason)}
            >
              {(Object.entries(LOST_REASON_LABELS) as [LostReason, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">詳細 (任意)</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="失注の詳細メモ"
              value={lostReasonDetail}
              onChange={e => setLostReasonDetail(e.target.value)}
            />
          </div>
        </div>
      )}

      {!isTerminal && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">変更メモ (任意)</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="変更理由・メモ"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>
      )}

      <div className="flex gap-2 justify-end">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            キャンセル
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || selectedStage === opportunity.stage}
          className={`px-4 py-1.5 text-sm text-white rounded-lg ${
            selectedStage === opportunity.stage
              ? 'bg-gray-300 cursor-not-allowed'
              : selectedStage === 'lost'
                ? 'bg-red-500 hover:bg-red-600'
                : selectedStage === 'issued'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {saving ? '保存中...' : selectedStage === opportunity.stage ? '変更なし' : 'ステージを更新'}
        </button>
      </div>
    </div>
  );
}
