// =====================================================
// シードデータ - 日報管理システム
// =====================================================
import type {
  User, Team, Customer, DailyReport, Template, QuickChip,
  Notification, AuditLog, TimeBlock, Todo, Comment
} from '../types';
import { format, subDays, addDays } from 'date-fns';

const today = format(new Date(), 'yyyy-MM-dd');
const d = (n: number) => format(subDays(new Date(), n), 'yyyy-MM-dd');
const f = (n: number) => format(addDays(new Date(), n), 'yyyy-MM-dd');

// =====================================================
// ユーザー
// =====================================================
export const USERS: User[] = [
  { id: 'u1', name: '袴田 祐司', email: 'hakuta@example.com', role: 'general', teamIds: ['t1'], status: 'active', lastLogin: `${today}T09:01:00`, avatarInitials: '袴' },
  { id: 'u2', name: '田中 太郎', email: 'tanaka@example.com', role: 'general', teamIds: ['t2'], status: 'active', lastLogin: `${today}T08:45:00`, avatarInitials: '田' },
  { id: 'u3', name: '山田 花子', email: 'yamada@example.com', role: 'general', teamIds: ['t1'], status: 'active', lastLogin: d(1) + 'T17:30:00', avatarInitials: '山' },
  { id: 'u4', name: '佐藤 健一', email: 'sato@example.com', role: 'manager', teamIds: ['t1'], status: 'active', lastLogin: `${today}T08:55:00`, avatarInitials: '佐' },
  { id: 'u5', name: '鈴木 美咲', email: 'suzuki@example.com', role: 'executive', teamIds: [], status: 'active', lastLogin: `${today}T09:10:00`, avatarInitials: '鈴' },
  { id: 'u6', name: '高田 一郎', email: 'takada@example.com', role: 'admin', teamIds: [], status: 'active', lastLogin: d(2) + 'T10:00:00', avatarInitials: '高' },
];

// =====================================================
// チーム
// =====================================================
export const TEAMS: Team[] = [
  { id: 't1', name: '営業1課', description: '袋井・磐田エリア担当', managerIds: ['u4'], memberIds: ['u1', 'u3', 'u4'] },
  { id: 't2', name: '営業2課', description: '浜松エリア担当', managerIds: [], memberIds: ['u2'] },
];

// =====================================================
// 顧客
// =====================================================
export const CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'KOORO GILSON', type: 'individual', area: '袋井', primaryUserId: 'u1', tags: ['自動車保険', '継続', '2026更新'], memo: 'ピアさん引継ぎ案件。7月更新案件あり。', status: 'active', lastContactDate: today, nextAppointment: f(53), isFavorite: true },
  { id: 'c2', name: '齋藤 和久', type: 'individual', area: '磐田', primaryUserId: 'u1', tags: ['生命保険'], memo: '', status: 'active', lastContactDate: today },
  { id: 'c3', name: '暁和化学ゴム', type: 'corporate', area: '磐田', primaryUserId: 'u1', tags: ['法人', '火災保険'], memo: '担当: 山田部長', status: 'active', lastContactDate: today, nextAppointment: f(3) },
  { id: 'c4', name: '水野 幸重', type: 'individual', area: '袋井', primaryUserId: 'u1', tags: ['自動車保険'], memo: '', status: 'active', lastContactDate: d(3) },
  { id: 'c5', name: '山田工業', type: 'corporate', area: '袋井', primaryUserId: 'u1', tags: ['法人', '損害保険'], memo: '社長直接対応', status: 'active', lastContactDate: d(7) },
  { id: 'c6', name: '鈴木 花代', type: 'individual', area: '掛川', primaryUserId: 'u2', tags: ['生命保険', '見直し'], memo: '', status: 'active', lastContactDate: d(2) },
  { id: 'c7', name: 'テクノ精工', type: 'corporate', area: '浜松', primaryUserId: 'u2', tags: ['法人', '労災'], memo: '年1回更新', status: 'active', lastContactDate: d(5) },
  { id: 'c8', name: '高橋 誠', type: 'prospect', area: '磐田', primaryUserId: 'u1', tags: ['見込み', '自動車'], memo: '紹介案件', status: 'active', lastContactDate: d(10) },
  { id: 'c9', name: '大鉄工業', type: 'corporate', area: '袋井', primaryUserId: 'u3', tags: ['法人'], memo: '', status: 'inactive', lastContactDate: d(60) },
  { id: 'c10', name: '伊藤 幸子', type: 'individual', area: '掛川', primaryUserId: 'u3', tags: ['医療保険'], memo: '', status: 'active', lastContactDate: d(14) },
];

