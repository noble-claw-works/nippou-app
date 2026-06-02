import { Eye, Send, ChevronRight, CheckCircle, Undo2, Lock } from 'lucide-react';
import { MOOD_EMOJIS } from '../../utils';
import type { DailyReport } from '../../types';

interface StatusBarProps {
  report: DailyReport;
  onConfirmPlanning: () => void;
  onShowSubmit: () => void;
  onWithdraw: () => void;
}

// ステータスラベル定義
const STATUS_STEPS = [
  { key: 'planning',     label: '予定入力' },
  { key: 'in_progress',  label: '実績入力' },
  { key: 'submitted',    label: '提出済み' },
  { key: 'confirmed',    label: '承認済み' },
] as const;

const STATUS_ORDER: Record<string, number> = {
  planning: 0, in_progress: 1, submitted: 2, confirmed: 3,
};

export function StatusBar({ report, onConfirmPlanning, onShowSubmit, onWithdraw }: StatusBarProps) {
  const currentOrder = STATUS_ORDER[report.status] ?? 0;

  return (
    <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-4">
      <span className="text-xs text-gray-400">💾 自動保存</span>

      {/* ステップインジケーター */}
      <div className="flex items-center gap-1">
        {STATUS_STEPS.map((step, i) => {
          const done    = STATUS_ORDER[step.key] < currentOrder;
          const current = step.key === report.status;
          return (
            <div key={step.key} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
                done    ? 'bg-blue-500' :
                current ? 'bg-blue-600 ring-2 ring-blue-200' :
                          'bg-gray-200'
              }`} />
              <span className={`text-xs whitespace-nowrap ${
                current ? 'font-semibold text-blue-700' :
                done    ? 'text-blue-400' :
                          'text-gray-400'
              }`}>
                {step.label}
              </span>
              {i < STATUS_STEPS.length - 1 && (
                <ChevronRight className={`w-3 h-3 flex-shrink-0 ${done ? 'text-blue-300' : 'text-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* プレビューボタン（常時） */}
      <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
        <Eye className="w-3.5 h-3.5" /> プレビュー
      </button>

      {/* planning: 予定を確定するボタン */}
      {report.status === 'planning' && (
        <button
          onClick={onConfirmPlanning}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <CheckCircle className="w-3.5 h-3.5" /> 予定を確定する
        </button>
      )}

      {/* in_progress: 提出するボタン */}
      {report.status === 'in_progress' && (
        <button
          onClick={onShowSubmit}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Send className="w-3.5 h-3.5" /> 提出する
        </button>
      )}

      {/* submitted（未承認）: 取り下げボタン */}
      {report.status === 'submitted' && (
        <button
          onClick={onWithdraw}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-100"
        >
          <Undo2 className="w-3.5 h-3.5" /> 取り下げ
        </button>
      )}

      {/* confirmed: 読み取り専用バナー */}
      {report.status === 'confirmed' && (
        <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg">
          <Lock className="w-3.5 h-3.5" /> 承認済み・変更不可
        </span>
      )}
    </div>
  );
}

// ─── Submit Modal content ────────────────────────────────────────────────────
export function SubmitModalContent({ report }: { report: DailyReport }) {
  return (
    <div className="space-y-3">
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">📊 時間ブロック</span>
          <span className="font-medium">{report.blocks.length} 件</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">✅ TODO</span>
          <span className="font-medium">
            完了 {report.todos.filter(t => t.completed).length} / {report.todos.length}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">🌤 気分</span>
          <span className="font-medium">
            {report.morningMood ? MOOD_EMOJIS[report.morningMood] : '未設定'} →{' '}
            {report.eveningMood ? MOOD_EMOJIS[report.eveningMood] : '未設定'}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-600">上長（佐藤 健一）に提出します。</p>
    </div>
  );
}
