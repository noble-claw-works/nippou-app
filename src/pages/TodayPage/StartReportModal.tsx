import { Modal } from "../../components/ui/Modal";

interface StartReportModalProps {
  open: boolean;
  onClose: () => void;
  onStart: (mode: "copy_prev" | "template" | "blank") => void;
}

export function StartReportModal({
  open,
  onClose,
  onStart,
}: StartReportModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="今日の日報をどう始めますか？"
      size="sm"
      closeOnBackdrop={false}
    >
      <div className="space-y-2">
        {(
          [
            {
              id: "copy_prev",
              emoji: "📋",
              title: "前日の予定をコピー",
              sub: "おすすめ",
            },
            {
              id: "template",
              emoji: "🧩",
              title: "テンプレートから始める",
              sub: "",
            },
            { id: "blank", emoji: "✨", title: "白紙から始める", sub: "" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            onClick={() => onStart(opt.id)}
            className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 text-left transition-colors"
          >
            <span className="text-2xl">{opt.emoji}</span>
            <div>
              <span className="text-sm font-medium text-gray-800">
                {opt.title}
              </span>
              {opt.sub && (
                <span className="ml-2 text-xs text-blue-600 font-medium">
                  [{opt.sub}]
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
