import { useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { BLOCK_EMOJIS, BLOCK_LABELS } from '../../utils';
import type { Customer, TimeBlock } from '../../types';
import { BLOCK_TYPES } from '../timeline/DragAndChip';

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
  const customerSelectRef = useRef<HTMLSelectElement>(null);
  const typeChipRef = useRef<HTMLButtonElement>(null);

  // Auto-focus after open
  useEffect(() => {
    if (!state.open) return;
    const id = setTimeout(() => {
      if (state.focusCustomer) {
        customerSelectRef.current?.focus();
      } else {
        typeChipRef.current?.focus();
      }
    }, 80);
    return () => clearTimeout(id);
  }, [state.open, state.focusCustomer]);

  const isVisit = state.block.type === 'visit';
  const title = state.isNew
    ? (state.col === 'planned' ? '📋 予定を追加' : '✅ 実績を追加')
    : (state.col === 'planned' ? '📋 予定を編集' : '✅ 実績を編集');

  return (
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
            onClick={onSave}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            ✓ 保存
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Time range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">開始時刻</label>
            <input
              type="time"
              value={state.block.startTime ?? ''}
              step={900}
              onChange={e => onChange(s => ({ ...s, block: { ...s.block, startTime: e.target.value } }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">終了時刻</label>
            <input
              type="time"
              value={state.block.endTime ?? ''}
              step={900}
              onChange={e => onChange(s => ({ ...s, block: { ...s.block, endTime: e.target.value } }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Block type chips */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">アクティビティ種別</label>
          <div className="flex flex-wrap gap-2">
            {BLOCK_TYPES.map((type, idx) => (
              <button
                key={type}
                ref={idx === 0 && !state.focusCustomer ? typeChipRef : undefined}
                onClick={() => onChange(s => ({ ...s, block: { ...s.block, type } }))}
                className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                  state.block.type === type
                    ? 'bg-blue-50 border-blue-400 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {BLOCK_EMOJIS[type]} {BLOCK_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Customer select */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">顧客（任意）</label>
          <select
            ref={customerSelectRef}
            value={state.block.customerId ?? ''}
            onChange={e => onChange(s => ({
              ...s,
              block: { ...s.block, customerId: e.target.value || undefined },
            }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">選択しない</option>
            {customers.filter(c => c.status === 'active').map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">内容</label>
          <input
            type="text"
            value={state.block.title ?? ''}
            onChange={e => onChange(s => ({ ...s, block: { ...s.block, title: e.target.value } }))}
            placeholder="活動内容を入力"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Memo */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">メモ</label>
          <textarea
            value={state.block.memo ?? ''}
            onChange={e => onChange(s => ({ ...s, block: { ...s.block, memo: e.target.value } }))}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
          />
        </div>

        {/* Visit result fields (only shown for visit type) */}
        {isVisit && (
          <div className="border border-blue-100 rounded-xl p-3 bg-blue-50/40 space-y-3">
            <p className="text-xs font-semibold text-blue-700">🤝 訪問結果</p>

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
  );
}
