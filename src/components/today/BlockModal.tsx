import { useRef, useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { BLOCK_EMOJIS, BLOCK_LABELS } from '../../utils';
import type { Customer, TimeBlock } from '../../types';
import { BLOCK_TYPES } from '../timeline/DragAndChip';
import { ChevronDown } from 'lucide-react';
import { CustomerCombobox } from '../ui/CustomerCombobox';
import { OpportunityCombobox } from '../opportunity/OpportunityCombobox';
import { StageSelector } from '../opportunity/StageSelector';
import { QuickOpportunityModal } from '../opportunity/QuickOpportunityModal';
import { QuickHouseholdModal } from '../household/QuickHouseholdModal';
import { useAppStore } from '../../store';

// ─── BlockModalState ──────────────────────────────────────────────────────────
export interface BlockModalState {
  open: boolean;
  block: Partial<TimeBlock>;
  isNew: boolean;
  /** which column opened this dialog — determines isPlanned/isActual */
  col: 'planned' | 'actual';
  /** when true, auto-focus customer field; when false, focus type chips */
  focusCustomer: boolean;
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface BlockModalProps {
  state: BlockModalState;
  customers: Customer[];
  continueInput: boolean;
  setContinueInput: (v: boolean) => void;
  onSave: () => void;
  onDelete: (blockId: string) => void;
  onClose: () => void;
  onChange: (updater: (prev: BlockModalState) => BlockModalState) => void;
}

// ─── BlockModal component ─────────────────────────────────────────────────────
export function BlockModal({
  state, customers,
  continueInput, setContinueInput,
  onSave, onDelete, onClose, onChange,
}: BlockModalProps) {
  const { getOpportunitiesByHousehold, getOpportunityById } = useAppStore();
  const customerComboboxRef = useRef<HTMLDivElement>(null);
  const typeChipRef = useRef<HTMLButtonElement>(null);
  const [visitResultOpen, setVisitResultOpen] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showQuickHousehold, setShowQuickHousehold] = useState(false);
  const [showStageSelector, setShowStageSelector] = useState(false);

  // Open opportunities for selected household
  const selectedOpportunities = state.block.customerId
    ? getOpportunitiesByHousehold(state.block.customerId, { openOnly: true })
    : [];
  const selectedOpportunity = state.block.opportunityId
    ? getOpportunityById(state.block.opportunityId)
    : undefined;

  // Auto-focus after open
  useEffect(() => {
    if (!state.open) return;
    const id = setTimeout(() => {
      if (state.focusCustomer) {
        customerComboboxRef.current?.querySelector('input')?.focus();
      } else {
        typeChipRef.current?.focus();
      }
    }, 80);
    return () => clearTimeout(id);
  }, [state.open, state.focusCustomer]);

  // Validation logic
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!state.block.type) newErrors.type = '必須項目です';
    if (!state.block.startTime) newErrors.startTime = '必須項目です';
    if (!state.block.endTime) newErrors.endTime = '必須項目です';
    if (state.block.startTime && state.block.endTime && state.block.endTime <= state.block.startTime) {
      newErrors.timeRange = '終了時刻は開始時刻より後である必要があります';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave();
    }
  };

  const isVisit = state.block.type === 'visit';
  const title = state.isNew
    ? (state.col === 'planned' ? '📋 予定を追加' : '✅ 実績を追加')
    : (state.col === 'planned' ? '📋 予定を編集' : '✅ 実績を編集');

  return (<>
    <Modal
      open={state.open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          {!state.isNew && (
            <button
              onClick={() => onDelete(state.block.id!)}
              className="mr-auto px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              🗑 削除
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            ✓ 保存
          </button>
        </>
      }
    >
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {/* Time range - Required */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">開始時刻 <span className="text-red-500">*</span></label>
            <input
              type="time"
              value={state.block.startTime ?? ''}
              step={900}
              onChange={e => { onChange(s => ({ ...s, block: { ...s.block, startTime: e.target.value } })); setErrors(e => ({ ...e, startTime: '', timeRange: '' })); }}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                errors.startTime ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">終了時刻 <span className="text-red-500">*</span></label>
            <input
              type="time"
              value={state.block.endTime ?? ''}
              step={900}
              onChange={e => { onChange(s => ({ ...s, block: { ...s.block, endTime: e.target.value } })); setErrors(e => ({ ...e, endTime: '', timeRange: '' })); }}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                errors.endTime ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.endTime && <p className="text-xs text-red-500 mt-1">{errors.endTime}</p>}
          </div>
        </div>
        {errors.timeRange && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{errors.timeRange}</p>
          </div>
        )}

        {/* Block type chips - Required */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">アクティビティ種別 <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-2">
            {BLOCK_TYPES.map((type, idx) => (
              <button
                key={type}
                ref={idx === 0 && !state.focusCustomer ? typeChipRef : undefined}
                onClick={() => { onChange(s => ({ ...s, block: { ...s.block, type } })); setErrors(e => ({ ...e, type: '' })); }}
                className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                  errors.type ? 'border-red-500' : ''
                } ${
                  state.block.type === type
                    ? 'bg-blue-50 border-blue-400 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {BLOCK_EMOJIS[type]} {BLOCK_LABELS[type]}
              </button>
            ))}
          </div>
          {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
        </div>

        {/* Customer select - Optional */}
        <div ref={customerComboboxRef}>
          <label className="block text-xs font-medium text-gray-600 mb-1">顧客 <span className="text-gray-400">(任意)</span></label>
          <CustomerCombobox
            value={state.block.customerId}
            onChange={customerId => onChange(s => ({
              ...s,
              block: { ...s.block, customerId, opportunityId: undefined },
            }))}
            customers={customers.filter(c => c.status === 'active')}
            placeholder="顧客を検索..."
            allowClear={true}
            onAddNew={() => setShowQuickHousehold(true)}
          />
        </div>

        {/* Opportunity select - shown when customer is selected */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">商談案件 <span className="text-gray-400">(任意)</span></label>
          <OpportunityCombobox
            value={state.block.opportunityId}
            onChange={opportunityId => {
              onChange(s => ({ ...s, block: { ...s.block, opportunityId } }));
              setShowStageSelector(false);
            }}
            opportunities={selectedOpportunities}
            disabled={!state.block.customerId}
            onQuickAdd={() => setShowQuickAdd(true)}
          />
          {/* StageSelector shown when opportunity is selected */}
          {state.block.opportunityId && selectedOpportunity && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowStageSelector(v => !v)}
                className="text-xs text-blue-600 hover:underline"
              >
                {showStageSelector ? 'ステージ変更を閉じる' : `→ ステージを変更する（現在: ${selectedOpportunity ? selectedOpportunity.stage : ''}）`}
              </button>
              {showStageSelector && (
                <div className="mt-2">
                  <StageSelector
                    opportunity={selectedOpportunity}
                    onClose={() => setShowStageSelector(false)}
                    compact
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Title - Optional */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">内容 <span className="text-gray-400">(任意)</span></label>
          <input
            type="text"
            value={state.block.title ?? ''}
            onChange={e => onChange(s => ({ ...s, block: { ...s.block, title: e.target.value } }))}
            placeholder="活動内容を入力"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Memo - Optional */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">メモ <span className="text-gray-400">(任意)</span></label>
          <textarea
            value={state.block.memo ?? ''}
            onChange={e => onChange(s => ({ ...s, block: { ...s.block, memo: e.target.value } }))}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
          />
        </div>

        {/* Visit result fields (only shown for visit type) - Accordion */}
        {isVisit && (
          <div className="border border-blue-100 rounded-xl bg-blue-50/40">
            <button
              type="button"
              onClick={() => setVisitResultOpen(!visitResultOpen)}
              className="w-full flex items-center gap-2 p-3 hover:bg-blue-100/30 transition-colors"
            >
              <ChevronDown className={`w-4 h-4 text-blue-700 transition-transform ${
                visitResultOpen ? '' : '-rotate-90'
              }`} />
              <p className="text-xs font-semibold text-blue-700">🤝 訪問結果</p>
            </button>
            {visitResultOpen && (
              <div className="px-3 pb-3 space-y-3 border-t border-blue-100">
                {/* Collected */}
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.block.collected ?? false}
                    onChange={e => onChange(s => ({ ...s, block: { ...s.block, collected: e.target.checked } }))}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span>✅ 集金済み</span>
                </label>

                {/* Next appointment */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">次回アポイント日</label>
                  <input
                    type="date"
                    value={state.block.nextAppointment ?? ''}
                    onChange={e => onChange(s => ({
                      ...s,
                      block: { ...s.block, nextAppointment: e.target.value || undefined },
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Proposal */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">提案内容</label>
                  <input
                    type="text"
                    value={state.block.proposal ?? ''}
                    onChange={e => onChange(s => ({
                      ...s,
                      block: { ...s.block, proposal: e.target.value || undefined },
                    }))}
                    placeholder="提案した内容を入力"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Result memo */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">対応結果メモ</label>
                  <textarea
                    value={state.block.result ?? ''}
                    onChange={e => onChange(s => ({
                      ...s,
                      block: { ...s.block, result: e.target.value || undefined },
                    }))}
                    rows={2}
                    placeholder="対応の結果・状況を記録"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Continue input checkbox */}
        {state.isNew && (
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={continueInput}
              onChange={e => setContinueInput(e.target.checked)}
              className="rounded border-gray-300"
            />
            ☑ 保存して続けて入力
          </label>
        )}
      </div>
    </Modal>

    {/* Quick Household creation modal */}
    {showQuickHousehold && (
      <QuickHouseholdModal
        onClose={() => setShowQuickHousehold(false)}
        onCreated={(customerId, { continueToOpportunity }) => {
          onChange(s => ({ ...s, block: { ...s.block, customerId, opportunityId: undefined } }));
          setShowQuickHousehold(false);
          if (continueToOpportunity) setShowQuickAdd(true);
        }}
      />
    )}

    {/* Quick Opportunity creation modal */}
    {showQuickAdd && state.block.customerId && (() => {
      const household = customers.find(c => c.id === state.block.customerId);
      return (
        <QuickOpportunityModal
          householdId={state.block.customerId!}
          householdName={household?.name ?? ''}
          onCreated={(opportunityId) => {
            onChange(s => ({ ...s, block: { ...s.block, opportunityId } }));
            setShowQuickAdd(false);
          }}
          onClose={() => setShowQuickAdd(false)}
        />
      );
    })()}
  </>);
}
