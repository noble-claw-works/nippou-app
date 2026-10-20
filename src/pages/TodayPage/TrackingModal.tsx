import { Modal } from "../../components/ui/Modal";
import { CustomerCombobox } from "../../components/ui/CustomerCombobox";
import { BLOCK_EMOJIS, BLOCK_LABELS } from "../../utils";
import { BLOCK_TYPES } from "../../components/timeline/DragAndChip";
import type { BlockType, Customer } from "../../types";

interface TrackingModalProps {
  open: boolean;
  trackType: BlockType;
  trackCustomer: string;
  customers: Customer[];
  onClose: () => void;
  onStart: () => void;
  onTypeChange: (type: BlockType) => void;
  onCustomerChange: (id: string) => void;
}

export function TrackingModal({
  open,
  trackType,
  trackCustomer,
  customers,
  onClose,
  onStart,
  onTypeChange,
  onCustomerChange,
}: TrackingModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="何を始めますか？"
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg"
          >
            キャンセル
          </button>
          <button
            onClick={onStart}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            ▶ 開始する
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            種別を選択
          </label>
          <div className="flex flex-wrap gap-2">
            {BLOCK_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => onTypeChange(type)}
                className={`px-3 py-2 text-xs rounded-xl border transition-colors ${trackType === type ? "bg-blue-50 border-blue-400 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
              >
                {BLOCK_EMOJIS[type]} {BLOCK_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            顧客（任意）
          </label>
          <CustomerCombobox
            value={trackCustomer || undefined}
            onChange={(id) => onCustomerChange(id ?? "")}
            customers={customers.filter((c) => c.status === "active")}
            placeholder="顧客を検索..."
            allowClear={true}
          />
        </div>
      </div>
    </Modal>
  );
}
