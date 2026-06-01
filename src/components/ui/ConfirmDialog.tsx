import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  requireInput?: string;
  inputValue?: string;
  onInputChange?: (v: string) => void;
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmLabel = '確認', confirmVariant = 'danger',
  requireInput, inputValue = '', onInputChange,
}: ConfirmDialogProps) {
  const canConfirm = !requireInput || inputValue === requireInput;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="xs"
      closeOnBackdrop={false}
      footer={
        <>
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            キャンセル
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            disabled={!canConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
              confirmVariant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="text-sm text-gray-700">{message}</div>
        {requireInput && onInputChange && (
          <div>
            <p className="text-xs text-gray-500 mb-1">確認のため「{requireInput}」と入力してください</p>
            <input
              type="text"
              value={inputValue}
              onChange={e => onInputChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
