// =====================================================
// CalendarViews.tsx - CAL-2 週/日/リスト ビューと SubNav
// CalendarPage の容量肥大化を避けるため切り出し
// =====================================================
import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday,
  startOfMonth, endOfMonth,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { BLOCK_COLORS, BLOCK_EMOJIS, BLOCK_LABELS, calcMiniTimelineSegments } from '../../utils';
import { ReadOnlyTimeline } from '../report/ReadOnlyTimeline';
import { StatusBadge } from '../ui/StatusBadge';
import type { DailyReport, User, Customer, Role } from '../../types';

// ─── SubNav ───────────────────────────────────────────────────────────────────
export interface SubNavProps {
  view: 'week' | 'day';
  baseDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}
export function SubNav({ view, baseDate, onPrev, onNext, onToday }: SubNavProps) {
  let label = '';
  if (view === 'week') {
    const s = startOfWeek(baseDate, { weekStartsOn: 1 });
    const e = endOfWeek(baseDate, { weekStartsOn: 1 });
    label = `${format(s, 'M/d')} – ${format(e, 'M/d')}`;
  } else {
    label = format(baseDate, 'yyyy年M月d日 (E)', { locale: ja });
  }
  return (
    <div className="flex items-center gap-2 mb-3">
      <button
        type="button"
        onClick={onPrev}
        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[40px]"
        aria-label={view === 'week' ? '前週' : '前日'}
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="text-xs">{view === 'week' ? '前週' : '前日'}</span>
      </button>
      <span className="text-sm font-medium text-gray-800 min-w-[10em] text-center">{label}</span>
      <button
        type="button"
        onClick={onNext}
        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[40px]"
        aria-label={view === 'week' ? '翌週' : '翌日'}
      >
        <span className="text-xs">{view === 'week' ? '翌週' : '翌日'}</span>
        <ChevronRight className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onToday}
        className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 min-h-[40px]"
      >
        今日
      </button>
    </div>
  );
}

