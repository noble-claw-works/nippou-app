// =====================================================
// notificationGen.ts — addNotification action + 宛先ヘルパ
// AppState の notification 配列に append する薄い生成ロジック。
// commentSlice / reportSlice から呼ばれる。
// =====================================================
import type { StateCreator } from "zustand";
import type { AppState, Notification } from "../_internal/types";
import { uid } from "../_internal/constants";

// =====================================================
// 宛先解決ヘルパ（純関数 — state を引数で受取）
// =====================================================

/**
 * 日報(reportId)のオーナー userId を返す。
 * 見つからなければ undefined。
 */
export function reportOwnerIdOf(
  reports: AppState["reports"],
  reportId: string,
): string | undefined {
  return reports.find((r) => r.id === reportId)?.userId;
}

/**
 * dayKey (YYYY-MM-DD) に紐づく日報オーナーを返す。
 * 複数日報が存在する場合は最初のものを使う。
 */
export function reportOwnerIdByDayKey(
  reports: AppState["reports"],
  dayKey: string,
): string | undefined {
  return reports.find((r) => r.date === dayKey)?.userId;
}

/**
 * userId の上長 (team.managerIds) を返す。
 * 複数チームに属する場合は全チームの managerIds を合算してユニーク化。
 */
export function managerIdsFor(
  teams: AppState["teams"],
  users: AppState["users"],
  userId: string,
): string[] {
  const user = users.find((u) => u.id === userId);
  if (!user) return [];
  const managerSet = new Set<string>();
  user.teamIds.forEach((tid) => {
    const team = teams.find((t) => t.id === tid);
    team?.managerIds.forEach((mid) => managerSet.add(mid));
  });
  return [...managerSet];
}

// =====================================================
// addNotification action
// =====================================================

export interface AddNotificationInput {
  userId: string; // 宛先ユーザー
  type: Notification["type"];
  title: string;
  body: string;
  relatedReportId?: string;
}

// Pick に addNotification を追加する slice
export const createNotificationGenSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<AppState, "addNotification">
> = (set) => ({
  addNotification: (input: AddNotificationInput) => {
    const n: Notification = {
      id: uid(),
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      isRead: false,
      relatedReportId: input.relatedReportId,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ notifications: [...s.notifications, n] }));
  },
});
