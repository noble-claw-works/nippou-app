// =====================================================
// シードデータ - 305-hrl-nippou-app
// =====================================================
import type {
  User, Team, Customer, DailyReport, Template, QuickChip,
  Notification, AuditLog, TimeBlock, Todo, Comment, Person,
  Opportunity, OpportunityStage, OpportunityStatus,
  Policy, PolicyStatusHistory, Coverage,
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
// 世帯 (Household / Customer alias)
// =====================================================
export const CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'KOORO GILSON', type: 'individual', area: '袋井', primaryUserId: 'u1', headPersonId: 'p_c1_head', familyMemo: '家族: 配偶者、孟２名あり', tags: ['自動車保険', '継続', '2026更新'], memo: 'ピアさん引継ぎ案件。7月更新案件あり。', status: 'active', lastContactDate: today, nextAppointment: f(53), isFavorite: true },
  { id: 'c2', name: '齋藤 和久', type: 'individual', area: '磐田', primaryUserId: 'u1', headPersonId: 'p_c2_head', familyMemo: '家族: 富婦、子１名', tags: ['生命保険'], memo: '', status: 'active', lastContactDate: today },
  { id: 'c3', name: '暁和化学ゴム', type: 'corporate', area: '磐田', primaryUserId: 'u1', familyMemo: '', tags: ['法人', '火災保険'], memo: '担当: 山田部長', status: 'active', lastContactDate: today, nextAppointment: f(3) },
  { id: 'c4', name: '水野 幸重', type: 'individual', area: '袋井', primaryUserId: 'u1', headPersonId: 'p_c4_head', familyMemo: '', tags: ['自動車保険'], memo: '', status: 'active', lastContactDate: d(3) },
  { id: 'c5', name: '山田工業', type: 'corporate', area: '袋井', primaryUserId: 'u1', familyMemo: '', tags: ['法人', '損害保険'], memo: '社長直接対応', status: 'active', lastContactDate: d(7) },
  { id: 'c6', name: '鈴木 花代', type: 'individual', area: '掛川', primaryUserId: 'u2', headPersonId: 'p_c6_head', familyMemo: '家族: 小学3名', tags: ['生命保険', '見直し'], memo: '', status: 'active', lastContactDate: d(2) },
  { id: 'c7', name: 'テクノ精工', type: 'corporate', area: '浜松', primaryUserId: 'u2', familyMemo: '', tags: ['法人', '労災'], memo: '年1回更新', status: 'active', lastContactDate: d(5) },
  { id: 'c8', name: '高橋 誠', type: 'prospect', area: '磐田', primaryUserId: 'u1', headPersonId: 'p_c8_head', familyMemo: '', tags: ['見込み', '自動車'], memo: '紹介案件', status: 'active', lastContactDate: d(10) },
  { id: 'c9', name: '大鉄工業', type: 'corporate', area: '袋井', primaryUserId: 'u3', familyMemo: '', tags: ['法人'], memo: '', status: 'inactive', lastContactDate: d(60) },
  { id: 'c10', name: '伊藤 幸子', type: 'individual', area: '掛川', primaryUserId: 'u3', headPersonId: 'p_c10_head', familyMemo: '', tags: ['医療保険'], memo: '', status: 'active', lastContactDate: d(14) },
];