// =====================================================
// ヘルパー: TimeBlock生成
// =====================================================
function makeBlock(id: string, reportId: string, opts: Partial<TimeBlock>): TimeBlock {
  return {
    id,
    reportId,
    type: 'visit',
    startTime: '09:00',
    endTime: '10:00',
    title: '',
    memo: '',
    isPlanned: true,
    isActual: true,
    attachments: [],
    ...opts,
  };
}

function makeTodo(id: string, reportId: string, text: string, completed = false, dueDate?: string, priority: 'high' | 'medium' | 'low' = 'medium'): Todo {
  return { id, reportId, text, completed, status: completed ? 'done' : 'todo', rolledOver: false, priority, dueDate };
}

function makeComment(id: string, reportId: string, userId: string, text: string, createdAt: string): Comment {
  return { id, reportId, userId, text, createdAt };
}

// =====================================================
// 日報（過去30日 + 今日）
// =====================================================
const makeReport = (
  id: string, userId: string, date: string,
  status: 'planning' | 'in_progress' | 'submitted' | 'confirmed',
  blocks: TimeBlock[], todos: Todo[], comments: Comment[]
): DailyReport => ({
  id,
  userId,
  date,
  status,
  mainTheme: '顧客対応と案件推進',
  monthlyTheme: '6月目標: 新規3件獲得',
  dailyTheme: '今日の重点: アポ確認と見積提出',
  blocks,
  todos,
  customerVisits: [],
  gratitude: ['チームサポートに感謝', '顧客の信頼に感謝'],
  morningMood: 'partly_cloudy',
  eveningMood: 'sunny',
  managerSignal: 'ok',
  selfComment: '',
  comments,
  attachments: [],
  submittedAt: (status === 'submitted' || status === 'confirmed') ? `${date}T18:30:00` : undefined,
  confirmedAt: status === 'confirmed' ? `${date}T19:30:00` : undefined,
  confirmedBy: status === 'confirmed' ? 'u4' : undefined,
  createdAt: `${date}T08:00:00`,
  updatedAt: `${date}T18:30:00`,
});

