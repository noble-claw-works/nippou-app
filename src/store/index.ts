// =====================================================
// Zustand Store - 305-hrl-nippou-app
// =====================================================
import { create } from 'zustand';
import type {
  User, Team, Customer, DailyReport, Template, QuickChip,
  Notification, AuditLog, TimeBlock, Todo, Comment,
  Role, TrackingSession, BlockType, ManagerComment, Compliment,
  Person, Opportunity, OpportunityStage, LostReason,
  Policy, PolicyStatusHistory, Coverage, PolicyStatus, CoverageType,
  ProductCategory,
} from '../types';
import {
  USERS, TEAMS, CUSTOMERS, REPORTS, TEMPLATES,
  DEFAULT_QUICK_CHIPS, NOTIFICATIONS, AUDIT_LOGS, PERSONS, OPPORTUNITIES, POLICIES, POLICY_STATUS_HISTORY,
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

// 認証セッション関連は src/store/auth.ts に分離
import {
  AUTH_SESSION_TTL_MS,
  DEFAULT_DEMO_PASSWORD,
  loadAuthSession,
  persistAuthSession,
  loadRoleSwitch,
  persistRoleSwitch,
  type AuthSession,
} from './auth';
import {
  loadDeletedCustomerIds,
  persistDeletedCustomerId,
} from './deletedCustomers';
import { isTodoReadOnly } from '../utils/todoReadOnly';
import type { ReportStatus as TodoReportStatus } from '../utils/todoReadOnly';
import { hasCustomerAttachment } from '../utils/customerAttachment';

// 再エクスポート (既存の import パス互換用)
export { AUTH_STORAGE_KEY, AUTH_SESSION_TTL_MS, DEFAULT_DEMO_PASSWORD } from './auth';
export { ROLE_SWITCH_STORAGE_KEY, USER_SWITCH_STORAGE_KEY } from './auth';
export type { AuthSession } from './auth';

interface AppState {
  // Auth
  currentRole: Role;
  currentUserId: string;
  authSession: AuthSession | null;          // ログイン中のセッション。null なら未認証
  passwords: Record<string, string>;        // userId → password マップ。初期値は全員 'demo'

  // Data
  users: User[];
  teams: Team[];
  customers: Customer[];
  persons: Person[];
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

  // Actions: Auth
  login: (email: string, password: string) => { ok: true; user: User } | { ok: false; error: string };
  loginAsUser: (userId: string) => void;        // デモ/ロール切替用
  logout: () => void;
  isAuthenticated: () => boolean;
  touchSession: () => void;                     // 最終操作時刻を更新し expiresAt を延長
  changePassword: (userId: string, current: string, next: string) => { ok: true } | { ok: false; error: string };

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
  bulkConfirmReports: (reportIds: string[]) => number; // MGR-4: 一括確認 / 返り値 = 処理成功件数

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
  deleteCustomer: (customerId: string) => boolean;

  // Actions: Person (世帯員)
  addPerson: (householdId: string, partial: Omit<Person, 'id' | 'householdId' | 'createdAt' | 'updatedAt'>) => Person;
  updatePerson: (personId: string, patch: Partial<Person>) => void;
  deletePerson: (personId: string) => { ok: boolean; error?: string };
  getPersonsByHousehold: (householdId: string) => Person[];

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
  addManagerComment: (dayKey: string, authorUserId: string, body: string, authorRole?: 'manager' | 'executive' | 'general') => void;
  replyToManagerComment: (commentId: string, userId: string, choice: 'yes' | 'no') => void;
  deleteManagerComment: (commentId: string) => void;

  // Actions: Compliment
  addCompliment: (dayKey: string, customerId: string | undefined, customerName: string | undefined, type: 'praise' | 'request', body: string) => void;
  deleteCompliment: (complimentId: string) => void;

  // Data: Opportunity
  opportunities: Opportunity[];

  // Data: Policy
  policies: Policy[];
  policyStatusHistory: PolicyStatusHistory[];

  // Actions: Policy
  addPolicy: (partial: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>) => Policy;
  updatePolicy: (id: string, patch: Partial<Policy>) => void;
  deletePolicy: (id: string) => void;
  addCoverage: (policyId: string, partial: Omit<Coverage, 'id' | 'policyId'>) => Coverage;
  updateCoverage: (coverageId: string, patch: Partial<Coverage>) => void;
  deleteCoverage: (coverageId: string) => void;
  issuePoliciesFromOpportunity: (opportunityId: string, userId: string) => Policy[];
  activatePolicy: (policyId: string, policyNumber: string, startDate: string, userId: string) => void;
  changePolicyStatus: (id: string, newStatus: PolicyStatus, note?: string, userId?: string) => void;
  getPoliciesByHousehold: (householdId: string, options?: { activeOnly?: boolean }) => Policy[];
  getPoliciesByPerson: (personId: string, options?: { activeOnly?: boolean }) => Policy[];
  getCoverageMatrix: (householdId: string) => Array<{
    personId: string;
    coverageTypes: Set<CoverageType>;
    totalFaceByType: Record<string, number>;
  }>;

  // Actions: Opportunity
  addOpportunity: (partial: Omit<Opportunity, 'id' | 'stageHistory' | 'createdAt' | 'updatedAt' | 'totalMonthlyPremium'>) => Opportunity;
  updateOpportunity: (id: string, patch: Partial<Opportunity>) => void;
  deleteOpportunity: (id: string) => void;
  changeOpportunityStage: (id: string, newStage: OpportunityStage, note?: string, userId?: string) => void;
  getOpportunitiesByHousehold: (householdId: string, options?: { openOnly?: boolean }) => Opportunity[];
  getOpportunityById: (id: string) => Opportunity | undefined;

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

// ストア初期化時に、以前のセッションを localStorage から復元
const _initialAuthSession = loadAuthSession();
const _initialUser = _initialAuthSession
  ? USERS.find(u => u.id === _initialAuthSession.userId)
  : undefined;
// E-9: ロール切替永続化 — リロード後もロール選択を保持
const _initialRoleSwitch = loadRoleSwitch();

// E-8 修正: 削除済み顧客 ID を localStorage から復元し、seed から除外
const _deletedCustomerIds = loadDeletedCustomerIds();
const _initialCustomers = _deletedCustomerIds.size > 0
  ? CUSTOMERS.filter(c => !_deletedCustomerIds.has(c.id))
  : CUSTOMERS;

export const useAppStore = create<AppState>((set, get) => ({
  // E-9: ロール切替が永続化されていればそちら優先、なければ auth ユーザーのロール
  currentRole: _initialRoleSwitch?.role ?? _initialUser?.role ?? 'general',
  currentUserId: _initialRoleSwitch?.userId ?? _initialUser?.id ?? 'u1',
  authSession: _initialUser ? _initialAuthSession : null,
  passwords: Object.fromEntries(USERS.map(u => [u.id, DEFAULT_DEMO_PASSWORD])),
  users: USERS,
  teams: TEAMS,
  customers: _initialCustomers,
  persons: PERSONS,
  reports: REPORTS,
  templates: TEMPLATES,
  quickChips: DEFAULT_QUICK_CHIPS,
  notifications: NOTIFICATIONS,
  auditLogs: AUDIT_LOGS,
  trackingSession: null,
  emailChangeRequests: [],
  managerComments: [],
  compliments: [],
  opportunities: (() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem('nippou.opportunities.v1');
        if (raw) return JSON.parse(raw) as Opportunity[];
      } catch { /* ignore */ }
    }
    return OPPORTUNITIES;
  })(),
  policies: (() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem('nippou.policies.v1');
        if (raw) return JSON.parse(raw) as Policy[];
      } catch { /* ignore */ }
    }
    return POLICIES;
  })(),
  policyStatusHistory: (() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem('nippou.policyHistory.v1');
        if (raw) return JSON.parse(raw) as PolicyStatusHistory[];
      } catch { /* ignore */ }
    }
    return POLICY_STATUS_HISTORY;
  })(),
  toasts: [],

  setRole: (role) => {
    const roleUserMap: Record<Role, string> = {
      general: 'u1',
      manager: 'u4',
      executive: 'u5',
      admin: 'u6',
    };
    const userId = roleUserMap[role];
    persistRoleSwitch(role, userId);  // E-9: ロール切替を localStorage に永続化
    set({ currentRole: role, currentUserId: userId });
  },

  // ----------------------------------------------------
  // Auth
  // ----------------------------------------------------
  login: (email, password) => {
    const normalized = (email ?? '').trim().toLowerCase();
    const user = get().users.find(u => u.email.toLowerCase() === normalized);
    if (!user) {
      return { ok: false, error: 'メールアドレスまたはパスワードが正しくありません' };
    }
    if (user.status === 'inactive') {
      return { ok: false, error: 'このアカウントは無効化されています' };
    }
    const expected = get().passwords[user.id] ?? DEFAULT_DEMO_PASSWORD;
    if (password !== expected) {
      return { ok: false, error: 'メールアドレスまたはパスワードが正しくありません' };
    }
    get().loginAsUser(user.id);
    return { ok: true, user };
  },

  loginAsUser: (userId) => {
    const user = get().users.find(u => u.id === userId);
    if (!user) return;
    const now = new Date();
    const session: AuthSession = {
      userId: user.id,
      email: user.email,
      loginAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + AUTH_SESSION_TTL_MS).toISOString(),
    };
    persistAuthSession(session);
    persistRoleSwitch(null, null);  // E-9: ログイン時はロール切替記録をクリア（ログインユーザー本来のロールを優先）
    set(s => ({
      authSession: session,
      currentRole: user.role,
      currentUserId: user.id,
      // 最終ログインを users に反映
      users: s.users.map(u => u.id === user.id ? { ...u, lastLogin: session.loginAt } : u),
    }));
  },

  logout: () => {
    persistAuthSession(null);
    persistRoleSwitch(null, null);  // E-9: ログアウト時もロール切替記録をクリア
    set({ authSession: null });
  },

  isAuthenticated: () => {
    const s = get().authSession;
    if (!s) return false;
    if (new Date(s.expiresAt).getTime() < Date.now()) {
      // 期限切れ
      persistAuthSession(null);
      set({ authSession: null });
      return false;
    }
    return true;
  },

  touchSession: () => {
    const s = get().authSession;
    if (!s) return;
    const next: AuthSession = {
      ...s,
      expiresAt: new Date(Date.now() + AUTH_SESSION_TTL_MS).toISOString(),
    };
    persistAuthSession(next);
    set({ authSession: next });
  },

  changePassword: (userId, current, next) => {
    const passwords = get().passwords;
    const expected = passwords[userId] ?? DEFAULT_DEMO_PASSWORD;
    if (current !== expected) {
      return { ok: false, error: '現在のパスワードが正しくありません' };
    }
    if (!next || next.length < 4) {
      return { ok: false, error: '新しいパスワードは 4 文字以上で設定してください' };
    }
    if (next === current) {
      return { ok: false, error: '新しいパスワードは現在のものと異なる必要があります' };
    }
    set({ passwords: { ...passwords, [userId]: next } });
    return { ok: true };
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

  // MGR-4: 未確認日報の一括確認 - submitted のみを confirmed に遷移
  bulkConfirmReports: (reportIds) => {
    const now = new Date().toISOString();
    let confirmed = 0;
    set(s => {
      const next = s.reports.map(r => {
        if (reportIds.includes(r.id) && r.status === 'submitted') {
          confirmed += 1;
          return { ...r, status: 'confirmed' as const, confirmedAt: now, confirmedBy: s.currentUserId, updatedAt: now };
        }
        return r;
      });
      return { reports: next };
    });
    return confirmed;
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
    // BUG-B: 提出済み / 確認済み日報の TODO は変更不可（二層防御: store ガード）
    // BUG-B 残存修正: 期限切れ TODO も変更不可（store 層での二層防御）
    const report = get().reports.find(r => r.id === reportId);
    if (!report) return;
    const todo = report.todos.find(t => t.id === todoId);
    const todayStr = new Date().toISOString().split('T')[0];
    if (!todo || isTodoReadOnly(todo, report.status as TodoReportStatus, todayStr)) {
      console.warn('[store] toggleTodo blocked: todo is read-only', { reportId, todoId, status: report.status, dueDate: todo?.dueDate });
      return;
    }
    // 3段階巡回: todo → doing → done → todo
    const nextStatus = (current: 'todo' | 'doing' | 'done'): 'todo' | 'doing' | 'done' => {
      if (current === 'todo') return 'doing';
      if (current === 'doing') return 'done';
      return 'todo';
    };
    set(s => ({
      reports: s.reports.map(r => r.id === reportId
        ? {
            ...r,
            todos: r.todos.map(t => {
              if (t.id === todoId) {
                const newStatus = nextStatus(t.status ?? 'todo');
                return { ...t, status: newStatus, completed: newStatus === 'done' };
              }
              return t;
            }),
            updatedAt: new Date().toISOString()
          }
        : r
      )
    }));
  },
  updateTodo: (reportId, todoId, updates) => {
    // BUG-B: 提出済み / 確認済み日報の TODO は変更不可
    // BUG-B 残存修正: 期限切れ TODO も変更不可（store 層二層防御）
    const report = get().reports.find(r => r.id === reportId);
    if (!report) return;
    const todo = report.todos.find(t => t.id === todoId);
    const todayStr = new Date().toISOString().split('T')[0];
    if (!todo || isTodoReadOnly(todo, report.status as TodoReportStatus, todayStr)) {
      console.warn('[store] updateTodo blocked: todo is read-only', { reportId, todoId, status: report.status, dueDate: todo?.dueDate });
      return;
    }
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
    // BUG-B: 提出済み / 確認済み日報の TODO は削除不可
    // BUG-B 残存修正: 期限切れ TODO も削除不可（store 層二層防御）
    const report = get().reports.find(r => r.id === reportId);
    if (!report) return;
    const todo = report.todos.find(t => t.id === todoId);
    const todayStr = new Date().toISOString().split('T')[0];
    if (!todo || isTodoReadOnly(todo, report.status as TodoReportStatus, todayStr)) {
      console.warn('[store] deleteTodo blocked: todo is read-only', { reportId, todoId, status: report.status, dueDate: todo?.dueDate });
      return;
    }
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

  addManagerComment: (dayKey: string, authorUserId: string, body: string, authorRole?: 'manager' | 'executive' | 'general') => {
    set(s => ({
      managerComments: [...s.managerComments, {
        id: uid(), dayKey, authorUserId, authorRole, body, createdAt: new Date().toISOString(), replies: [],
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

  // --- Person アクション ---
  addPerson: (householdId, partial) => {
    const now = new Date().toISOString();
    const newPerson: Person = { ...partial, id: uid(), householdId, createdAt: now, updatedAt: now };
    set(s => ({ persons: [...s.persons, newPerson] }));
    return newPerson;
  },

  updatePerson: (personId, patch) => {
    set(s => ({
      persons: s.persons.map(p => p.id === personId
        ? { ...p, ...patch, updatedAt: new Date().toISOString() }
        : p
      ),
    }));
  },

  deletePerson: (personId) => {
    const s = get();
    const person = s.persons.find(p => p.id === personId);
    if (!person) return { ok: false, error: '世帯員が見つかりません' };
    if (person.relation === 'head') {
      // 世帯主削除: 別の世帯員を世帯主に自動繰り上げ
      const siblings = s.persons.filter(p => p.householdId === person.householdId && p.id !== personId);
      if (siblings.length > 0) {
        const next = siblings[0];
        set(state => ({
          persons: state.persons
            .filter(p => p.id !== personId)
            .map(p => p.id === next.id
              ? { ...p, relation: 'head' as const, updatedAt: new Date().toISOString() }
              : p
            ),
          customers: state.customers.map(c =>
            c.id === person.householdId ? { ...c, headPersonId: next.id } : c
          ),
        }));
      } else {
        // 世帯員が自分のみの場合は削除して headPersonId もクリア
        set(state => ({
          persons: state.persons.filter(p => p.id !== personId),
          customers: state.customers.map(c =>
            c.id === person.householdId ? { ...c, headPersonId: undefined } : c
          ),
        }));
      }
    } else {
      set(state => ({ persons: state.persons.filter(p => p.id !== personId) }));
    }
    return { ok: true };
  },

  getPersonsByHousehold: (householdId) => {
    return get().persons.filter(p => p.householdId === householdId);
  },

  deleteCustomer: (customerId) => {
    // P0 二層防御: 付帯情報あり顧客は admin/executive のみ削除可
    const s = get();
    if (hasCustomerAttachment({ reports: s.reports }, customerId)) {
      if (s.currentRole !== 'admin' && s.currentRole !== 'executive') {
        console.warn('[security] deleteCustomer blocked: 付帯情報あり customer は admin/executive のみ削除可');
        return false;
      }
    }
    // CUS-3: 完全削除。過去日報からの参照は customerId が dangling になるが、UI 側で fallback 表示する
    // E-8 修正: 削除した顧客 ID を localStorage に永続化し、ページリロード後も削除状態を保持する
    persistDeletedCustomerId(customerId);
    set(s => ({
      customers: s.customers.filter(c => c.id !== customerId),
      persons: s.persons.filter(p => p.householdId !== customerId),
    }));
    return true;
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

  // ----------------------------------------------------
  // Policy
  // ----------------------------------------------------
  addPolicy: (partial) => {
    const now = new Date().toISOString();
    const policy: Policy = { ...partial, id: uid(), createdAt: now, updatedAt: now };
    set(s => {
      const updated = [...s.policies, policy];
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('nippou.policies.v1', JSON.stringify(updated));
      }
      return { policies: updated };
    });
    return policy;
  },

  updatePolicy: (id, patch) => {
    set(s => {
      const updated = s.policies.map(p => p.id === id
        ? { ...p, ...patch, updatedAt: new Date().toISOString() }
        : p
      );
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('nippou.policies.v1', JSON.stringify(updated));
      }
      return { policies: updated };
    });
  },

  deletePolicy: (id) => {
    set(s => {
      const updated = s.policies.filter(p => p.id !== id);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('nippou.policies.v1', JSON.stringify(updated));
      }
      return { policies: updated };
    });
  },

  addCoverage: (policyId, partial) => {
    const coverage: Coverage = { ...partial, id: uid(), policyId };
    set(s => {
      const updated = s.policies.map(p => p.id === policyId
        ? { ...p, coverages: [...p.coverages, coverage], updatedAt: new Date().toISOString() }
        : p
      );
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('nippou.policies.v1', JSON.stringify(updated));
      }
      return { policies: updated };
    });
    return coverage;
  },

  updateCoverage: (coverageId, patch) => {
    set(s => {
      const updated = s.policies.map(p => {
        if (!p.coverages.find(c => c.id === coverageId)) return p;
        return {
          ...p,
          coverages: p.coverages.map(c => c.id === coverageId ? { ...c, ...patch } : c),
          updatedAt: new Date().toISOString(),
        };
      });
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('nippou.policies.v1', JSON.stringify(updated));
      }
      return { policies: updated };
    });
  },

  deleteCoverage: (coverageId) => {
    set(s => {
      const updated = s.policies.map(p => {
        if (!p.coverages.find(c => c.id === coverageId)) return p;
        return {
          ...p,
          coverages: p.coverages.filter(c => c.id !== coverageId),
          updatedAt: new Date().toISOString(),
        };
      });
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('nippou.policies.v1', JSON.stringify(updated));
      }
      return { policies: updated };
    });
  },

  issuePoliciesFromOpportunity: (opportunityId, userId) => {
    const opp = get().opportunities.find(o => o.id === opportunityId);
    if (!opp) return [];
    const now = new Date().toISOString();
    const issued: Policy[] = opp.proposalProducts.map(pp => {
      const policy: Policy = {
        id: uid(),
        householdId: opp.householdId,
        ownerId: userId,
        contractorPersonId: pp.insuredPersonId || (opp.targetPersonIds[0] ?? ''),
        insuredPersonIds: pp.insuredPersonId ? [pp.insuredPersonId] : opp.targetPersonIds,
        insurer: pp.insurer,
        productName: pp.productName,
        productCategory: pp.productCategory as ProductCategory,
        status: 'pending',
        startDate: now.slice(0, 10),
        monthlyPremium: pp.monthlyPremium,
        payMode: 'monthly',
        hasCashValue: ['life', 'savings', 'nursing'].includes(pp.productCategory),
        sourceOpportunityId: opportunityId,
        coverages: [],
        tags: [],
        memo: pp.memo ?? '',
        createdAt: now,
        updatedAt: now,
      };
      if (pp.faceAmount) {
        const cov: Coverage = {
          id: uid(),
          policyId: policy.id,
          type: pp.productCategory === 'life' ? 'death'
            : pp.productCategory === 'medical' ? 'medical_hospital'
            : pp.productCategory === 'cancer' ? 'cancer'
            : pp.productCategory === 'income' ? 'disability'
            : pp.productCategory === 'nursing' ? 'nursing'
            : pp.productCategory === 'savings' ? 'savings'
            : 'other',
          label: pp.productName,
          faceAmount: pp.faceAmount,
          unit: 'JPY',
          insuredPersonId: pp.insuredPersonId || (opp.targetPersonIds[0] ?? ''),
          isMain: true,
          memo: '',
        };
        policy.coverages = [cov];
      }
      return policy;
    });
    set(s => {
      const updatedPolicies = [...s.policies, ...issued];
      const updatedOpps = s.opportunities.map(o => {
        if (o.id !== opportunityId) return o;
        return {
          ...o,
          stage: 'issued' as OpportunityStage,
          status: 'won' as const,
          actualCloseDate: o.actualCloseDate ?? now.slice(0, 10),
          stageHistory: [
            ...o.stageHistory,
            { stage: 'issued' as OpportunityStage, changedAt: now, changedByUserId: userId, note: '契約発行' },
          ],
          updatedAt: now,
        };
      });
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('nippou.policies.v1', JSON.stringify(updatedPolicies));
        window.localStorage.setItem('nippou.opportunities.v1', JSON.stringify(updatedOpps));
      }
      return { policies: updatedPolicies, opportunities: updatedOpps };
    });
    return issued;
  },

  activatePolicy: (policyId, policyNumber, startDate, userId) => {
    const now = new Date().toISOString();
    set(s => {
      const updatedPolicies = s.policies.map(p => p.id === policyId
        ? { ...p, policyNumber, startDate, status: 'inforce' as PolicyStatus, updatedAt: now }
        : p
      );
      const histEntry: PolicyStatusHistory = {
        id: uid(), policyId, status: 'inforce', changedAt: now, changedByUserId: userId, note: `証券番号: ${policyNumber}`,
      };
      const updatedHistory = [...s.policyStatusHistory, histEntry];
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('nippou.policies.v1', JSON.stringify(updatedPolicies));
        window.localStorage.setItem('nippou.policyHistory.v1', JSON.stringify(updatedHistory));
      }
      return { policies: updatedPolicies, policyStatusHistory: updatedHistory };
    });
  },

  changePolicyStatus: (id, newStatus, note?, userId?) => {
    const now = new Date().toISOString();
    const currentUserId = userId ?? get().currentUserId;
    set(s => {
      const updatedPolicies = s.policies.map(p => p.id === id
        ? { ...p, status: newStatus, updatedAt: now }
        : p
      );
      const histEntry: PolicyStatusHistory = {
        id: uid(), policyId: id, status: newStatus, changedAt: now, changedByUserId: currentUserId, note,
      };
      const updatedHistory = [...s.policyStatusHistory, histEntry];
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('nippou.policies.v1', JSON.stringify(updatedPolicies));
        window.localStorage.setItem('nippou.policyHistory.v1', JSON.stringify(updatedHistory));
      }
      return { policies: updatedPolicies, policyStatusHistory: updatedHistory };
    });
  },

  getPoliciesByHousehold: (householdId, options?) => {
    const policies = get().policies.filter(p => p.householdId === householdId);
    if (options?.activeOnly) return policies.filter(p => p.status === 'inforce' || p.status === 'pending');
    return policies;
  },

  getPoliciesByPerson: (personId, options?) => {
    const policies = get().policies.filter(p =>
      p.contractorPersonId === personId ||
      p.insuredPersonIds.includes(personId) ||
      p.coverages.some(c => c.insuredPersonId === personId)
    );
    if (options?.activeOnly) return policies.filter(p => p.status === 'inforce' || p.status === 'pending');
    return policies;
  },

  getCoverageMatrix: (householdId) => {
    const policies = get().policies.filter(
      p => p.householdId === householdId && (p.status === 'inforce' || p.status === 'pending')
    );
    const persons = get().persons.filter(p => p.householdId === householdId);
    return persons.map(person => {
      const personPolicies = policies.filter(p =>
        p.insuredPersonIds.includes(person.id) ||
        p.coverages.some(c => c.insuredPersonId === person.id)
      );
      const coverageTypes = new Set<CoverageType>();
      const totalFaceByType: Record<string, number> = {};
      for (const policy of personPolicies) {
        for (const cov of policy.coverages) {
          if (cov.insuredPersonId === person.id || policy.insuredPersonIds.includes(person.id)) {
            coverageTypes.add(cov.type);
            if (cov.faceAmount) {
              totalFaceByType[cov.type] = (totalFaceByType[cov.type] ?? 0) + cov.faceAmount;
            }
          }
        }
      }
      return { personId: person.id, coverageTypes, totalFaceByType };
    });
  },

  // ----------------------------------------------------
  // Opportunity
  // ----------------------------------------------------
  addOpportunity: (partial) => {
    const now = new Date().toISOString();
    const totalMonthlyPremium = (partial.proposalProducts ?? []).reduce((sum, p) => sum + p.monthlyPremium, 0);
    const opp: Opportunity = {
      ...partial,
      id: uid(),
      totalMonthlyPremium: totalMonthlyPremium > 0 ? totalMonthlyPremium : undefined,
      stageHistory: [{ stage: partial.stage, changedAt: now, changedByUserId: partial.ownerId }],
      createdAt: now,
      updatedAt: now,
    };
    set(s => {
      const updated = [...s.opportunities, opp];
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('nippou.opportunities.v1', JSON.stringify(updated));
      }
      return { opportunities: updated };
    });
    return opp;
  },

  updateOpportunity: (id, patch) => {
    set(s => {
      const updated = s.opportunities.map(o => {
        if (o.id !== id) return o;
        const merged = { ...o, ...patch, updatedAt: new Date().toISOString() };
        // 自動計算: totalMonthlyPremium
        if (patch.proposalProducts !== undefined) {
          const total = (merged.proposalProducts ?? []).reduce((sum, p) => sum + p.monthlyPremium, 0);
          merged.totalMonthlyPremium = total > 0 ? total : undefined;
        }
        return merged;
      });
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('nippou.opportunities.v1', JSON.stringify(updated));
      }
      return { opportunities: updated };
    });
  },

  deleteOpportunity: (id) => {
    set(s => {
      const updated = s.opportunities.filter(o => o.id !== id);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('nippou.opportunities.v1', JSON.stringify(updated));
      }
      return { opportunities: updated };
    });
  },

  changeOpportunityStage: (id, newStage, note?, userId?) => {
    const now = new Date().toISOString();
    const currentUserId = userId ?? get().currentUserId;
    set(s => {
      const updated = s.opportunities.map(o => {
        if (o.id !== id) return o;
        const historyEntry = { stage: newStage, changedAt: now, changedByUserId: currentUserId, note };
        let status = o.status;
        let actualCloseDate = o.actualCloseDate;
        if (newStage === 'issued') {
          status = 'won';
          actualCloseDate = actualCloseDate ?? now.slice(0, 10);
        } else if (newStage === 'lost') {
          status = 'lost';
          actualCloseDate = actualCloseDate ?? now.slice(0, 10);
        }
        return {
          ...o,
          stage: newStage,
          status,
          actualCloseDate,
          stageHistory: [...o.stageHistory, historyEntry],
          updatedAt: now,
        };
      });
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('nippou.opportunities.v1', JSON.stringify(updated));
      }
      return { opportunities: updated };
    });
  },

  getOpportunitiesByHousehold: (householdId, options?) => {
    const opps = get().opportunities.filter(o => o.householdId === householdId);
    if (options?.openOnly) return opps.filter(o => o.status === 'open');
    return opps;
  },

  getOpportunityById: (id) => {
    return get().opportunities.find(o => o.id === id);
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

  resetAll: () => {
    persistAuthSession(null);
    persistRoleSwitch(null, null);  // E-9: リセット時はロール切替記録もクリア
    // E-8 修正: リセット時は削除済み顧客 ID もクリア
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('nippou.deletedCustomerIds.v1');
      window.localStorage.removeItem('nippou.opportunities.v1');
      window.localStorage.removeItem('nippou.policies.v1');
      window.localStorage.removeItem('nippou.policyHistory.v1');
    }
    set({
      currentRole: 'general', currentUserId: 'u1',
      authSession: null,
      passwords: Object.fromEntries(USERS.map(u => [u.id, DEFAULT_DEMO_PASSWORD])),
      users: USERS, teams: TEAMS, customers: CUSTOMERS, persons: PERSONS, reports: REPORTS,
      templates: TEMPLATES, quickChips: DEFAULT_QUICK_CHIPS,
      notifications: NOTIFICATIONS, auditLogs: AUDIT_LOGS,
      trackingSession: null, emailChangeRequests: [], managerComments: [], compliments: [],
      opportunities: OPPORTUNITIES, policies: POLICIES, policyStatusHistory: POLICY_STATUS_HISTORY, toasts: [],
    });
  },
}));
