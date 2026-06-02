// =====================================================
// 型定義 - 日報管理システム
// =====================================================

export type Role = 'general' | 'manager' | 'executive' | 'admin';
export type ReportStatus = 'draft' | 'submitted' | 'confirmed' | 'sent_back';
export type BlockType = 'visit' | 'office' | 'phone' | 'travel' | 'break' | 'meeting' | 'lunch';
export type CustomerType = 'individual' | 'corporate' | 'prospect';
export type CustomerStatus = 'active' | 'inactive';
export type UserStatus = 'active' | 'inactive' | 'invited';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  teamIds: string[];
  status: UserStatus;
  lastLogin?: string;
  avatarInitials: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  managerIds: string[];
  memberIds: string[];
}

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  area: string;
  primaryUserId: string;
  tags: string[];
  memo: string;
  status: CustomerStatus;
  lastContactDate?: string;
  nextAppointment?: string;
  isFavorite?: boolean;
}

export interface TimeBlock {
  id: string;
  reportId: string;
  type: BlockType;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  customerId?: string;
  title: string;
  memo: string;
  isPlanned: boolean;
  isActual: boolean;
  attachments: Attachment[];
  /** 実績化時にスナップショット元の予定ブロック id を保持。予定ブロックは未設定 */
  plannedBlockId?: string;
}

export interface Todo {
  id: string;
  reportId: string;
  text: string;
  completed: boolean;
  rolledOver: boolean;
  dueDate?: string;
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

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export type MoodType = 'sunny' | 'partly_cloudy' | 'cloudy' | 'rainy';
export type ManagerSignal = 'consult' | 'listen' | 'ok' | null;

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
  sentBackAt?: string;
  sentBackReason?: string;
  confirmedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  version: number;
  status: 'draft' | 'published';
  isDefault: boolean;
  isActive: boolean;
  blocks: TemplateBlock[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateBlock {
  id: string;
  type: 'single_line' | 'multi_line' | 'timeline' | 'todo' | 'customer' | 'radio' | 'yn' | 'number' | 'attachment';
  label: string;
  required: boolean;
  order: number;
  config?: Record<string, unknown>;
}

export interface QuickChip {
  id: string;
  userId: string;
  label: string;
  emoji: string;
  blockType: BlockType;
  order: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'comment' | 'sent_back' | 'confirmed' | 'reminder' | 'other';
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
  result: 'success' | 'failure';
  diff?: Record<string, { before: unknown; after: unknown }>;
  createdAt: string;
}

export interface TrackingSession {
  id: string;
  userId: string;
  blockType: BlockType;
  customerId?: string;
  memo: string;
  startedAt: string;
  pausedAt?: string;
  endedAt?: string;
  status: 'running' | 'paused' | 'ended' | 'discarded';
}