const buildReports = (): DailyReport[] => {
  const reports: DailyReport[] = [];

  // 今日の日報（下書き）
  reports.push(makeReport(
    'r_today_u1', 'u1', today, 'planning',
    [
      makeBlock('b1', 'r_today_u1', { type: 'meeting', startTime: '09:00', endTime: '09:30', title: '朝礼', isPlanned: true, isActual: true }),
      makeBlock('b2', 'r_today_u1', { type: 'visit', startTime: '10:00', endTime: '11:30', title: '自動車保険更新手続き', customerId: 'c1', isPlanned: true, isActual: true }),
      makeBlock('b3', 'r_today_u1', { type: 'office', startTime: '13:00', endTime: '14:00', title: '見積書作成', isPlanned: true, isActual: false }),
      makeBlock('b4', 'r_today_u1', { type: 'visit', startTime: '14:30', endTime: '15:30', title: '火災保険更新確認 (暁和化学ゴム)', customerId: 'c3', isPlanned: true, isActual: false }),
    ],
    [
      // DEAD-1: 期限切れ検証用 × 2 + 今日期限 × 1 + 未期限 × 1
      makeTodo('td1', 'r_today_u1', '法人アポ取り (月末期限)', false, d(3), 'high'),
      makeTodo('td2', 'r_today_u1', '見積作成 (KOORO GILSON) ⚠ 付け完了', false, d(7), 'high'),
      makeTodo('td3', 'r_today_u1', '山田工業フォロー'),
      makeTodo('td4', 'r_today_u1', '今日期限のタスク', false, today, 'medium'),
      { ...makeTodo('td5', 'r_today_u1', 'テクノ精工 労災更新書類確認', false, f(7), 'medium'), customerId: 'c7' },
    ],
    []
  ));

  // 過去30日分を生成（u1のみ詳細、u2/u3は簡易）
  const statuses: Array<'submitted' | 'confirmed' | 'in_progress' | 'planning'> = [
    'confirmed', 'confirmed', 'submitted', 'confirmed', 'planning',
    'confirmed', 'confirmed', 'submitted', 'in_progress', 'confirmed',
  ];

  for (let i = 1; i <= 30; i++) {
    const date = d(i);
    const dow = new Date(date).getDay();
    if (dow === 0 || dow === 6) continue; // 土日スキップ

    const status = statuses[i % statuses.length];
    const rid = `r_${date}_u1`;
    const comments: Comment[] = status === 'confirmed' ? [
      makeComment(`cm_${rid}_1`, rid, 'u4', 'お疲れさまでした。引き続きよろしく。', `${date}T19:30:00`),
    ] : [];

    reports.push(makeReport(
      rid, 'u1', date, status,
      [
        makeBlock(`b_${rid}_1`, rid, { type: 'meeting', startTime: '09:00', endTime: '09:30', title: '朝礼' }),
        makeBlock(`b_${rid}_2`, rid, { type: 'visit', startTime: '10:00', endTime: '11:00', title: '顧客訪問', customerId: 'c1' }),
        makeBlock(`b_${rid}_3`, rid, { type: 'lunch', startTime: '12:00', endTime: '13:00', title: '昼食' }),
        makeBlock(`b_${rid}_4`, rid, { type: 'office', startTime: '14:00', endTime: '17:00', title: '事務作業' }),
      ],
      [
        // DEAD-1: 検証を確実にするため、全ての過去日報に dueDate 付き TODO を最低 1 件仕込む
        // i % 4 で見え方をバラつかせる:
        //   0: 完了 (期限切れでもバッジなし)
        //   1: 未完了 + 期限切れ (赤バッジ)
        //   2: 未完了 + dueDate 未設定 (バッジなし)
        //   3: 未完了 + 期限切れ高優先度 (赤バッジ + bold)
        makeTodo(`td_${rid}_1`, rid, '顧客フォロー', i % 4 === 0, i % 4 === 1 ? d(i - 1) : undefined, 'medium'),
        makeTodo(`td_${rid}_2`, rid, '見積提出', i % 4 === 2, i % 4 === 3 ? d(Math.max(1, i - 2)) : undefined, i % 4 === 3 ? 'high' : 'medium'),
        // DEAD-1: 一部の過去日報に高優先度 期限切れ TODO
        ...(i % 5 === 0 ? [
          makeTodo(`td_${rid}_3`, rid, '重要課題 (要フォロー)', false, d(Math.max(1, i - 3)), 'high'),
        ] : []),
      ],
      comments
    ));

    // u2も一部生成
    if (i <= 15) {
      const rid2 = `r_${date}_u2`;
      reports.push(makeReport(rid2, 'u2', date, i <= 5 ? 'confirmed' : 'submitted', [], [], []));
    }
  }

  return reports;
};

export const REPORTS: DailyReport[] = buildReports();

// =====================================================
// テンプレート
// =====================================================
export const TEMPLATES: Template[] = [
  {
    id: 'tmpl1', name: '営業日報', description: '標準的な営業日報テンプレート',
    version: 3, status: 'published', isDefault: true, isActive: true,
    blocks: [
      { id: 'tb1', type: 'single_line', label: 'メインテーマ', required: true, order: 1 },
      { id: 'tb2', type: 'single_line', label: '今月のテーマ', required: false, order: 2 },
      { id: 'tb3', type: 'single_line', label: '今日のテーマ', required: false, order: 3 },
      { id: 'tb4', type: 'timeline', label: 'タイムライン', required: true, order: 4 },
      { id: 'tb5', type: 'todo', label: 'TODO', required: false, order: 5 },
      { id: 'tb6', type: 'customer', label: '顧客対応', required: false, order: 6 },
      { id: 'tb7', type: 'multi_line', label: 'ありがとう', required: false, order: 7 },
      { id: 'tb8', type: 'radio', label: '気分（朝）', required: true, order: 8 },
      { id: 'tb9', type: 'radio', label: '気分（終わり）', required: true, order: 9 },
      { id: 'tb10', type: 'radio', label: '上長への合図', required: false, order: 10 },
    ],
    usageCount: 1242, createdAt: '2025-01-01T00:00:00', updatedAt: '2026-01-15T00:00:00',
  },
  {
    id: 'tmpl2', name: '内勤日報', description: '内勤スタッフ向け日報',
    version: 2, status: 'published', isDefault: false, isActive: true,
    blocks: [
      { id: 'tb21', type: 'single_line', label: 'メインテーマ', required: true, order: 1 },
      { id: 'tb22', type: 'timeline', label: 'タイムライン', required: true, order: 2 },
      { id: 'tb23', type: 'todo', label: 'TODO', required: false, order: 3 },
    ],
    usageCount: 312, createdAt: '2025-03-01T00:00:00', updatedAt: '2025-12-01T00:00:00',
  },
  {
    id: 'tmpl3', name: 'プロジェクト報告', description: 'プロジェクト進捗報告用',
    version: 1, status: 'draft', isDefault: false, isActive: false,
    blocks: [],
    usageCount: 0, createdAt: '2026-05-01T00:00:00', updatedAt: '2026-05-01T00:00:00',
  },
];

