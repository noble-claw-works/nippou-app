import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, subMonths, addMonths } from 'date-fns';
import { useAppStore } from '../store';
import { MOOD_EMOJIS } from '../utils';
import type { ReportStatus } from '../types';

const STATUS_ICON: Record<ReportStatus, string> = {
  planning: '✎', in_progress: '✍', submitted: '✓', confirmed: '★',
};

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'month' | 'heatmap'>('month');
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
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">
            {format(currentMonth, 'yyyy年M月')}
          </h1>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100">
            <ChevronRight className="w-4 h-4" />
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
              const dow = day.getDay();
              const isWeekend = dow === 0 || dow === 6;
              return (
                <div key={day.toISOString()}
                  onClick={() => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    if (today) navigate('/today');
                    else if (report) navigate(`/reports/${dateStr}`);
                  }}
                  className={`min-h-[80px] p-2 border-r border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 ${!isCurrentMonth ? 'opacity-40' : ''} ${isWeekend ? 'bg-gray-50/50' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm mb-1 ${today ? 'bg-blue-600 text-white font-bold' : 'text-gray-700'}`}>
                    {format(day, 'd')}
                  </div>
                  {report && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">{STATUS_ICON[report.status]}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          report.status === 'confirmed' ? 'bg-green-500' :
                          report.status === 'submitted' ? 'bg-blue-500' :
                          'bg-gray-400'
                        }`} />
                      </div>
                      {report.morningMood && (
                        <span className="text-xs">{MOOD_EMOJIS[report.morningMood]}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="px-4 py-2 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
            {[['✎', '下書き'], ['✓', '提出済'], ['★', '確認済'], ['↩', '差戻し']].map(([icon, label]) => (
              <span key={icon}><span className="font-mono">{icon}</span> {label}</span>
            ))}
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
