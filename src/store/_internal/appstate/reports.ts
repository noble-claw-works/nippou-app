// =====================================================
// appstate/reports.ts — DailyReport & related slice of AppState
// =====================================================
import type {
  DailyReport,
  TimeBlock,
  Todo,
  ManagerComment,
  Compliment,
  Template,
  QuickChip,
  TrackingSession,
  BlockType,
  Notification,
  AuditLog,
} from "../../../types";
import type { Toast } from "../exportedTypes";

export interface AppStateReportsSlice {
  // Data
  reports: DailyReport[];
  templates: Template[];
  quickChips: QuickChip[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  trackingSession: TrackingSession | null;
  managerComments: ManagerComment[];
  compliments: Compliment[];

  // UI
  toasts: Toast[];

  // Actions: Toast
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;

  // Actions: Report
  getReport: (userId: string, date: string) => DailyReport | undefined;
  getTodayReport: () => DailyReport | undefined;
  createReport: (userId: string, date: string) => DailyReport;
  updateReport: (reportId: string, updates: Partial<DailyReport>) => void;
  confirmPlanning: (reportId: string) => void;
  submitReport: (reportId: string) => void;
  withdrawReport: (reportId: string, by?: "manager" | "self") => void;
  confirmReport: (reportId: string) => void;
  bulkConfirmReports: (reportIds: string[]) => number;

  // Actions: TimeBlock
  addBlock: (reportId: string, block: Omit<TimeBlock, "id">) => TimeBlock;
  updateBlock: (
    reportId: string,
    blockId: string,
    updates: Partial<TimeBlock>,
  ) => void;
  deleteBlock: (reportId: string, blockId: string) => void;

  // Actions: Todo
  addTodo: (
    reportId: string,
    text: string,
    priority?: "high" | "medium" | "low",
  ) => void;
  toggleTodo: (reportId: string, todoId: string) => void;
  updateTodo: (
    reportId: string,
    todoId: string,
    updates: Partial<Todo>,
  ) => void;
  deleteTodo: (reportId: string, todoId: string) => void;

  // Actions: Comment
  addComment: (reportId: string, userId: string, text: string) => void;
  updateComment: (reportId: string, commentId: string, text: string) => void;
  deleteComment: (reportId: string, commentId: string) => void;

  // Actions: Template
  addTemplate: (
    template: Omit<Template, "id" | "usageCount" | "createdAt" | "updatedAt">,
  ) => Template;
  updateTemplate: (templateId: string, updates: Partial<Template>) => void;
  publishTemplate: (templateId: string) => void;
  deactivateTemplate: (templateId: string) => void;

  // Actions: QuickChip
  addQuickChip: (chip: Omit<QuickChip, "id">) => void;
  updateQuickChip: (chipId: string, updates: Partial<QuickChip>) => void;
  deleteQuickChip: (chipId: string) => void;

  // Actions: ManagerComment
  addManagerComment: (
    dayKey: string,
    authorUserId: string,
    body: string,
    authorRole?: "manager" | "executive" | "general",
  ) => void;
  replyToManagerComment: (
    commentId: string,
    userId: string,
    choice: "yes" | "no",
  ) => void;
  deleteManagerComment: (commentId: string) => void;

  // Actions: Compliment
  addCompliment: (
    dayKey: string,
    customerId: string | undefined,
    customerName: string | undefined,
    type: "praise" | "request",
    body: string,
  ) => void;
  deleteCompliment: (complimentId: string) => void;

  // Actions: Notification
  addNotification: (input: {
    userId: string;
    type: Notification["type"];
    title: string;
    body: string;
    relatedReportId?: string;
  }) => void;
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (notifId: string) => void;

  // Actions: Tracking
  startTracking: (
    blockType: BlockType,
    customerId?: string,
    memo?: string,
  ) => void;
  stopTracking: () => TimeBlock | null;
  discardTracking: () => void;
}
