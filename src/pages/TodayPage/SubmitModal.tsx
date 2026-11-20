import { Modal } from "../../components/ui/Modal";
import { SubmitModalContent } from "../../components/today/StatusBar";
import type { DailyReport } from "../../types";

interface SubmitModalProps {
  report: DailyReport;
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function SubmitModal({
  report,
  open,
  onClose,
  onSubmit,
}: SubmitModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="提出前の確認"
      size="sm"
      closeOnBackdrop={false}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← 戻る
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            ✓ 提出する
          </button>
        </>
      }
    >
      <SubmitModalContent report={report} />
    </Modal>
  );
}
