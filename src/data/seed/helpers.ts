// =====================================================
// シードデータ共通ヘルパー
// =====================================================
import type { TimeBlock, Todo, Comment, DailyReport } from "../../types";
import { format, subDays, addDays } from "date-fns";

export const today = format(new Date(), "yyyy-MM-dd");
export const d = (n: number) => format(subDays(new Date(), n), "yyyy-MM-dd");
export const f = (n: number) => format(addDays(new Date(), n), "yyyy-MM-dd");
// 直近の平日（土日をスキップ）—項目6 デモ用日付として使用
export const _lastWeekday = (() => {
  let i = 1;
  while (i <= 7) {
    const candidate = subDays(new Date(), i);
    const dow = candidate.getDay();
    if (dow !== 0 && dow !== 6) return format(candidate, "yyyy-MM-dd");
    i++;
  }
  return d(1); // fallback
})();

// F4: 直近の平日一覧（土日スキップ済み）を取得して商談報告日程に使う
export const _recentWeekdays = (() => {
  const result: string[] = [];
  for (let i = 1; i <= 30 && result.length < 5; i++) {
    const candidate = subDays(new Date(), i);
    const dow = candidate.getDay();
    if (dow !== 0 && dow !== 6) result.push(format(candidate, "yyyy-MM-dd"));
  }
  return result; // [0]=1営業日前, [1]=2営業日前, [2]=3営業日前...
})();
// _lastWeekday = _recentWeekdays[0]（既存との整合）
// 商談報告2件目: 2営業日前 / 3件目: 3営業日前
export const _oarDate2 =
  _recentWeekdays[2] ?? _recentWeekdays[1] ?? _lastWeekday; // 3営業日前
export const _oarDate3 =
  _recentWeekdays[3] ?? _recentWeekdays[2] ?? _lastWeekday; // 4営業日前

// 世帯員(Person) / Policy 共通タイムスタンプ
export const _now = new Date().toISOString();

// =====================================================
// ヘルパー: TimeBlock生成
// =====================================================
export function makeBlock(
  id: string,
  reportId: string,
  opts: Partial<TimeBlock>,
): TimeBlock {
  return {
    id,
    reportId,
    type: "visit",
    startTime: "09:00",
    endTime: "10:00",
    title: "",
    memo: "",
    isPlanned: true,
    isActual: true,
    attachments: [],
    ...opts,
  };
}

export function makeTodo(
  id: string,
  reportId: string,
  text: string,
  completed = false,
  dueDate?: string,
  priority: "high" | "medium" | "low" = "medium",
): Todo {
  return {
    id,
    reportId,
    text,
    completed,
    status: completed ? "done" : "todo",
    rolledOver: false,
    priority,
    dueDate,
  };
}

export function makeComment(
  id: string,
  reportId: string,
  userId: string,
  text: string,
  createdAt: string,
): Comment {
  return { id, reportId, userId, text, createdAt };
}

export const makeReport = (
  id: string,
  userId: string,
  date: string,
  status: "planning" | "in_progress" | "submitted" | "confirmed",
  blocks: TimeBlock[],
  todos: Todo[],
  comments: Comment[],
): DailyReport => ({
  id,
  userId,
  date,
  status,
  mainTheme: "顧客対応と案件推進",
  monthlyTheme: "6月目標: 新規3件獲得",
  dailyTheme: "今日の重点: アポ確認と見積提出",
  blocks,
  todos,
  customerVisits: [],
  gratitude: ["チームサポートに感謝", "顧客の信頼に感謝"],
  morningMood: "partly_cloudy",
  eveningMood: "sunny",
  managerSignal: "ok",
  selfComment: "",
  comments,
  attachments: [],
  submittedAt:
    status === "submitted" || status === "confirmed"
      ? `${date}T18:30:00`
      : undefined,
  confirmedAt: status === "confirmed" ? `${date}T19:30:00` : undefined,
  confirmedBy: status === "confirmed" ? "u4" : undefined,
  createdAt: `${date}T08:00:00`,
  updatedAt: `${date}T18:30:00`,
});
