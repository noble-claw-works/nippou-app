// =====================================================
// system.ts — システム型 (通知 / 監査ログ)
// =====================================================

export interface Notification {
  id: string;
  userId: string;
  type: "comment" | "sent_back" | "confirmed" | "reminder" | "other";
  title: string;
  body: string;
  isRead: boolean;
  relatedReportId?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  ip: string;
  userAgent: string;
  result: "success" | "failure";
  diff?: Record<string, { before: unknown; after: unknown }>;
  createdAt: string;
}
