interface ActivateModalProps {
  policyNumber: string;
  startDate: string;
  onChangePolicyNumber: (v: string) => void;
  onChangeStartDate: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ActivateModal({
  policyNumber,
  startDate,
  onChangePolicyNumber,
  onChangeStartDate,
  onConfirm,
  onCancel,
}: ActivateModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
        <h3 className="font-semibold text-gray-900 mb-4">✅ 契約有効化</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              証券番号 *
            </label>
            <input
              value={policyNumber}
              onChange={(e) => onChangePolicyNumber(e.target.value)}
              placeholder="例: L-0001234"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              契約日
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onChangeStartDate(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium"
          >
            有効化する
          </button>
        </div>
      </div>
    </div>
  );
}
