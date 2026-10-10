// =====================================================
// TodoProgressPanel.tsx - MGR-5 部下別 TODO 進捗・件数表示 / DEAD-1 期限切れ警告
// =====================================================
import { useMemo } from 'react';
import { format, isBefore, isToday, parseISO, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { DailyReport, User, Todo } from '../../types';

interface Props {
  reports: DailyReport[];
  users: User[];
  onOpenUserReport?: (userId: string, date: string) => void;
}

interface UserStat {
  user: User;
  total: number;
  done: number;
  doing: number;
  todo: number;
  overdue: Array<{ todo: Todo; date: string }>;
  dueToday: Array<{ todo: Todo; date: string }>;
  progress: number;
}

export function TodoProgressPanel({ reports, users, onOpenUserReport }: Props) {
  const today = startOfDay(new Date());

  const stats: UserStat[] = useMemo(() => {
    const targetUsers = users.filter(u => ['general', 'manager'].includes(u.role) && u.status === 'active');
    return targetUsers.map(u => {
      const userReports = reports.filter(r => r.userId === u.id);
      const allTodos: Array<{ todo: Todo; date: string }> = [];
      userReports.forEach(r => r.todos.forEach(t => allTodos.push({ todo: t, date: r.date })));

      const total = allTodos.length;
      const done = allTodos.filter(x => x.todo.status === 'done' || x.todo.completed).length;
      const doing = allTodos.filter(x => x.todo.status === 'doing' && !x.todo.completed).length;
      const todo = allTodos.filter(x => x.todo.status === 'todo' && !x.todo.completed).length;

      // DEAD-1: 期限切れ判定
      const overdue: Array<{ todo: Todo; date: string }> = [];
      const dueToday: Array<{ todo: Todo; date: string }> = [];
      allTodos.forEach(({ todo, date }) => {
        if (todo.status === 'done' || todo.completed) return;
        const due = todo.dueDate ? parseISO(todo.dueDate) : parseISO(date);
        if (isToday(due)) dueToday.push({ todo, date });
        else if (isBefore(due, today)) overdue.push({ todo, date });
      });

      const progress = total > 0 ? Math.round((done / total) * 100) : 0;
      return { user: u, total, done, doing, todo, overdue, dueToday, progress };
    }).sort((a, b) => b.overdue.length - a.overdue.length || a.progress - b.progress);
  }, [reports, users, today]);

  const totalOverdue = stats.reduce((s, u) => s + u.overdue.length, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-gray-700">
          📋 部下別 TODO 進捗
          {totalOverdue > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium" aria-label={`期限切れ TODO ${totalOverdue} 件`}>
              ⚠ 期限切れ {totalOverdue} 件
            </span>
          )}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {stats.map(s => {
          const progressColor = s.progress >= 80 ? 'bg-green-500' :
            s.progress >= 50 ? 'bg-blue-500' :
              s.progress >= 25 ? 'bg-amber-500' : 'bg-red-500';
          const hasAlert = s.overdue.length > 0;
          return (
            <div
              key={s.user.id}
              className={`border rounded-lg p-3 ${hasAlert ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">{s.user.name}</span>
                  {hasAlert && (
                    <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold" aria-label="期限切れあり">
                      ⚠ {s.overdue.length}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500 tabular-nums">{s.done}/{s.total}</span>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                <div className={`h-2 rounded-full ${progressColor}`} style={{ width: `${s.progress}%` }} />
              </div>

              <div className="flex gap-3 text-xs text-gray-600 mb-2 flex-wrap">
                <span><span className="font-medium text-gray-800">{s.progress}%</span></span>
                <span>✅ 完了 {s.done}</span>
                <span>🔄 進行中 {s.doing}</span>
                <span>📌 未着手 {s.todo}</span>
              </div>

              {s.dueToday.length > 0 && (
                <div className="mt-2 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-xs">
                  <p className="font-medium text-amber-800 mb-0.5">⏰ 今日が期限 ({s.dueToday.length})</p>
                  <ul className="space-y-0.5">
                    {s.dueToday.slice(0, 3).map(x => (
                      <li key={x.todo.id} className="truncate text-amber-900">• {x.todo.text}</li>
                    ))}
                  </ul>
                </div>
              )}

              {s.overdue.length > 0 && (
                <div className="mt-2 px-2 py-1.5 bg-red-50 border border-red-200 rounded text-xs">
                  <p className="font-medium text-red-800 mb-0.5">🚨 期限切れ ({s.overdue.length})</p>
                  <ul className="space-y-0.5">
                    {s.overdue.slice(0, 3).map(x => {
                      const due = x.todo.dueDate ? format(parseISO(x.todo.dueDate), 'M/d', { locale: ja }) : format(parseISO(x.date), 'M/d', { locale: ja });
                      return (
                        <li key={x.todo.id} className="text-red-900 flex items-start gap-1">
                          <span className="text-red-600 font-bold tabular-nums flex-shrink-0">{due}</span>
                          <button
                            type="button"
                            onClick={() => onOpenUserReport?.(s.user.id, x.date)}
                            className="truncate hover:underline text-left flex-1"
                          >
                            {x.todo.text}
                          </button>
                        </li>
                      );
                    })}
                    {s.overdue.length > 3 && (
                      <li className="text-red-700 text-[10px]">他 {s.overdue.length - 3} 件...</li>
                    )}
                  </ul>
                </div>
              )}

              {s.total === 0 && (
                <p className="text-xs text-gray-400 mt-1">TODO 未登録</p>
              )}
            </div>
          );
        })}
        {stats.length === 0 && (
          <p className="col-span-2 text-sm text-gray-400 py-6 text-center">対象メンバーがいません</p>
        )}
      </div>
    </div>
  );
}
