// =====================================================
// report.ts — 日報 / タイムブロック / TODO 型
// =====================================================

import type { BlockType, ReportStatus, MoodType, ManagerSignal } from "./core";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface TimeBlock {
  id: string;
  reportId: string;
  type: BlockType;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  customerId?: string;
  opportunityId?: string; // 紐付け案件 (Phase 2)
  title: string;
  memo: string;
  isPlanned: boolean;
  isActual: boolean;
  attachments: Attachment[];
  /** 実績化時にスナップショット元の予定ブロック id を保持。予定ブロックは未設定 */
  plannedBlockId?: string;
  // 訪問結果（visit ブロックのみ使用）
  collected?: boolean; // 集金済み
  nextAppointment?: string; // 次回AP (YYYY-MM-DD)
  proposal?: string; // 提案内容
  result?: string; // 対応結果メモ
  /** ★NEW この活動ブロックが OpportunityActivityReport から生成された場合その id（ADR-B4 v2） */
  sourceReportId?: string;
}

export interface Todo {
  id: string;
  reportId: string;
  text: string;
  completed: boolean;
  status: "todo" | "doing" | "done";
  rolledOver: boolean;
  dueDate?: string;
  priority: "high" | "medium" | "low";
  /** 付帯情報判定用: 当該 TODO が紐づく顧客 ID */
  customerId?: string;
  opportunityId?: string; // 紐付け案件 (Phase 2)
}

export interface CustomerVisit {
  id: string;
  reportId: string;
  customerId: string;
  blockId?: string;
  memo: string;
  collection?: string;
  nextAppointment?: string;
  proposal?: string;
}

export interface Comment {
  id: string;
  reportId: string;
  userId: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ManagerCommentReply {
  userId: string;
  choice: "yes" | "no";
  repliedAt: string;
}

export interface ManagerComment {
  id: string;
  dayKey: string; // YYYY-MM-DD (日報特定用)
  authorUserId: string;
  /** 表示用ロール — 上長コメント: 'manager'|'executive', 部下コメント: 'general' (optional for backward compat) */
  authorRole?: "manager" | "executive" | "general";
  body: string;
  createdAt: string;
  replies: ManagerCommentReply[];
}

export interface Compliment {
  id: string;
  dayKey: string; // YYYY-MM-DD
  customerId?: string;
  customerName?: string;
  opportunityId?: string; // 紐付け案件 (Phase 2)
  type: "praise" | "request";
  body: string;
  createdAt: string;
}

export interface DailyReport {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  status: ReportStatus;
  mainTheme: string;
  monthlyTheme: string;
  dailyTheme: string;
  blocks: TimeBlock[];
  todos: Todo[];
  customerVisits: CustomerVisit[];
  gratitude: string[];
  morningMood: MoodType | null;
  eveningMood: MoodType | null;
  managerSignal: ManagerSignal;
  selfComment: string;
  comments: Comment[];
  attachments: Attachment[];
  submittedAt?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  createdAt: string;
  updatedAt: string;
}
