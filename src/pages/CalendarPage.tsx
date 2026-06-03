import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, subMonths, addMonths } from 'date-fns';
import { useAppStore } from '../store';
import { MOOD_EMOJIS } from '../utils';
import type { ReportStatus } from '../types';

// CAL-1: 状態アイコンを大型化・表現を強化
const STATUS_ICON: Record<ReportStatus, string> = {
  planning: '✎', in_progress: '✍', submitted: '✅', confirmed: '⭐',
};

// CAL-1: 状態別背景色塗り分け
const STATUS_BG: Record<ReportStatus, string> = {
  planning: 'bg-gray-50 border-gray-200',
  in_progress: 'bg-yellow-50 border-yellow-200',
  submitted: 'bg-blue-50 border-blue-300',
  confirmed: 'bg-green-50 border-green-300',
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  planning: '予定入力中', in_progress: '実績入力中', submitted: '提出済', confirmed: '確認済',
};

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'month' | 'heatmap'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null); // CAL-1: 選択日
  const navigate = useNavigate();
  const { reports, users, currentRole, currentUserId } = useAppStore();

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });

  const getReport = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (currentRole === 'general') {
      return reports.find(r => r.userId === currentUserId && r.date === dateStr);
    }
    return reports.find(r => r.date === dateStr);
  };

  const teamUsers = users.filter(u => ['general', 'manager'].includes(u.role));

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* CAL-1: 月移動ボタンを大型化・コントラスト強化 */}
          <button
            type="button"
            onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            className="flex items-center gap-1 px-3 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-blue-500 transition-colors min-h-[44px]"
            aria-label="前月"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
            <span className="hidden sm:inline text-sm text-gray-700">前月</span>
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 min-w-[7em] text-center">
            {format(currentMonth, 'yyyy年M月')}
          </h1>
          <button
            type="button"
            onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="flex items-center gap-1 px-3 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-blue-500 transition-colors min-h-[44px]"
            aria-label="翌月"
          >
            <span className="hidden sm:inline text-sm text-gray-700">翌月</span>
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
          <button
            type="button"
            onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}
            className="px-3 py-2 text-xs sm:text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 min-h-[44px]"
          >
            今日
          </button>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {[['month', '月'], ['heatmap', 'ヒートマップ']].map(([v, l]) => (
            <button key={v} onClick={() => setView(v as any)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${view === v ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {view === 'month' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-100">
            {['月', '火', '水', '木', '金', '土', '日'].map(d => (
              <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {/* Leading empty cells */}
            {Array.from({ length: (start.getDay() + 6) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-r border-b border-gray-50" />
            ))}
            {days.map(day => {
              const report = getReport(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const selected = selectedDate ? isSameDay(day, selectedDate) : false;
              const dow = day.getDay();
              const isWeekend = dow === 0 || dow === 6;
              // CAL-1: 状態別背景を塗り分け
              const statusBgCls = report ? STATUS_BG[report.status] : '';
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    setSelectedDate(day);
                    const dateStr = format(day, 'yyyy-MM-dd');
                    if (today) navigate('/today');
                    else if (report) navigate(`/reports/${dateStr}`);
                  }}
                  aria-label={`${format(day, 'yyyy年M月d日')}${report ? ` ${STATUS_LABEL[report.status]}` : ''}`}
                  aria-current={today ? 'date' : undefined}
                  className={`text-left min-h-[80px] p-2 border-r border-b transition-colors cursor-pointer
                    ${!isCurrentMonth ? 'opacity-40' : ''}
                    ${isWeekend ? 'bg-gray-50/40' : 'bg-white'}
                    ${statusBgCls}
                    ${selected ? 'ring-2 ring-blue-500 ring-inset z-10' : ''}
                    ${today ? 'border-l-4 border-l-blue-600' : 'border-gray-100'}
                    hover:bg-blue-50/50`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm mb-1
                    ${today ? 'bg-blue-600 text-white font-bold shadow-sm' :
                      selected ? 'bg-blue-100 text-blue-800 font-bold ring-1 ring-blue-400' :
                      'text-gray-700'}`}>
                    {format(day, 'd')}
                  </div>
                  {report && (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1">
                        {/* CAL-1: 状態アイコンを大型化 */}
                        <span className="text-base leading-none" title={STATUS_LABEL[report.status]}>{STATUS_ICON[report.status]}</span>
                        {report.morningMood && (
                          <span className="text-sm leading-none">{MOOD_EMOJIS[report.morningMood]}</span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {/* CAL-1: 凡例を背景色付きチップで表示 */}
          <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-2 text-xs text-gray-600">
            <span className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded">✎ 下書き</span>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded">✍ 入力中</span>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-300 rounded font-medium">✅ 提出済</span>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-300 rounded font-medium">⭐ 確認済</span>
            <span className="flex items-center gap-1.5 px-2 py-1 border-l-4 border-blue-600 border-y border-r border-gray-200 rounded">今日</span>
            <span className="flex items-center gap-1.5 px-2 py-1 ring-2 ring-blue-500 ring-inset rounded">選択中</span>
          </div>
        </div>
      )}

      {view === 'heatmap' && (currentRole === 'manager' || currentRole === 'executive' ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 min-w-[120px]">メンバー</th>
                  {days.slice(0, 14).map(d => (
                    <th key={d.toISOString()} className="px-2 py-2 text-center text-xs text-gray-400 min-w-[40px]">
                      {format(d, 'M/d')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamUsers.map(user => (
                  <tr key={user.id} className="border-b border-gray-50">
                    <td className="px-4 py-2 text-xs font-medium text-gray-700">{user.name}</td>
                    {days.slice(0, 14).map(d => {
                      const dateStr = format(d, 'yyyy-MM-dd');
                      const report = reports.find(r => r.userId === user.id && r.date === dateStr);
                      return (
                        <td key={d.toISOString()} className="px-2 py-2 text-center">
                          {report ? (
                            <span className="text-base cursor-pointer" onClick={() => navigate(`/reports/${dateStr}`)}>
                              {report.eveningMood ? MOOD_EMOJIS[report.eveningMood] : '📄'}
                            </span>
                          ) : (
                            <span className="text-gray-200 text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-3">🚫</div>
          <p className="text-gray-500 text-sm">ヒートマップは上長・経営者のみ閲覧できます</p>
        </div>
      ))}
    </div>
  );
}
