import type { BlockType, MoodType, Role } from '../types';

export const BLOCK_COLORS: Record<BlockType, string> = {
  visit:   'bg-blue-100 border-blue-400 text-blue-800',
  office:  'bg-purple-100 border-purple-400 text-purple-800',
  phone:   'bg-green-100 border-green-400 text-green-800',
  travel:  'bg-gray-100 border-gray-400 text-gray-800',
  break:   'bg-yellow-100 border-yellow-400 text-yellow-800',
  meeting: 'bg-pink-100 border-pink-400 text-pink-800',
  lunch:   'bg-orange-100 border-orange-400 text-orange-800',
};

export const BLOCK_LABELS: Record<BlockType, string> = {
  visit: '訪問', office: '事務', phone: '電話',
  travel: '移動', break: '休憩', meeting: '会議', lunch: '昼食',
};

export const BLOCK_EMOJIS: Record<BlockType, string> = {
  visit: '🤝', office: '📑', phone: '📞',
  travel: '🚗', break: '☕', meeting: '👥', lunch: '🍱',
};

export const MOOD_EMOJIS: Record<MoodType, string> = {
  sunny: '☀️', partly_cloudy: '🌤️', cloudy: '☁️', rainy: '🌧️',
};

export const ROLE_LABELS: Record<Role, string> = {
  general: '一般社員', manager: '上長', executive: '経営者', admin: '管理者',
};

export const ROLE_DEMO_USERS: Record<Role, string> = {
  general: '袴田 祐司', manager: '佐藤 健一', executive: '鈴木 美咲', admin: '高田 一郎',
};

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}（${dow}）`;
}

export function formatRelativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}時間前`;
  return formatDate(isoStr.split('T')[0]);
}

/** タイムラインのスキマ時間（gap）を表す要素。1 日のブロック並びを timeline 順に走査して生成。 */
export interface TimelineGap {
  kind: 'gap';
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  durationMin: number;
}

export interface TimelineBlockRef<T> {
  kind: 'block';
  block: T;
}

export type TimelineItem<T> = TimelineBlockRef<T> | TimelineGap;

/**
 * ブロック列を startTime 昇順に並べ、隣り合うブロック間に minGapMin 分以上の空白が
 * あれば gap を挿入した混在配列を返す。
 *
 * @param blocks startTime/endTime (HH:MM) を持つブロック
 * @param minGapMin gap として表示する最小分（既定 5 分。これ未満は誤差扱いで無視）
 */
export function buildTimelineWithGaps<T extends { startTime: string; endTime: string }>(
  blocks: T[],
  minGapMin = 5,
): TimelineItem<T>[] {
  const sorted = [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const result: TimelineItem<T>[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    if (i > 0) {
      const prev = sorted[i - 1];
      const prevEnd = timeToMinutes(prev.endTime);
      const curStart = timeToMinutes(cur.startTime);
      const diff = curStart - prevEnd;
      if (diff >= minGapMin) {
        result.push({
          kind: 'gap',
          startTime: prev.endTime,
          endTime: cur.startTime,
          durationMin: diff,
        });
      }
    }
    result.push({ kind: 'block', block: cur });
  }
  return result;
}

/** 分数を「1時間30分」「45分」形式に整形 */
export function formatGapDuration(mins: number): string {
  if (mins < 60) return `${mins}分`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

export function canViewReport(viewerRole: Role, viewerUserId: string, reportUserId: string, viewerTeamIds: string[], reportUserTeamIds: string[]): boolean {
  if (viewerRole === 'admin') return false;
  if (viewerRole === 'executive') return true;
  if (viewerRole === 'manager') {
    return viewerUserId === reportUserId || viewerTeamIds.some(tid => reportUserTeamIds.includes(tid));
  }
  return viewerUserId === reportUserId;
}
