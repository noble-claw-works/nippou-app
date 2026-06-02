import { Eye, Send } from 'lucide-react';
import { MOOD_EMOJIS } from '../../utils';
import type { DailyReport } from '../../types';

interface StatusBarProps {
  report: DailyReport;
  onShowSubmit: () => void;
  onWithdraw: () => void;
}

export function StatusBar({ report, onShowSubmit, onWithdraw }: StatusBarProps) {
  return (
    <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-4">
      <span className="text-xs text-gray-400">💾 自動保存</span>
      <div className="flex items-center gap-2">
        {(['draft', 'submitted', 'confirmed'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-full ${
              (s === 'draft' && ['draft', 'submitted', 'confirmed'].includes(report.status)) ||
              (s === 'submitted' && ['submitted', 'confirmed'].includes(report.status)) ||
              (s === 'confirmed' && report.status === 'confirmed')
                ? 'bg-blue-500' : 'bg-gray-200'
            }`} />
            <span className="text-xs text-gray-500">{['下書き', '提出済', '確認済'][i]}</span>
            {i < 2 && <div className="w-6 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>
      <div className="flex-1" />
      <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
        <Eye className="w-3.5 h-3.5" /> プレビュー
      </button>
      {report.status === 'draft' && (
        <button
          onClick={onShowSubmit}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Send className="w-3.5 h-3.5" /> 提出する
        </button>
      )}
      {report.status === 'submitted' && (
        <button
          onClick={onWithdraw}
          className="px-4 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          取り下げ
        </button>
      )}
    </div>
  );
}

// ─── Submit Modal content (exported for use in TodayPage) ─────────────────────
interface SubmitModalContentProps {
  report: DailyReport;
}

export function SubmitModalContent({ report }: SubmitModalContentProps) {
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
