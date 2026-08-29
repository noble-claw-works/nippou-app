// =====================================================
// Comment + ManagerComment + Compliment slice
// =====================================================
import type { StateCreator } from "zustand";
import type { AppState, Comment } from "../_internal/types";
import { uid } from "../_internal/constants";

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
> = (set) => ({
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
  },

  deleteCompliment: (complimentId: string) => {
    set((s) => ({
      compliments: s.compliments.filter((c) => c.id !== complimentId),
    }));
  },
});