// =====================================================
// 世帯員 (Person) - シードデータ
// =====================================================
const _now = new Date().toISOString();
export const PERSONS: Person[] = [
  // c1: KOORO GILSON 世帯
  { id: 'p_c1_head', householdId: 'c1', name: 'KOORO GILSON', kana: 'コーロ ギルソン', relation: 'head', gender: 'M', birthDate: '1975-04-15', occupation: '会社員', smoker: false, memo: '', createdAt: _now, updatedAt: _now },
  { id: 'p_c1_spouse', householdId: 'c1', name: 'ギルソン メアリー', kana: 'ギルソン メアリー', relation: 'spouse', gender: 'F', birthDate: '1978-09-20', occupation: 'パート', smoker: false, memo: '', createdAt: _now, updatedAt: _now },
  { id: 'p_c1_child1', householdId: 'c1', name: 'ギルソン タロウ', kana: 'ギルソン タロウ', relation: 'child', gender: 'M', birthDate: '2005-07-03', memo: '', createdAt: _now, updatedAt: _now },
  { id: 'p_c1_child2', householdId: 'c1', name: 'ギルソン ハナコ', kana: 'ギルソン ハナコ', relation: 'child', gender: 'F', birthDate: '2008-03-12', memo: '', createdAt: _now, updatedAt: _now },
  // c2: 齋藤 和久 世帯
  { id: 'p_c2_head', householdId: 'c2', name: '齋藤 和久', kana: 'さいとう かずひさ', relation: 'head', gender: 'M', birthDate: '1968-11-25', occupation: '自営業', smoker: true, memo: '', createdAt: _now, updatedAt: _now },
  { id: 'p_c2_spouse', householdId: 'c2', name: '齋藤 子', kana: 'さいとう こ', relation: 'spouse', gender: 'F', birthDate: '1972-06-14', memo: '', createdAt: _now, updatedAt: _now },
  { id: 'p_c2_child1', householdId: 'c2', name: '齋藤 一郎', kana: 'さいとう いちろう', relation: 'child', gender: 'M', birthDate: '2003-02-28', memo: '', createdAt: _now, updatedAt: _now },
  // c3: 曉和化学ゴム (法人)
  { id: 'p_c3_head', householdId: 'c3', name: '曉和化学ゴム 代表', kana: '', relation: 'other', occupation: '代表取締役', memo: '主管: 山田部長', createdAt: _now, updatedAt: _now },
  // c4: 水野 幸重
  { id: 'p_c4_head', householdId: 'c4', name: '水野 幸重', kana: 'みずの こうじゅう', relation: 'head', gender: 'M', birthDate: '1980-08-10', occupation: '会社員', smoker: false, memo: '', createdAt: _now, updatedAt: _now },
  // c5: 山田工業 (法人)
  { id: 'p_c5_head', householdId: 'c5', name: '山田工業 社長', kana: '', relation: 'other', occupation: '代表取締役', memo: '社長直接対応', createdAt: _now, updatedAt: _now },
  // c6: 鈴木 花代
  { id: 'p_c6_head', householdId: 'c6', name: '鈴木 花代', kana: 'すずき はなよ', relation: 'head', gender: 'F', birthDate: '1970-01-07', occupation: 'PEナース', smoker: false, healthNotes: '花粉症あり', memo: '', createdAt: _now, updatedAt: _now },
  { id: 'p_c6_child1', householdId: 'c6', name: '鈴木 大輔', kana: 'すずき だいすけ', relation: 'child', gender: 'M', birthDate: '2001-05-20', memo: '', createdAt: _now, updatedAt: _now },
  { id: 'p_c6_child2', householdId: 'c6', name: '鈴木 二郎', kana: 'すずき にろう', relation: 'child', gender: 'M', birthDate: '2004-11-15', memo: '', createdAt: _now, updatedAt: _now },
  { id: 'p_c6_child3', householdId: 'c6', name: '鈴木 海奈', kana: 'すずき みなな', relation: 'child', gender: 'F', birthDate: '2010-03-08', memo: '', createdAt: _now, updatedAt: _now },
  // c7: テクノ精工 (法人)
  { id: 'p_c7_head', householdId: 'c7', name: 'テクノ精工 代表', kana: '', relation: 'other', occupation: '代表取締役', memo: '', createdAt: _now, updatedAt: _now },
  // c8: 高橋 誠
  { id: 'p_c8_head', householdId: 'c8', name: '高橋 誠', kana: 'たかはし まこと', relation: 'head', gender: 'M', birthDate: '1990-12-01', occupation: '会社員', smoker: false, memo: '紹介案件', createdAt: _now, updatedAt: _now },
  // c9: 大鉄工業 (法人, inactive)
  { id: 'p_c9_head', householdId: 'c9', name: '大鉄工業 代表', kana: '', relation: 'other', memo: '', createdAt: _now, updatedAt: _now },
  // c10: 伊藤 幸子
  { id: 'p_c10_head', householdId: 'c10', name: '伊藤 幸子', kana: 'いとう さちこ', relation: 'head', gender: 'F', birthDate: '1955-03-22', occupation: '無職', smoker: false, healthNotes: '高血圧', memo: '', createdAt: _now, updatedAt: _now },
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

// =====================================================
// 商談案件 (Opportunity) — Phase 2 Seed
// =====================================================
function mkOpp(
  id: string,
  householdId: string,
  ownerId: string,
  title: string,
  stage: OpportunityStage,
  status: OpportunityStatus,
  opts: Partial<Opportunity> = {}
): Opportunity {
  const now = new Date().toISOString();
  return {
    id,
    householdId,
    ownerId,
    title,
    stage,
    status,
    targetPersonIds: opts.targetPersonIds ?? [],
    productCategories: opts.productCategories ?? [],
    proposalProducts: opts.proposalProducts ?? [],
    totalMonthlyPremium: opts.proposalProducts
      ? opts.proposalProducts.reduce((s, p) => s + p.monthlyPremium, 0) || undefined
      : undefined,
    needsAnalysisDone: opts.needsAnalysisDone ?? false,
    illustrationProvided: opts.illustrationProvided ?? false,
    stageHistory: opts.stageHistory ?? [{ stage, changedAt: d(7) + 'T09:00:00', changedByUserId: ownerId }],
    tags: opts.tags ?? [],
    memo: opts.memo ?? '',
    expectedCloseDate: opts.expectedCloseDate,
    actualCloseDate: opts.actualCloseDate,
    lostReason: opts.lostReason,
    lostReasonDetail: opts.lostReasonDetail,
    nextAction: opts.nextAction,
    nextActionDate: opts.nextActionDate,
    createdAt: d(14) + 'T10:00:00',
    updatedAt: now,
  };
}

export const OPPORTUNITIES: Opportunity[] = [
  // c1: KOORO GILSON — 生命保険 (proposal ステージ)
  mkOpp('opp1', 'c1', 'u1', 'GILSON家 生命保険 見直し', 'proposal', 'open', {
    targetPersonIds: ['p_c1_head'],
    productCategories: ['life', 'medical'],
    proposalProducts: [
      { id: 'pp1', productCategory: 'life', productName: '収入保障保険', insurer: '明治安田生命', insuredPersonId: 'p_c1_head', monthlyPremium: 4800, faceAmount: 5000000, memo: '60歳満了' },
      { id: 'pp2', productCategory: 'medical', productName: '医療保険エクセルエイド', insurer: '東京海上日動あんしん生命', insuredPersonId: 'p_c1_head', monthlyPremium: 3200, memo: '1入院60日型' },
    ],
    needsAnalysisDone: true,
    illustrationProvided: true,
    nextAction: '設計書の説明と質問対応',
    nextActionDate: f(3),
    stageHistory: [
      { stage: 'approach', changedAt: d(30) + 'T09:00:00', changedByUserId: 'u1' },
      { stage: 'fact_finding', changedAt: d(21) + 'T10:00:00', changedByUserId: 'u1' },
      { stage: 'needs_analysis', changedAt: d(14) + 'T10:00:00', changedByUserId: 'u1' },
      { stage: 'proposal', changedAt: d(5) + 'T10:00:00', changedByUserId: 'u1', note: '設計書を提示しました' },
    ],
    memo: '配偶者分も追加提案を検討中',
    tags: ['生命保険', '見直し'],
    expectedCloseDate: f(21),
  }),

  // c2: 齋藤 和久 — 医療保険 (negotiation ステージ)
  mkOpp('opp2', 'c2', 'u1', '齋藤家 医療保険 新規', 'negotiation', 'open', {
    targetPersonIds: ['p_c2_head'],
    productCategories: ['medical'],
    proposalProducts: [
      { id: 'pp3', productCategory: 'medical', productName: 'メディカルKit R', insurer: 'ソニー生命', insuredPersonId: 'p_c2_head', monthlyPremium: 5500, memo: 'がん特約あり' },
    ],
    needsAnalysisDone: true,
    illustrationProvided: true,
    nextAction: '奥様との合同面談',
    nextActionDate: f(7),
    stageHistory: [
      { stage: 'approach', changedAt: d(45) + 'T09:00:00', changedByUserId: 'u1' },
      { stage: 'fact_finding', changedAt: d(30) + 'T10:00:00', changedByUserId: 'u1' },
      { stage: 'needs_analysis', changedAt: d(20) + 'T10:00:00', changedByUserId: 'u1' },
      { stage: 'proposal', changedAt: d(10) + 'T10:00:00', changedByUserId: 'u1' },
      { stage: 'negotiation', changedAt: d(3) + 'T10:00:00', changedByUserId: 'u1', note: '奥様が同席を希望' },
    ],
    memo: '奥様の同席が必要',
    tags: ['医療保険'],
    expectedCloseDate: f(14),
  }),

  // c4: 水野 幸重 — 自動車保険 (application ステージ)
  mkOpp('opp3', 'c4', 'u1', '水野家 自動車保険 更新', 'application', 'open', {
    targetPersonIds: ['p_c4_head'],
    productCategories: ['auto'],
    proposalProducts: [
      { id: 'pp4', productCategory: 'auto', productName: 'タフ・くるまの保険', insurer: '東京海上日動', insuredPersonId: 'p_c4_head', monthlyPremium: 7200, memo: '弁護士費用特約付' },
    ],
    needsAnalysisDone: true,
    illustrationProvided: true,
    nextAction: '申込書の回収',
    nextActionDate: f(2),
    stageHistory: [
      { stage: 'approach', changedAt: d(20) + 'T09:00:00', changedByUserId: 'u1' },
      { stage: 'proposal', changedAt: d(7) + 'T10:00:00', changedByUserId: 'u1' },
      { stage: 'negotiation', changedAt: d(4) + 'T10:00:00', changedByUserId: 'u1' },
      { stage: 'application', changedAt: d(1) + 'T10:00:00', changedByUserId: 'u1', note: '申込意向確認済み' },
    ],
    memo: '7月更新案件',
    tags: ['自動車保険', '更新'],
    expectedCloseDate: f(5),
  }),

  // c6: 鈴木 花代 — 生命保険 見直し (approach ステージ)
  mkOpp('opp4', 'c6', 'u2', '鈴木家 生命保険 見直し', 'approach', 'open', {
    targetPersonIds: ['p_c6_head'],
    productCategories: ['life'],
    needsAnalysisDone: false,
    illustrationProvided: false,
    nextAction: '家族構成ヒアリング',
    nextActionDate: f(7),
    stageHistory: [
      { stage: 'approach', changedAt: d(5) + 'T09:00:00', changedByUserId: 'u2', note: '既存顧客からの紹介で接触' },
    ],
    memo: '子供3人の保障見直し',
    tags: ['生命保険', '見直し'],
    expectedCloseDate: f(60),
  }),

  // c8: 高橋 誠 — 自動車保険 (fact_finding ステージ)
  mkOpp('opp5', 'c8', 'u1', '高橋家 自動車保険 新規', 'fact_finding', 'open', {
    targetPersonIds: ['p_c8_head'],
    productCategories: ['auto'],
    needsAnalysisDone: false,
    illustrationProvided: false,
    nextAction: '現在の保険内容確認',
    nextActionDate: f(5),
    stageHistory: [
      { stage: 'approach', changedAt: d(15) + 'T09:00:00', changedByUserId: 'u1' },
      { stage: 'fact_finding', changedAt: d(7) + 'T10:00:00', changedByUserId: 'u1', note: '紹介案件、前向きな雰囲気' },
    ],
    memo: '紹介案件。家族全員分の保険を見直したい意向',
    tags: ['見込み', '自動車'],
    expectedCloseDate: f(30),
  }),

  // c10: 伊藤 幸子 — 医療保険 (needs_analysis ステージ)
  mkOpp('opp6', 'c10', 'u3', '伊藤家 医療保険 検討', 'needs_analysis', 'open', {
    targetPersonIds: ['p_c10_head'],
    productCategories: ['medical', 'cancer'],
    needsAnalysisDone: false,
    illustrationProvided: false,
    nextAction: 'ニーズ分析シート記入',
    nextActionDate: f(10),
    stageHistory: [
      { stage: 'approach', changedAt: d(25) + 'T09:00:00', changedByUserId: 'u3' },
      { stage: 'fact_finding', changedAt: d(15) + 'T10:00:00', changedByUserId: 'u3' },
      { stage: 'needs_analysis', changedAt: d(7) + 'T10:00:00', changedByUserId: 'u3', note: 'がんへの関心高い' },
    ],
    memo: 'がん特約への関心が高い。母親がガン経験者',
    tags: ['医療保険', 'がん保険'],
    expectedCloseDate: f(45),
  }),

  // c1: GILSON — 受注案件 (issued / won)
  mkOpp('opp7', 'c1', 'u1', 'GILSON家 自動車保険 受注', 'issued', 'won', {
    targetPersonIds: ['p_c1_head'],
    productCategories: ['auto'],
    proposalProducts: [
      { id: 'pp5', productCategory: 'auto', productName: 'タフ・くるまの保険', insurer: '東京海上日動', insuredPersonId: 'p_c1_head', monthlyPremium: 8900, memo: '弁護士費用特約+車両保険' },
    ],
    needsAnalysisDone: true,
    illustrationProvided: true,
    stageHistory: [
      { stage: 'approach', changedAt: d(60) + 'T09:00:00', changedByUserId: 'u1' },
      { stage: 'proposal', changedAt: d(45) + 'T10:00:00', changedByUserId: 'u1' },
      { stage: 'application', changedAt: d(30) + 'T10:00:00', changedByUserId: 'u1' },
      { stage: 'underwriting', changedAt: d(25) + 'T10:00:00', changedByUserId: 'u1' },
      { stage: 'issued', changedAt: d(14) + 'T10:00:00', changedByUserId: 'u1', note: '証券発行完了' },
    ],
    memo: '継続更新を確保',
    tags: ['自動車保険', '受注済み'],
    actualCloseDate: d(14),
  }),

  // c2: 齋藤 — 失注案件
  mkOpp('opp8', 'c2', 'u1', '齋藤家 生命保険 (失注)', 'lost', 'lost', {
    targetPersonIds: ['p_c2_head'],
    productCategories: ['life'],
    needsAnalysisDone: true,
    illustrationProvided: true,
    stageHistory: [
      { stage: 'approach', changedAt: d(90) + 'T09:00:00', changedByUserId: 'u1' },
      { stage: 'proposal', changedAt: d(60) + 'T10:00:00', changedByUserId: 'u1' },
      { stage: 'negotiation', changedAt: d(45) + 'T10:00:00', changedByUserId: 'u1' },
      { stage: 'lost', changedAt: d(30) + 'T10:00:00', changedByUserId: 'u1', note: '他社に決まった' },
    ],
    lostReason: 'competitor',
    lostReasonDetail: '他社代理店からより安い見積もりが出た',
    memo: '',
    tags: [],
    actualCloseDate: d(30),
  }),

  // c3: 暁和化学ゴム — 法人 火災保険 (underwriting)
  mkOpp('opp9', 'c3', 'u1', '暁和化学ゴム 工場火災保険', 'underwriting', 'open', {
    productCategories: ['fire'],
    proposalProducts: [
      { id: 'pp6', productCategory: 'fire', productName: '企業総合保険', insurer: '損保ジャパン', insuredPersonId: '', monthlyPremium: 45000, faceAmount: 200000000, memo: '工場・在庫一式' },
    ],
    needsAnalysisDone: true,
    illustrationProvided: true,
    nextAction: '査定結果待ち',
    nextActionDate: f(14),
    stageHistory: [
      { stage: 'approach', changedAt: d(40) + 'T09:00:00', changedByUserId: 'u1' },
      { stage: 'fact_finding', changedAt: d(30) + 'T10:00:00', changedByUserId: 'u1' },
      { stage: 'needs_analysis', changedAt: d(21) + 'T10:00:00', changedByUserId: 'u1' },
      { stage: 'proposal', changedAt: d(14) + 'T10:00:00', changedByUserId: 'u1' },
      { stage: 'application', changedAt: d(7) + 'T10:00:00', changedByUserId: 'u1' },
      { stage: 'underwriting', changedAt: d(3) + 'T10:00:00', changedByUserId: 'u1', note: '申込書提出済み、査定待ち' },
    ],
    memo: '山田部長承認済み',
    tags: ['法人', '火災保険'],
    expectedCloseDate: f(21),
  }),

  // c6: 鈴木 — 学資保険 (fact_finding)
  mkOpp('opp10', 'c6', 'u2', '鈴木家 学資保険 検討', 'fact_finding', 'open', {
    targetPersonIds: ['p_c6_head'],
    productCategories: ['savings'],
    needsAnalysisDone: false,
    illustrationProvided: false,
    nextAction: '子供の年齢・学費計画確認',
    nextActionDate: f(10),
    stageHistory: [
      { stage: 'approach', changedAt: d(10) + 'T09:00:00', changedByUserId: 'u2' },
      { stage: 'fact_finding', changedAt: d(3) + 'T10:00:00', changedByUserId: 'u2', note: '学費への不安あり' },
    ],
    memo: '小学生3名分の学費積み立て',
    tags: ['学資保険', '積立'],
    expectedCloseDate: f(60),
  }),

  // c4: 水野 — 生命保険 (approach)
  mkOpp('opp11', 'c4', 'u1', '水野家 生命保険 初回アプローチ', 'approach', 'open', {
    targetPersonIds: ['p_c4_head'],
    productCategories: ['life'],
    needsAnalysisDone: false,
    illustrationProvided: false,
    nextAction: '初回面談のアポ取得',
    nextActionDate: f(14),
    stageHistory: [
      { stage: 'approach', changedAt: d(2) + 'T09:00:00', changedByUserId: 'u1', note: '自動車更新時に生命保険の興味を確認' },
    ],
    memo: '自動車保険更新ついでに生命保険も提案',
    tags: ['生命保険', '新規'],
    expectedCloseDate: f(90),
  }),
];

// =====================================================
// Policy (保険契約) シードデータ — Phase 3
// =====================================================
let _policyIdCounter = 1;
const pid = () => `pol_${String(_policyIdCounter++).padStart(3, '0')}`;
let _covIdCounter = 1;
const cid = () => `cov_${String(_covIdCounter++).padStart(3, '0')}`;

function mkPolicy(
  id: string,
  overrides: Partial<Policy> & {
    householdId: string;
    ownerId: string;
    contractorPersonId: string;
    insurer: string;
    productName: string;
    productCategory: Policy['productCategory'];
    status: Policy['status'];
    monthlyPremium: number;
    startDate: string;
  }
): Policy {
  return {
    id,
    policyNumber: undefined,
    insuredPersonIds: [overrides.contractorPersonId],
    payMode: 'monthly',
    hasCashValue: false,
    coverages: [],
    tags: [],
    memo: '',
    createdAt: _now,
    updatedAt: _now,
    ...overrides,
  };
}

function mkCoverage(
  id: string,
  policyId: string,
  overrides: Partial<Coverage> & {
    type: Coverage['type'];
    label: string;
    insuredPersonId: string;
    isMain: boolean;
  }
): Coverage {
  return {
    id,
    policyId,
    unit: 'JPY',
    memo: '',
    ...overrides,
  };
}

// ── c1: KOORO GILSON 世帯 ────────────────────────────
const pol1 = mkPolicy(pid(), {
  householdId: 'c1', ownerId: 'u1',
  contractorPersonId: 'p_c1_head',
  insuredPersonIds: ['p_c1_head'],
  insurer: '日本生命',
  productName: 'ニッセイ終身保険',
  productCategory: 'life',
  status: 'inforce',
  policyNumber: 'L-0001234',
  startDate: '2018-04-01',
  maturityDate: '2058-04-01',
  monthlyPremium: 28000,
  payMode: 'monthly',
  hasCashValue: true,
  cashValue: 1200000,
  tags: ['生命保険', '終身'],
  memo: '死亡保険金3000万。受取人: 配偶者',
});
pol1.coverages = [
  mkCoverage(cid(), pol1.id, {
    type: 'death', label: '死亡保険金', insuredPersonId: 'p_c1_head', isMain: true,
    faceAmount: 30000000, unit: 'JPY', beneficiaryPersonId: 'p_c1_spouse',
  }),
  mkCoverage(cid(), pol1.id, {
    type: 'living_benefit', label: '生前給付特約', insuredPersonId: 'p_c1_head', isMain: false,
    faceAmount: 30000000, unit: 'JPY', riderName: '生前給付特約',
  }),
];

const pol2 = mkPolicy(pid(), {
  householdId: 'c1', ownerId: 'u1',
  contractorPersonId: 'p_c1_head',
  insuredPersonIds: ['p_c1_spouse'],
  insurer: '第一生命',
  productName: 'ファインセーブ 医療保険',
  productCategory: 'medical',
  status: 'inforce',
  policyNumber: 'M-0005678',
  startDate: '2019-07-01',
  monthlyPremium: 4500,
  payMode: 'monthly',
  hasCashValue: false,
  tags: ['医療保険'],
  memo: '妻の医療保険。入院日額5000円',
});
pol2.coverages = [
  mkCoverage(cid(), pol2.id, {
    type: 'medical_hospital', label: '入院給付金日額', insuredPersonId: 'p_c1_spouse', isMain: true,
    unitAmount: 5000, unit: 'day',
  }),
  mkCoverage(cid(), pol2.id, {
    type: 'medical_surgery', label: '手術給付金', insuredPersonId: 'p_c1_spouse', isMain: false,
    unitAmount: 50000, unit: 'time', riderName: '手術特約',
  }),
];

const pol3 = mkPolicy(pid(), {
  householdId: 'c1', ownerId: 'u1',
  contractorPersonId: 'p_c1_head',
  insuredPersonIds: ['p_c1_child1'],
  insurer: '明治安田生命',
  productName: 'じぶんの積立 学資保険',
  productCategory: 'savings',
  status: 'inforce',
  policyNumber: 'S-0009012',
  startDate: '2016-09-01',
  maturityDate: '2023-04-01',
  monthlyPremium: 12000,
  payMode: 'monthly',
  hasCashValue: true,
  cashValue: 800000,
  tags: ['学資保険', '積立'],
  memo: '長男 大学入学時満期。満期金200万',
});
pol3.coverages = [
  mkCoverage(cid(), pol3.id, {
    type: 'savings', label: '満期保険金', insuredPersonId: 'p_c1_child1', isMain: true,
    faceAmount: 2000000, unit: 'JPY',
  }),
];

// c1 自動車保険 (opp7 から発行済)
const pol4 = mkPolicy(pid(), {
  householdId: 'c1', ownerId: 'u1',
  contractorPersonId: 'p_c1_head',
  insuredPersonIds: ['p_c1_head'],
  insurer: '東京海上日動',
  productName: 'タフ・くるまの保険',
  productCategory: 'auto',
  status: 'inforce',
  policyNumber: 'A-0011111',
  startDate: d(14),
  renewalDate: f(351),
  monthlyPremium: 8900,
  payMode: 'annual',
  annualPremium: 106800,
  hasCashValue: false,
  sourceOpportunityId: 'opp7',
  tags: ['自動車保険'],
  memo: '弁護士費用特約+車両保険',
});
pol4.coverages = [
  mkCoverage(cid(), pol4.id, {
    type: 'liability', label: '対人・対物賠償', insuredPersonId: 'p_c1_head', isMain: true,
  }),
  mkCoverage(cid(), pol4.id, {
    type: 'asset_damage', label: '車両保険', insuredPersonId: 'p_c1_head', isMain: false,
    faceAmount: 1800000, unit: 'JPY', riderName: '車両保険',
  }),
];

// ── c2: 齋藤 和久 世帯 ─────────────────────────────
const pol5 = mkPolicy(pid(), {
  householdId: 'c2', ownerId: 'u1',
  contractorPersonId: 'p_c2_head',
  insuredPersonIds: ['p_c2_head'],
  insurer: '住友生命',
  productName: '終身保険 スミセイ',
  productCategory: 'life',
  status: 'paid_up',
  policyNumber: 'L-0022334',
  startDate: '1998-06-01',
  maturityDate: '2048-06-01',
  monthlyPremium: 0,
  payMode: 'lump_sum',
  premiumPaidUntil: '2023-06-01',
  payPeriodYears: 25,
  hasCashValue: true,
  cashValue: 3500000,
  tags: ['終身保険', '払済'],
  memo: '払込完了。解約返戻金350万',
});
pol5.coverages = [
  mkCoverage(cid(), pol5.id, {
    type: 'death', label: '死亡保険金', insuredPersonId: 'p_c2_head', isMain: true,
    faceAmount: 10000000, unit: 'JPY',
  }),
];

const pol6 = mkPolicy(pid(), {
  householdId: 'c2', ownerId: 'u1',
  contractorPersonId: 'p_c2_head',
  insuredPersonIds: ['p_c2_head'],
  insurer: 'あいおいニッセイ同和',
  productName: 'タフ・くるまの保険',
  productCategory: 'auto',
  status: 'inforce',
  policyNumber: 'A-0022222',
  startDate: d(180),
  renewalDate: f(185),
  monthlyPremium: 7200,
  payMode: 'annual',
  annualPremium: 86400,
  hasCashValue: false,
  tags: ['自動車保険'],
  memo: '',
});
pol6.coverages = [
  mkCoverage(cid(), pol6.id, {
    type: 'liability', label: '対人・対物賠償', insuredPersonId: 'p_c2_head', isMain: true,
  }),
];

// ── c3: 暁和化学ゴム (法人) ─────────────────────────
const pol7 = mkPolicy(pid(), {
  householdId: 'c3', ownerId: 'u1',
  contractorPersonId: 'p_c3_head',
  insuredPersonIds: ['p_c3_head'],
  insurer: '損保ジャパン',
  productName: '企業総合保険 (工場火災)',
  productCategory: 'fire',
  status: 'inforce',
  policyNumber: 'F-0033333',
  startDate: '2024-04-01',
  renewalDate: f(295),
  monthlyPremium: 38000,
  payMode: 'annual',
  annualPremium: 456000,
  hasCashValue: false,
  tags: ['法人', '火災保険'],
  memo: '工場・在庫一式。山田部長承認済み',
});
pol7.coverages = [
  mkCoverage(cid(), pol7.id, {
    type: 'asset_damage', label: '建物・設備損害', insuredPersonId: 'p_c3_head', isMain: true,
    faceAmount: 200000000, unit: 'JPY',
  }),
];

const pol8 = mkPolicy(pid(), {
  householdId: 'c3', ownerId: 'u1',
  contractorPersonId: 'p_c3_head',
  insuredPersonIds: ['p_c3_head'],
  insurer: '第一生命',
  productName: '経営者保険 プレミア',
  productCategory: 'life',
  status: 'inforce',
  policyNumber: 'L-0033444',
  startDate: '2022-10-01',
  maturityDate: '2042-10-01',
  monthlyPremium: 65000,
  payMode: 'monthly',
  hasCashValue: true,
  cashValue: 5200000,
  tags: ['法人', '経営者保険'],
  memo: '役員退職金積立。解約返戻金型',
});
pol8.coverages = [
  mkCoverage(cid(), pol8.id, {
    type: 'death', label: '死亡保険金', insuredPersonId: 'p_c3_head', isMain: true,
    faceAmount: 50000000, unit: 'JPY',
  }),
  mkCoverage(cid(), pol8.id, {
    type: 'savings', label: '解約返戻金', insuredPersonId: 'p_c3_head', isMain: false,
    memo: '退職金積立目的',
  }),
];

// ── c6: 鈴木 花代 世帯 ─────────────────────────────
const pol9 = mkPolicy(pid(), {
  householdId: 'c6', ownerId: 'u2',
  contractorPersonId: 'p_c6_head',
  insuredPersonIds: ['p_c6_head'],
  insurer: 'アフラック',
  productName: 'EVER PRIME 医療保険',
  productCategory: 'medical',
  status: 'inforce',
  policyNumber: 'M-0066001',
  startDate: '2020-03-01',
  monthlyPremium: 6800,
  payMode: 'monthly',
  hasCashValue: false,
  tags: ['医療保険'],
  memo: '看護師なので手厚い保障',
});
pol9.coverages = [
  mkCoverage(cid(), pol9.id, {
    type: 'medical_hospital', label: '入院給付金日額', insuredPersonId: 'p_c6_head', isMain: true,
    unitAmount: 10000, unit: 'day',
  }),
  mkCoverage(cid(), pol9.id, {
    type: 'cancer', label: 'がん診断一時金', insuredPersonId: 'p_c6_head', isMain: false,
    faceAmount: 1000000, unit: 'JPY', riderName: 'がん特約',
  }),
  mkCoverage(cid(), pol9.id, {
    type: 'medical_surgery', label: '手術給付金', insuredPersonId: 'p_c6_head', isMain: false,
    unitAmount: 50000, unit: 'time', riderName: '手術特約',
  }),
];

// ── c8: 高橋 誠 (見込み案件 → pending 契約) ──────────
const pol10 = mkPolicy(pid(), {
  householdId: 'c8', ownerId: 'u1',
  contractorPersonId: 'p_c8_head',
  insuredPersonIds: ['p_c8_head'],
  insurer: 'ソニー生命',
  productName: 'スマート医療保険',
  productCategory: 'medical',
  status: 'pending',
  startDate: d(5),
  monthlyPremium: 3200,
  payMode: 'monthly',
  hasCashValue: false,
  tags: ['医療保険', '申込中'],
  memo: '申込書提出済み。査定中',
});
pol10.coverages = [
  mkCoverage(cid(), pol10.id, {
    type: 'medical_hospital', label: '入院給付金日額', insuredPersonId: 'p_c8_head', isMain: true,
    unitAmount: 5000, unit: 'day',
  }),
];

// ── c10: 伊藤 幸子 ──────────────────────────────────
const pol11 = mkPolicy(pid(), {
  householdId: 'c10', ownerId: 'u3',
  contractorPersonId: 'p_c10_head',
  insuredPersonIds: ['p_c10_head'],
  insurer: 'かんぽ生命',
  productName: 'かんぽ 特別養老保険',
  productCategory: 'medical',
  status: 'inforce',
  policyNumber: 'K-0010101',
  startDate: '2010-05-01',
  maturityDate: '2030-05-01',
  monthlyPremium: 8500,
  payMode: 'monthly',
  hasCashValue: true,
  cashValue: 1100000,
  tags: ['養老保険', '入院'],
  memo: '高齢者向け。入院保障付き',
});
pol11.coverages = [
  mkCoverage(cid(), pol11.id, {
    type: 'death', label: '死亡保険金', insuredPersonId: 'p_c10_head', isMain: true,
    faceAmount: 2000000, unit: 'JPY',
  }),
  mkCoverage(cid(), pol11.id, {
    type: 'medical_hospital', label: '入院給付金日額', insuredPersonId: 'p_c10_head', isMain: false,
    unitAmount: 4500, unit: 'day', riderName: '入院特約',
  }),
];

// ── c4: 水野 幸重 ────────────────────────────────────
const pol12 = mkPolicy(pid(), {
  householdId: 'c4', ownerId: 'u1',
  contractorPersonId: 'p_c4_head',
  insuredPersonIds: ['p_c4_head'],
  insurer: 'チューリッヒ',
  productName: 'チューリッヒ 自動車保険',
  productCategory: 'auto',
  status: 'inforce',
  policyNumber: 'A-0044444',
  startDate: d(90),
  renewalDate: f(275),
  monthlyPremium: 6500,
  payMode: 'annual',
  annualPremium: 78000,
  hasCashValue: false,
  tags: ['自動車保険'],
  memo: '',
});
pol12.coverages = [
  mkCoverage(cid(), pol12.id, {
    type: 'liability', label: '対人・対物賠償', insuredPersonId: 'p_c4_head', isMain: true,
  }),
];

// c1: 追加 — がん保険 (pending: opp5 から発行想定)
const pol13 = mkPolicy(pid(), {
  householdId: 'c1', ownerId: 'u1',
  contractorPersonId: 'p_c1_head',
  insuredPersonIds: ['p_c1_head'],
  insurer: 'メットライフ生命',
  productName: 'フレキシィ がん保険',
  productCategory: 'cancer',
  status: 'pending',
  startDate: d(3),
  monthlyPremium: 4200,
  payMode: 'monthly',
  hasCashValue: false,
  sourceOpportunityId: 'opp5',
  tags: ['がん保険', '申込中'],
  memo: '申込中。告知中',
});
pol13.coverages = [
  mkCoverage(cid(), pol13.id, {
    type: 'cancer', label: 'がん診断一時金', insuredPersonId: 'p_c1_head', isMain: true,
    faceAmount: 2000000, unit: 'JPY',
  }),
];

// c2: 医療保険
const pol14 = mkPolicy(pid(), {
  householdId: 'c2', ownerId: 'u1',
  contractorPersonId: 'p_c2_head',
  insuredPersonIds: ['p_c2_head'],
  insurer: '東京海上日動あんしん生命',
  productName: '医療保険 スーパーがん',
  productCategory: 'cancer',
  status: 'inforce',
  policyNumber: 'C-0022001',
  startDate: '2015-01-01',
  monthlyPremium: 5200,
  payMode: 'monthly',
  hasCashValue: false,
  tags: ['がん保険'],
  memo: '喫煙者のため保険料高め',
});
pol14.coverages = [
  mkCoverage(cid(), pol14.id, {
    type: 'cancer', label: 'がん入院給付金日額', insuredPersonId: 'p_c2_head', isMain: true,
    unitAmount: 10000, unit: 'day',
  }),
];

// c3: 賠償責任保険
const pol15 = mkPolicy(pid(), {
  householdId: 'c3', ownerId: 'u1',
  contractorPersonId: 'p_c3_head',
  insuredPersonIds: ['p_c3_head'],
  insurer: '東京海上日動',
  productName: '生産物賠償責任保険 (PL保険)',
  productCategory: 'liability',
  status: 'inforce',
  policyNumber: 'B-0033001',
  startDate: '2023-04-01',
  renewalDate: f(295),
  monthlyPremium: 22000,
  payMode: 'annual',
  annualPremium: 264000,
  hasCashValue: false,
  tags: ['法人', '賠償責任'],
  memo: 'PL保険。ゴム製品製造',
});
pol15.coverages = [
  mkCoverage(cid(), pol15.id, {
    type: 'liability', label: '賠償保険金', insuredPersonId: 'p_c3_head', isMain: true,
    faceAmount: 100000000, unit: 'JPY',
  }),
];

export const POLICIES: Policy[] = [
  pol1, pol2, pol3, pol4, pol5, pol6, pol7, pol8,
  pol9, pol10, pol11, pol12, pol13, pol14, pol15,
];

export const POLICY_STATUS_HISTORY: PolicyStatusHistory[] = [
  { id: 'ph_001', policyId: pol1.id, status: 'inforce', changedAt: '2018-04-01T00:00:00.000Z', changedByUserId: 'u1', note: '契約発行' },
  { id: 'ph_002', policyId: pol5.id, status: 'paid_up', changedAt: '2023-06-01T00:00:00.000Z', changedByUserId: 'u1', note: '払込期間終了' },
  { id: 'ph_003', policyId: pol10.id, status: 'pending', changedAt: d(5) + 'T10:00:00.000Z', changedByUserId: 'u1', note: '申込書提出' },
  { id: 'ph_004', policyId: pol13.id, status: 'pending', changedAt: d(3) + 'T10:00:00.000Z', changedByUserId: 'u1', note: '申込書提出・告知中' },
];
