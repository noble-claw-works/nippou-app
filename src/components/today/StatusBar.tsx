import { Eye, Send, ChevronRight, CheckCircle, Undo2, Lock } from 'lucide-react';
import { MOOD_EMOJIS } from '../../utils';
import type { DailyReport } from '../../types';

interface StatusBarProps {
  report: DailyReport;
  onConfirmPlanning: () => void;
  onShowSubmit: () => void;
  onWithdraw: () => void;
}

const STATUS_STEPS = [
  { key: 'planning',    label: '予定入力' },
  { key: 'in_progress', label: '実績入力' },
  { key: 'submitted',   label: '提出済み' },
  { key: 'confirmed',   label: '承認済み' },
] as const;

const STATUS_ORDER: Record<string, number> = {
  planning: 0, in_progress: 1, submitted: 2, confirmed: 3,
};

/** P1-3: ステッパー（ヘッダー直下に表示するため export） */
export function StatusStepper({ report }: { report: DailyReport }) {
  const currentOrder = STATUS_ORDER[report.status] ?? 0;
  return (
    <div className="flex items-center justify-center gap-1 py-2 px-4 bg-white border-b border-gray-100">
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
            <span className={`text-xs whitespace-nowrap font-medium ${
              current ? 'text-blue-700 font-semibold' :
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
  );
}

export function StatusBar({ report, onConfirmPlanning, onShowSubmit, onWithdraw }: StatusBarProps) {
  // P1-2: planning 状態で予定ブロックが1件以上あればパルスアニメ
  const hasPlanningBlocks = report.status === 'planning' && report.blocks.filter(b => b.isPlanned).length > 0;

  return (
    <div className="flex-shrink-0 bg-white border-t border-gray-200 px-3 py-2.5 flex items-center gap-2 sm:gap-4 flex-wrap">
      <span className="text-xs text-gray-400 hidden sm:inline">💾 自動保存</span>

      <div className="flex-1" />

      {/* プレビューボタン */}
      <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 min-h-[40px]">
        <Eye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">プレビュー</span>
      </button>

      {/* planning: 予定を確定する（P1-2: 大型化 + パルス） */}
      {report.status === 'planning' && (
        <button
          onClick={onConfirmPlanning}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm min-h-[44px] transition-all ${
            hasPlanningBlocks ? 'animate-pulse' : ''
          }`}
        >
          <CheckCircle className="w-4 h-4" /> 予定を確定する
        </button>
      )}

      {/* in_progress: 提出する */}
      {report.status === 'in_progress' && (
        <button
          onClick={onShowSubmit}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm min-h-[44px]"
        >
          <Send className="w-4 h-4" /> 提出する
        </button>
      )}

      {/* submitted: 取り下げ */}
      {report.status === 'submitted' && (
        <button
          onClick={onWithdraw}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-50 text-amber-700 border border-amber-300 rounded-xl hover:bg-amber-100 min-h-[44px]"
        >
          <Undo2 className="w-4 h-4" /> 取り下げ
        </button>
      )}

      {/* confirmed */}
      {report.status === 'confirmed' && (
        <span className="flex items-center gap-1.5 px-3 py-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl">
          <Lock className="w-3.5 h-3.5" /> 承認済み・変更不可
        </span>
      )}
    </div>
  );
}

// ─── Submit Modal content ─────────────────────────────────────────────────────
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