// ─── WeekView ─────────────────────────────────────────────────────────────────
export interface WeekViewProps {
  baseDate: Date;
  reports: DailyReport[];
  users: User[];
  currentRole: Role;
  currentUserId: string;
  onSelectDay: (d: Date) => void;
  onOpenReport: (dateStr: string) => void;
}
export function WeekView({ baseDate, reports, currentRole, currentUserId, onSelectDay, onOpenReport }: WeekViewProps) {
  const s = startOfWeek(baseDate, { weekStartsOn: 1 });
  const e = endOfWeek(baseDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: s, end: e });
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="divide-y divide-gray-100">
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const report = currentRole === 'general'
            ? reports.find(r => r.userId === currentUserId && r.date === dateStr)
            : reports.find(r => r.date === dateStr);
          const today = isToday(day);
          const sortedBlocks = report ? [...report.blocks].sort((a, b) => a.startTime.localeCompare(b.startTime)) : [];
          const segs = calcMiniTimelineSegments(sortedBlocks);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => report ? onOpenReport(dateStr) : onSelectDay(day)}
              className={`w-full text-left p-3 hover:bg-blue-50 transition-colors ${today ? 'bg-blue-50/30' : ''}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-12 flex-shrink-0 text-center ${today ? 'bg-blue-600 text-white rounded-full py-1' : ''}`}>
                  <div className="text-[10px] text-current">{format(day, 'E', { locale: ja })}</div>
                  <div className={`font-bold ${today ? 'text-white' : 'text-gray-800'}`}>{format(day, 'd')}</div>
                </div>
                <div className="flex-1 min-w-0">
                  {report ? (
                    <div className="flex items-center gap-2">
                      <StatusBadge status={report.status} />
                      <span className="text-xs text-gray-600">{report.blocks.length} ブロック</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">日報なし</span>
                  )}
                </div>
              </div>
              {report && sortedBlocks.length > 0 && (
                <div className="relative h-6 bg-gray-50 rounded-md overflow-hidden ml-15" style={{ marginLeft: '60px' }}>
                  {sortedBlocks.map((b, i) => {
                    const seg = segs[i];
                    if (seg.hidden) return null;
                    const color = BLOCK_COLORS[b.type].split(' ').find(c => c.startsWith('bg-')) ?? 'bg-blue-100';
                    return (
                      <div
                        key={b.id}
                        className={`absolute top-0 bottom-0 ${color} border-r border-white/60 flex items-center justify-center text-[10px] overflow-hidden`}
                        style={{ left: `${seg.leftPct}%`, width: `${Math.max(seg.widthPct, 1.5)}%` }}
                        title={`${b.startTime}–${b.endTime} ${b.title || BLOCK_LABELS[b.type]}`}
                      >
                        <span aria-hidden="true">{BLOCK_EMOJIS[b.type]}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── DayView ──────────────────────────────────────────────────────────────────
export interface DayViewProps {
  baseDate: Date;
  reports: DailyReport[];
  users: User[];
  customers: Customer[];
  currentRole: Role;
  currentUserId: string;
  onOpenReport: (dateStr: string, userId: string) => void;
}
export function DayView({ baseDate, reports, users, customers, currentRole, currentUserId, onOpenReport }: DayViewProps) {
  const dateStr = format(baseDate, 'yyyy-MM-dd');
  const dayReports = useMemo(() => {
    if (currentRole === 'general') {
      return reports.filter(r => r.date === dateStr && r.userId === currentUserId);
    }
    return reports.filter(r => r.date === dateStr);
  }, [reports, dateStr, currentRole, currentUserId]);

  if (dayReports.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="text-3xl mb-2">📅</div>
        <p className="text-sm text-gray-500">{format(baseDate, 'M/d', { locale: ja })} に該当する日報がありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dayReports.map(r => {
        const author = users.find(u => u.id === r.userId);
        return (
          <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {author && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
                    {author.avatarInitials}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{author?.name}</p>
                  <StatusBadge status={r.status} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenReport(r.date, r.userId)}
                className="text-xs text-blue-600 hover:underline"
              >
                日報を開く →
              </button>
            </div>
            <ReadOnlyTimeline blocks={r.blocks} customers={customers} />
          </div>
        );
      })}
    </div>
  );
}

// ─── ListView ─────────────────────────────────────────────────────────────────
export interface ListViewProps {
  baseMonth: Date;
  reports: DailyReport[];
  users: User[];
  currentRole: Role;
  currentUserId: string;
  onOpenReport: (dateStr: string, userId: string) => void;
}
export function ListView({ baseMonth, reports, users, currentRole, currentUserId, onOpenReport }: ListViewProps) {
  const s = startOfMonth(baseMonth);
  const e = endOfMonth(baseMonth);
  const monthReports = useMemo(() => {
    const ms = format(s, 'yyyy-MM-dd');
    const me = format(e, 'yyyy-MM-dd');
    const scoped = currentRole === 'general'
      ? reports.filter(r => r.userId === currentUserId)
      : reports;
    return scoped
      .filter(r => r.date >= ms && r.date <= me)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [reports, s, e, currentRole, currentUserId]);

  if (monthReports.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="text-3xl mb-2">📋</div>
        <p className="text-sm text-gray-500">{format(baseMonth, 'yyyy年M月', { locale: ja })} の日報はまだありません</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <ul className="divide-y divide-gray-100">
        {monthReports.map(r => {
          const author = users.find(u => u.id === r.userId);
          const blockCount = r.blocks.length;
          const visited = r.blocks.filter(b => b.customerId).length;
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onOpenReport(r.date, r.userId)}
                className="w-full text-left p-4 hover:bg-blue-50 transition-colors flex items-center gap-3"
              >
                <div className="w-14 text-center flex-shrink-0">
                  <div className="text-[10px] text-gray-500">{format(new Date(r.date), 'E', { locale: ja })}</div>
                  <div className="text-lg font-bold text-gray-900">{format(new Date(r.date), 'd')}</div>
                  <div className="text-[10px] text-gray-400">{format(new Date(r.date), 'M月')}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {currentRole !== 'general' && author && (
                      <span className="text-sm font-semibold text-gray-900">{author.name}</span>
                    )}
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {blockCount} ブロック{visited > 0 ? ` · 訪問 ${visited}件` : ''}
                  </p>
                </div>
                <span className="text-xs text-blue-600 flex-shrink-0">開く →</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