// =====================================================
// クイックチップ (デフォルト)
// =====================================================
export const DEFAULT_QUICK_CHIPS: QuickChip[] = [
  { id: 'qc1', userId: 'u1', label: '訪問', emoji: '🤝', blockType: 'visit', order: 1 },
  { id: 'qc2', userId: 'u1', label: '事務', emoji: '📑', blockType: 'office', order: 2 },
  { id: 'qc3', userId: 'u1', label: '電話', emoji: '📞', blockType: 'phone', order: 3 },
  { id: 'qc4', userId: 'u1', label: '移動', emoji: '🚗', blockType: 'travel', order: 4 },
  { id: 'qc5', userId: 'u1', label: '休憩', emoji: '☕', blockType: 'break', order: 5 },
  { id: 'qc6', userId: 'u1', label: '会議', emoji: '👥', blockType: 'meeting', order: 6 },
  { id: 'qc7', userId: 'u1', label: '昼食', emoji: '🍱', blockType: 'lunch', order: 7 },
];

// =====================================================
// 通知
// =====================================================
export const NOTIFICATIONS: Notification[] = [
  { id: 'n1', userId: 'u1', type: 'comment', title: 'コメントが付きました', body: '佐藤 健一さんからコメントが付きました', isRead: false, relatedReportId: `r_${d(1)}_u1`, createdAt: `${d(1)}T19:30:00` },
  { id: 'n2', userId: 'u1', type: 'reminder', title: '本日の日報が未提出です', body: '本日の日報がまだ提出されていません', isRead: false, createdAt: `${today}T18:00:00` },
  { id: 'n3', userId: 'u1', type: 'confirmed', title: '日報が確認済みになりました', body: `${d(2)}の日報が確認済みになりました`, isRead: true, relatedReportId: `r_${d(2)}_u1`, createdAt: `${d(2)}T19:30:00` },
  { id: 'n4', userId: 'u1', type: 'sent_back', title: '日報が差し戻されました', body: `${d(5)}の日報が差し戻されました`, isRead: true, relatedReportId: `r_${d(5)}_u1`, createdAt: `${d(5)}T20:00:00` },
];

// =====================================================
// 監査ログ
// =====================================================
export const AUDIT_LOGS: AuditLog[] = [
  { id: 'al1', userId: 'u1', action: '日報を提出', targetType: 'DailyReport', targetId: `r_${d(1)}_u1`, ip: '192.168.1.1', userAgent: 'Chrome/125', result: 'success', diff: { status: { before: 'planning', after: 'submitted' } }, createdAt: `${d(1)}T18:30:00` },
  { id: 'al2', userId: 'u1', action: 'ログイン', targetType: 'User', targetId: 'u1', ip: '192.168.1.1', userAgent: 'Chrome/125', result: 'success', createdAt: `${today}T09:01:00` },
  { id: 'al3', userId: 'u6', action: 'ユーザー権限変更', targetType: 'User', targetId: 'u2', ip: '192.168.1.100', userAgent: 'Chrome/125', result: 'success', diff: { role: { before: 'general', after: 'manager' } }, createdAt: d(3) + 'T10:00:00' },
  { id: 'al4', userId: 'u4', action: '日報を確認済みにした', targetType: 'DailyReport', targetId: `r_${d(2)}_u1`, ip: '192.168.1.2', userAgent: 'Firefox/120', result: 'success', diff: { status: { before: 'submitted', after: 'confirmed' } }, createdAt: `${d(2)}T19:30:00` },
  { id: 'al5', userId: 'u6', action: '顧客を追加', targetType: 'Customer', targetId: 'c8', ip: '192.168.1.100', userAgent: 'Chrome/125', result: 'success', createdAt: d(10) + 'T14:00:00' },
];
