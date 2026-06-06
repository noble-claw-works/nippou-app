import { describe, it, expect } from 'vitest';
import type { ManagerComment, ManagerCommentReply } from '../types';

// ─── ManagerComment: 部下→上長コメント機能 ─────────────────────────────────────
describe('ManagerComment: authorRole フィールド', () => {
  it('上長コメント (manager) は authorRole="manager" を持てる', () => {
    const comment: ManagerComment = {
      id: 'c1',
      dayKey: '2026-06-06',
      authorUserId: 'manager-001',
      authorRole: 'manager',
      body: '良い日報でした',
      createdAt: new Date().toISOString(),
      replies: [],
    };
    expect(comment.authorRole).toBe('manager');
  });

  it('部下コメント (general) は authorRole="general" を持てる', () => {
    const comment: ManagerComment = {
      id: 'c2',
      dayKey: '2026-06-06',
      authorUserId: 'general-001',
      authorRole: 'general',
      body: '今日の訪問について補足です',
      createdAt: new Date().toISOString(),
      replies: [],
    };
    expect(comment.authorRole).toBe('general');
  });

  it('authorRole が未設定 (optional) でも後方互換で問題ない', () => {
    const comment: ManagerComment = {
      id: 'c3',
      dayKey: '2026-06-06',
      authorUserId: 'manager-002',
      body: '旧データ形式のコメント',
      createdAt: new Date().toISOString(),
      replies: [],
    };
    expect(comment.authorRole).toBeUndefined();
  });
});

describe('ManagerComment: 部下が自分の日報に上長宛コメントを投稿できる', () => {
  // addManagerComment のロジックをシミュレート
  const createComment = (
    dayKey: string,
    authorUserId: string,
    body: string,
    authorRole?: 'manager' | 'executive' | 'general',
  ): ManagerComment => ({
    id: `id-${Date.now()}`,
    dayKey,
    authorUserId,
    authorRole,
    body,
    createdAt: new Date().toISOString(),
    replies: [],
  });

  it('general ロールでコメントを作成すると authorRole="general" が記録される', () => {
    const comment = createComment('2026-06-06', 'user-001', '確認お願いします', 'general');
    expect(comment.authorRole).toBe('general');
    expect(comment.authorUserId).toBe('user-001');
    expect(comment.body).toBe('確認お願いします');
  });

  it('manager ロールでコメントを作成すると authorRole="manager" が記録される', () => {
    const comment = createComment('2026-06-06', 'mgr-001', 'よく頑張りました', 'manager');
    expect(comment.authorRole).toBe('manager');
  });

  it('executive ロールでコメントを作成すると authorRole="executive" が記録される', () => {
    const comment = createComment('2026-06-06', 'exec-001', '期待しています', 'executive');
    expect(comment.authorRole).toBe('executive');
  });
});

describe('ManagerComment: isMemberComment 判定ロジック (UI 表示区別)', () => {
  // ReportDetailPage の resolvedRole 判定をシミュレート
  const isMemberComment = (
    comment: ManagerComment,
    userRoleMap: Record<string, string>,
  ): boolean => {
    const resolvedRole = comment.authorRole ?? userRoleMap[comment.authorUserId];
    return resolvedRole === 'general';
  };

  const userRoleMap = {
    'general-001': 'general',
    'manager-001': 'manager',
  };

  it('authorRole="general" のコメントは部下コメントと判定される', () => {
    const comment: ManagerComment = {
      id: 'c1', dayKey: '2026-06-06', authorUserId: 'general-001',
      authorRole: 'general', body: '補足です', createdAt: '', replies: [],
    };
    expect(isMemberComment(comment, userRoleMap)).toBe(true);
  });

  it('authorRole="manager" のコメントは上長コメントと判定される', () => {
    const comment: ManagerComment = {
      id: 'c2', dayKey: '2026-06-06', authorUserId: 'manager-001',
      authorRole: 'manager', body: 'コメントです', createdAt: '', replies: [],
    };
    expect(isMemberComment(comment, userRoleMap)).toBe(false);
  });

  it('authorRole が未設定でも userRoleMap でフォールバック判定できる', () => {
    const generalComment: ManagerComment = {
      id: 'c3', dayKey: '2026-06-06', authorUserId: 'general-001',
      body: '旧データ', createdAt: '', replies: [],
    };
    expect(isMemberComment(generalComment, userRoleMap)).toBe(true);

    const managerComment: ManagerComment = {
      id: 'c4', dayKey: '2026-06-06', authorUserId: 'manager-001',
      body: '旧データ', createdAt: '', replies: [],
    };
    expect(isMemberComment(managerComment, userRoleMap)).toBe(false);
  });
});

describe('ManagerComment: replyToManagerComment (YES/NO) は変更なし・後方互換', () => {
  it('YES/NO リプライは choice プロパティのみを持つ', () => {
    const reply: ManagerCommentReply = {
      userId: 'user-001',
      choice: 'yes',
      repliedAt: new Date().toISOString(),
    };
    expect(reply.choice).toBe('yes');
    // 自由テキストフィールドは存在しない (型レベルで保証)
    expect('text' in reply).toBe(false);
    expect('body' in reply).toBe(false);
  });

  it('NO リプライも正しく表現できる', () => {
    const reply: ManagerCommentReply = {
      userId: 'user-002',
      choice: 'no',
      repliedAt: new Date().toISOString(),
    };
    expect(reply.choice).toBe('no');
  });
});
