// =====================================================
// Zustand Store - 日報管理システム
// =====================================================
import { create } from 'zustand';
import type {
  User, Team, Customer, DailyReport, Template, QuickChip,
  Notification, AuditLog, TimeBlock, Todo, Comment,
  Role, TrackingSession, BlockType, ManagerComment, Compliment
} from '../types';
import {
  USERS, TEAMS, CUSTOMERS, REPORTS, TEMPLATES,
  DEFAULT_QUICK_CHIPS, NOTIFICATIONS, AUDIT_LOGS
} from '../data/seed';
import { format } from 'date-fns';

// =====================================================
// トースト
// =====================================================
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  undoFn?: () => void;
}

// =====================================================
// メールアドレス変更申請
// =====================================================
export interface EmailChangeRequest {
  id: string;
  userId: string;
  newEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  processedAt?: string;
}

interface AppState {
  // Auth
  currentRole: Role;
  currentUserId: string;

  // Data
  users: User[];
  teams: Team[];
  customers: Customer[];
  reports: DailyReport[];
  templates: Template[];
  quickChips: QuickChip[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  trackingSession: TrackingSession | null;
  emailChangeRequests: EmailChangeRequest[];
  managerComments: ManagerComment[];
  compliments: Compliment[];

  // UI
  toasts: Toast[];

  // Actions: Role
  setRole: (role: Role) => void;

  // Actions: Toast
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // Actions: Report
  getReport: (userId: string, date: string) => DailyReport | undefined;
  getTodayReport: () => DailyReport | undefined;
  createReport: (userId: string, date: string) => DailyReport;
  updateReport: (reportId: string, updates: Partial<DailyReport>) => void;
  confirmPlanning: (reportId: string) => void;   // planning → in_progress
  submitReport: (reportId: string) => void;       // in_progress → submitted
  withdrawReport: (reportId: string) => void;     // submitted → in_progress（本人取り下げ＋上長差し戻し共通）
  confirmReport: (reportId: string) => void;      // submitted → confirmed（上長承認）

  // Actions: TimeBlock
  addBlock: (reportId: string, block: Omit<TimeBlock, 'id'>) => TimeBlock;
  updateBlock: (reportId: string, blockId: string, updates: Partial<TimeBlock>) => void;
  deleteBlock: (reportId: string, blockId: string) => void;

  // Actions: Todo
  addTodo: (reportId: string, text: string, priority?: 'high' | 'medium' | 'low') => void;
  toggleTodo: (reportId: string, todoId: string) => void;
  updateTodo: (reportId: string, todoId: string, updates: Partial<Todo>) => void;
  deleteTodo: (reportId: string, todoId: string) => void;

  // Actions: Comment
  addComment: (reportId: string, userId: string, text: string) => void;
  updateComment: (reportId: string, commentId: string, text: string) => void;
  deleteComment: (reportId: string, commentId: string) => void;

  // Actions: Customer
  addCustomer: (customer: Omit<Customer, 'id'>) => Customer;
  updateCustomer: (customerId: string, updates: Partial<Customer>) => void;
  deactivateCustomer: (customerId: string, reason?: string) => void;

  // Actions: User
  addUser: (user: Omit<User, 'id'>) => User;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deactivateUser: (userId: string) => void;

  // Actions: Team
  addTeam: (team: Omit<Team, 'id'>) => Team;
  updateTeam: (teamId: string, updates: Partial<Team>) => void;
  deleteTeam: (teamId: string) => void;

  // Actions: Template
  addTemplate: (template: Omit<Template, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>) => Template;
  updateTemplate: (templateId: string, updates: Partial<Template>) => void;
  publishTemplate: (templateId: string) => void;
  deactivateTemplate: (templateId: string) => void;

  // Actions: QuickChip
  addQuickChip: (chip: Omit<QuickChip, 'id'>) => void;
  updateQuickChip: (chipId: string, updates: Partial<QuickChip>) => void;
  deleteQuickChip: (chipId: string) => void;

  // Actions: ManagerComment
  addManagerComment: (dayKey: string, authorUserId: string, body: string) => void;
  replyToManagerComment: (commentId: string, userId: string, choice: 'yes' | 'no') => void;
  deleteManagerComment: (commentId: string) => void;

  // Actions: Compliment
  addCompliment: (dayKey: string, customerId: string | undefined, customerName: string | undefined, type: 'praise' | 'request', body: string) => void;
  deleteCompliment: (complimentId: string) => void;

  // Actions: Notification
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (notifId: string) => void;

  // Actions: Tracking
  startTracking: (blockType: BlockType, customerId?: string, memo?: string) => void;
  stopTracking: () => TimeBlock | null;
  discardTracking: () => void;

  // Actions: Email Change Request
  requestEmailChange: (userId: string, newEmail: string) => void;
  getEmailChangeRequest: (userId: string) => EmailChangeRequest | undefined;

  // Reset
  resetAll: () => void;
}

let idCounter = 10000;
const uid = () => `id_${++idCounter}_${Date.now()}`;

export const useAppStore = create<AppState>((set, get) => ({
  currentRole: 'general',
  currentUserId: 'u1',
  users: USERS,
  teams: TEAMS,
  customers: CUSTOMERS,
  reports: REPORTS,
  templates: TEMPLATES,
  quickChips: DEFAULT_QUICK_CHIPS,
  notifications: NOTIFICATIONS,
  auditLogs: AUDIT_LOGS,
  trackingSession: null,
  emailChangeRequests: [],
  managerComments: [],
  compliments: [],
  toasts: [],

  setRole: (role) => {
    const roleUserMap: Record<Role, string> = {
      general: 'u1',
      manager: 'u4',
      executive: 'u5',
      admin: 'u6',
    };
    set({ currentRole: role, currentUserId: roleUserMap[role] });
  },

  addToast: (toast) => {
    const id = uid();
    set(s => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => get().removeToast(id), toast.type === 'error' ? 4000 : toast.type === 'warning' ? 3000 : 2000);
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  getReport: (userId, date) => get().reports.find(r => r.userId === userId && r.date === date),
  getTodayReport: () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return get().reports.find(r => r.userId === get().currentUserId && r.date === today);
  },

  createReport: (userId, date) => {
    const report: DailyReport = {
      id: uid(), userId, date, status: 'planning',
      mainTheme: '', monthlyTheme: '', dailyTheme: '',
      blocks: [], todos: [], customerVisits: [],
      gratitude: ['', '', ''], morningMood: null, eveningMood: null,
      managerSignal: null, selfComment: '', comments: [], attachments: [],
      submitted: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    set(s => ({ reports: [...s.reports, report] }));
    return report;
  },

  updateReport: (reportId, updates) => {
    set(s => ({
      reports: s.reports.map(r => r.id === reportId
        ? { ...r, ...updates, updatedAt: new Date().toISOString() }
        : r
      )
    }));
  },

  confirmPlanning: (reportId) => {
    set(s => ({
      reports: s.reports.map(r => r.id === reportId && r.status === 'planning'
        ? { ...r, status: 'in_progress', updatedAt: new Date().toISOString() }
        : r
      )
    }));
  },

  submitReport: (reportId) => {
    const now = new Date().toISOString();
    set(s => ({
      reports: s.reports.map(r => r.id === reportId && r.status === 'in_progress'
        ? { ...r, status: 'submitted', submittedAt: now, updatedAt: now }
        : r
      )
    }));
  },

  withdrawReport: (reportId) => {
    // 本人取り下げ・上長差し戻し共通: submitted → in_progress
    set(s => ({
      reports: s.reports.map(r => r.id === reportId && r.status === 'submitted'
        ? { ...r, status: 'in_progress', submittedAt: undefined, updatedAt: new Date().toISOString() }
        : r
      )
    }));
  },

  confirmReport: (reportId) => {
    const now = new Date().toISOString();
    set(s => ({
      reports: s.reports.map(r => r.id === reportId && r.status === 'submitted'
        ? { ...r, status: 'confirmed', confirmedAt: now, confirmedBy: s.currentUserId, updatedAt: now }
        : r
      )
    }));
  },

  addBlock: (reportId, block) => {
    const newBlock: TimeBlock = { ...block, id: uid() };
    set(s => ({
      reports: s.reports.map(r => r.id === reportId
        ? { ...r, blocks: [...r.blocks, newBlock], updatedAt: new Date().toISOString() }
        : r
      )
    }));
    return newBlock;
  },

  updateBlock: (reportId, blockId, updates) => {
    set(s => ({
      reports: s.reports.map(r => r.id === reportId
        ? {
            ...r,
            blocks: r.blocks.map(b => b.id === blockId ? { ...b, ...updates } : b),
            updatedAt: new Date().toISOString()
          }
        : r
      )
    }));
  },

  deleteBlock: (reportId, blockId) => {
    set(s => ({
      reports: s.reports.map(r => r.id === reportId
        ? { ...r, blocks: r.blocks.filter(b => b.id !== blockId), updatedAt: new Date().toISOString() }
        : r
      )
    }));
  },

  addTodo: (reportId, text, priority = 'medium') => {
    const todo: Todo = { id: uid(), reportId, text, completed: false, status: 'todo', rolledOver: false, priority };
    set(s => ({
      reports: s.reports.map(r => r.id === reportId
        ? { ...r, todos: [...r.todos, todo], updatedAt: new Date().toISOString() }
        : r
      )
    }));
  },

  toggleTodo: (reportId, todoId) => {
    set(s => ({
      reports: s.reports.map(r => r.id === reportId
        ? {
            ...r,
            todos: r.todos.map(t => t.id === todoId ? { ...t, completed: !t.completed, status: !t.completed ? 'done' : 'todo' } : t),
            updatedAt: new Date().toISOString()
          }
        : r
      )
    }));
  },
  updateTodo: (reportId, todoId, updates) => {
    set(s => ({
      reports: s.reports.map(r => r.id === reportId
        ? {
            ...r,
            todos: r.todos.map(t => t.id === todoId ? { ...t, ...updates } : t),
            updatedAt: new Date().toISOString()
          }
        : r
      )
    }));
  },

  deleteTodo: (reportId, todoId) => {
    set(s => ({
      reports: s.reports.map(r => r.id === reportId
        ? { ...r, todos: r.todos.filter(t => t.id !== todoId), updatedAt: new Date().toISOString() }
        : r
      )
    }));
  },

  addComment: (reportId, userId, text) => {
    const comment: Comment = { id: uid(), reportId, userId, text, createdAt: new Date().toISOString() };
    set(s => ({
      reports: s.reports.map(r => r.id === reportId
        ? { ...r, comments: [...r.comments, comment], updatedAt: new Date().toISOString() }
        : r
      )
    }));
  },

  updateComment: (reportId, commentId, text) => {
    set(s => ({
      reports: s.reports.map(r => r.id === reportId
        ? {
            ...r,
            comments: r.comments.map(c => c.id === commentId
              ? { ...c, text, updatedAt: new Date().toISOString() }
              : c
            )
          }
        : r
      )
    }));
  },

  deleteComment: (reportId, commentId) => {
    set(s => ({
      reports: s.reports.map(r => r.id === reportId
        ? { ...r, comments: r.comments.filter(c => c.id !== commentId) }
        : r
      )
    }));
  },

  addManagerComment: (dayKey: string, authorUserId: string, body: string) => {
    set(s => ({
      managerComments: [...s.managerComments, {
        id: uid(), dayKey, authorUserId, body, createdAt: new Date().toISOString(), replies: [],
      }],
    }));
  },
  replyToManagerComment: (commentId: string, userId: string, choice: 'yes' | 'no') => {
    set(s => ({
      managerComments: s.managerComments.map(c => c.id === commentId
        ? { ...c, replies: [...c.replies, { userId, choice, repliedAt: new Date().toISOString() }] }
        : c
      ),
    }));
  },
  deleteManagerComment: (commentId: string) => {
    set(s => ({
      managerComments: s.managerComments.filter(c => c.id !== commentId),
    }));
  },

  addCompliment: (dayKey: string, customerId: string | undefined, customerName: string | undefined, type: 'praise' | 'request', body: string) => {
    set(s => ({
      compliments: [...s.compliments, {
        id: uid(), dayKey, customerId, customerName, type, body, createdAt: new Date().toISOString(),
      }],
    }));
  },
  deleteCompliment: (complimentId: string) => {
    set(s => ({
      compliments: s.compliments.filter(c => c.id !== complimentId),
    }));
  },

  addCustomer: (customer) => {
    const newCustomer: Customer = { ...customer, id: uid() };
    set(s => ({ customers: [...s.customers, newCustomer] }));
    return newCustomer;
  },

  updateCustomer: (customerId, updates) => {
    set(s => ({ customers: s.customers.map(c => c.id === customerId ? { ...c, ...updates } : c) }));
  },

  deactivateCustomer: (customerId) => {
    set(s => ({ customers: s.customers.map(c => c.id === customerId ? { ...c, status: 'inactive' } : c) }));
  },

  addUser: (user) => {
    const newUser: User = { ...user, id: uid() };
    set(s => ({ users: [...s.users, newUser] }));
    return newUser;
  },

  updateUser: (userId, updates) => {
    set(s => ({ users: s.users.map(u => u.id === userId ? { ...u, ...updates } : u) }));
  },

  deactivateUser: (userId) => {
    set(s => ({ users: s.users.map(u => u.id === userId ? { ...u, status: 'inactive' } : u) }));
  },

  addTeam: (team) => {
    const newTeam: Team = { ...team, id: uid() };
    set(s => ({ teams: [...s.teams, newTeam] }));
    return newTeam;
  },

  updateTeam: (teamId, updates) => {
    set(s => ({ teams: s.teams.map(t => t.id === teamId ? { ...t, ...updates } : t) }));
  },

  deleteTeam: (teamId) => {
    set(s => ({ teams: s.teams.filter(t => t.id !== teamId) }));
  },

  addTemplate: (template) => {
    const now = new Date().toISOString();
    const newTemplate: Template = { ...template, id: uid(), usageCount: 0, createdAt: now, updatedAt: now };
    set(s => ({ templates: [...s.templates, newTemplate] }));
    return newTemplate;
  },

  updateTemplate: (templateId, updates) => {
    set(s => ({
      templates: s.templates.map(t => t.id === templateId
        ? { ...t, ...updates, updatedAt: new Date().toISOString() }
        : t
      )
    }));
  },

  publishTemplate: (templateId) => {
    set(s => ({
      templates: s.templates.map(t => t.id === templateId
        ? { ...t, status: 'published', isActive: true, updatedAt: new Date().toISOString() }
        : t
      )
    }));
  },

  deactivateTemplate: (templateId) => {
    set(s => ({
      templates: s.templates.map(t => t.id === templateId
        ? { ...t, isActive: false, updatedAt: new Date().toISOString() }
        : t
      )
    }));
  },

  addQuickChip: (chip) => {
    const newChip: QuickChip = { ...chip, id: uid() };
    set(s => ({ quickChips: [...s.quickChips, newChip] }));
  },

  updateQuickChip: (chipId, updates) => {
    set(s => ({ quickChips: s.quickChips.map(c => c.id === chipId ? { ...c, ...updates } : c) }));
  },

  deleteQuickChip: (chipId) => {
    set(s => ({ quickChips: s.quickChips.filter(c => c.id !== chipId) }));
  },

  markNotificationRead: (notifId) => {
    set(s => ({ notifications: s.notifications.map(n => n.id === notifId ? { ...n, isRead: true } : n) }));
  },

  markAllNotificationsRead: () => {
    set(s => ({ notifications: s.notifications.map(n => ({ ...n, isRead: true })) }));
  },

  deleteNotification: (notifId) => {
    set(s => ({ notifications: s.notifications.filter(n => n.id !== notifId) }));
  },

  startTracking: (blockType, customerId, memo = '') => {
    const session: TrackingSession = {
      id: uid(), userId: get().currentUserId, blockType, customerId, memo,
      startedAt: new Date().toISOString(), status: 'running',
    };
    set({ trackingSession: session });
  },

  stopTracking: () => {
    const session = get().trackingSession;
    if (!session) return null;
    const now = new Date();
    const start = new Date(session.startedAt);
    const startHH = String(start.getHours()).padStart(2, '0');
    const startMM = String(Math.floor(start.getMinutes() / 15) * 15).padStart(2, '0');
    const endHH = String(now.getHours()).padStart(2, '0');
    const endMM = String(Math.floor(now.getMinutes() / 15) * 15).padStart(2, '0');
    set({ trackingSession: null });
    return {
      id: uid(), reportId: '',
      type: session.blockType, customerId: session.customerId,
      startTime: `${startHH}:${startMM}`, endTime: `${endHH}:${endMM}`,
      title: session.memo || '', memo: '',
      isPlanned: false, isActual: true, attachments: [],
    };
  },

  discardTracking: () => set({ trackingSession: null }),

  requestEmailChange: (userId, newEmail) => {
    const req: EmailChangeRequest = {
      id: uid(),
      userId,
      newEmail,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };
    set(s => ({
      emailChangeRequests: [
        ...s.emailChangeRequests.filter(r => r.userId !== userId || r.status !== 'pending'),
        req
      ]
    }));
  },

  getEmailChangeRequest: (userId) => {
    return get().emailChangeRequests.find(r => r.userId === userId && r.status === 'pending');
  },

  resetAll: () => set({
    currentRole: 'general', currentUserId: 'u1',
    users: USERS, teams: TEAMS, customers: CUSTOMERS, reports: REPORTS,
    templates: TEMPLATES, quickChips: DEFAULT_QUICK_CHIPS,
    notifications: NOTIFICATIONS, auditLogs: AUDIT_LOGS,
    trackingSession: null, emailChangeRequests: [], managerComments: [], compliments: [], toasts: [],
  }),
}));
