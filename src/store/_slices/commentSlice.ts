// =====================================================
// Comment + ManagerComment + Compliment slice
// =====================================================
import type { StateCreator } from "zustand";
import type { AppState, Comment } from "../_internal/types";
import { uid } from "../_internal/constants";

import { reportOwnerIdByDayKey } from "./notificationGen";

export const createCommentSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "addComment"
    | "updateComment"
    | "deleteComment"
    | "addManagerComment"
    | "replyToManagerComment"
    | "deleteManagerComment"
    | "addCompliment"
    | "deleteCompliment"
  >
> = (set, get) => ({
  addComment: (reportId, userId, text) => {
    const comment: Comment = {
      id: uid(),
      reportId,
      userId,
      text,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      reports: s.reports.map((r) =>
        r.id === reportId
          ? {
              ...r,
              comments: [...r.comments, comment],
              updatedAt: new Date().toISOString(),
            }
          : r,
      ),
    }));
  },

  updateComment: (reportId, commentId, text) => {
    set((s) => ({
      reports: s.reports.map((r) =>
        r.id === reportId
          ? {
              ...r,
              comments: r.comments.map((c) =>
                c.id === commentId
                  ? { ...c, text, updatedAt: new Date().toISOString() }
                  : c,
              ),
            }
          : r,
      ),
    }));
  },

  deleteComment: (reportId, commentId) => {
    set((s) => ({
      reports: s.reports.map((r) =>
        r.id === reportId
          ? { ...r, comments: r.comments.filter((c) => c.id !== commentId) }
          : r,
      ),
    }));
  },

  addManagerComment: (
    dayKey: string,
    authorUserId: string,
    body: string,
    authorRole?: "manager" | "executive" | "general",
  ) => {
    set((s) => ({
      managerComments: [
        ...s.managerComments,
        {
          id: uid(),
          dayKey,
          authorUserId,
          authorRole,
          body,
          createdAt: new Date().toISOString(),
          replies: [],
        },
      ],
    }));
    // G1: 日報オーナーへ通知
    const s = get();
    const ownerId = reportOwnerIdByDayKey(s.reports, dayKey);
    if (ownerId && ownerId !== authorUserId) {
      const author = s.users.find((u) => u.id === authorUserId);
      const authorName = author?.name ?? authorUserId;
      const relatedReport = s.reports.find(
        (r) => r.date === dayKey && r.userId === ownerId,
      );
      s.addNotification({
        userId: ownerId,
        type: "comment",
        title: `${authorName}さんからコメント`,
        body: body.slice(0, 60),
        relatedReportId: relatedReport?.id,
      });
    }
  },

  replyToManagerComment: (
    commentId: string,
    userId: string,
    choice: "yes" | "no",
  ) => {
    set((s) => ({
      managerComments: s.managerComments.map((c) =>
        c.id === commentId
          ? {
              ...c,
              replies: [
                ...c.replies,
                { userId, choice, repliedAt: new Date().toISOString() },
              ],
            }
          : c,
      ),
    }));
  },

  deleteManagerComment: (commentId: string) => {
    set((s) => ({
      managerComments: s.managerComments.filter((c) => c.id !== commentId),
    }));
  },

  addCompliment: (
    dayKey: string,
    customerId: string | undefined,
    customerName: string | undefined,
    type: "praise" | "request",
    body: string,
  ) => {
    set((s) => ({
      compliments: [
        ...s.compliments,
        {
          id: uid(),
          dayKey,
          customerId,
          customerName,
          type,
          body,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    // G1: praise → 担当営業(=customerId owner)へ通知。request → currentUser宛
    const s = get();
    const targetUserId =
      type === "praise"
        ? (reportOwnerIdByDayKey(s.reports, dayKey) ?? undefined)
        : s.currentUserId;
    if (targetUserId) {
      s.addNotification({
        userId: targetUserId,
        type: "other",
        title: type === "praise" ? "称賛が届きました" : "依頼が届きました",
        body: body.slice(0, 60),
      });
    }
  },

  deleteCompliment: (complimentId: string) => {
    set((s) => ({
      compliments: s.compliments.filter((c) => c.id !== complimentId),
    }));
  },
});
