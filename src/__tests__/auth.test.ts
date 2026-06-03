// =====================================================
// auth.test.ts - 認証・パスワード変更・セッション失効
// =====================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, AUTH_STORAGE_KEY, AUTH_SESSION_TTL_MS, DEFAULT_DEMO_PASSWORD } from '../store';

function resetStoreState() {
  localStorage.clear();
  useAppStore.getState().resetAll();
  useAppStore.getState().logout();
}

describe('AUTH-1: ログイン / ログアウト', () => {
  beforeEach(resetStoreState);

  it('初期状態は未認証である', () => {
    expect(useAppStore.getState().authSession).toBeNull();
    expect(useAppStore.getState().isAuthenticated()).toBe(false);
  });

  it('正しいメール+パスワードでログインできる', () => {
    const result = useAppStore.getState().login('hakuta@example.com', DEFAULT_DEMO_PASSWORD);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe('u1');
      expect(useAppStore.getState().authSession?.userId).toBe('u1');
      expect(useAppStore.getState().currentRole).toBe('general');
      expect(useAppStore.getState().isAuthenticated()).toBe(true);
    }
  });

  it('メールアドレスは大文字小文字を区別しない', () => {
    const result = useAppStore.getState().login('HAKUTA@Example.COM', DEFAULT_DEMO_PASSWORD);
    expect(result.ok).toBe(true);
  });

  it('存在しないメールアドレスでは失敗する', () => {
    const result = useAppStore.getState().login('nonexistent@example.com', DEFAULT_DEMO_PASSWORD);
    expect(result.ok).toBe(false);
    expect(useAppStore.getState().authSession).toBeNull();
  });

  it('パスワードが間違っていれば失敗する', () => {
    const result = useAppStore.getState().login('hakuta@example.com', 'wrong-password');
    expect(result.ok).toBe(false);
    expect(useAppStore.getState().authSession).toBeNull();
  });

  it('無効化されたユーザーはログインできない', () => {
    useAppStore.getState().updateUser('u1', { status: 'inactive' });
    const result = useAppStore.getState().login('hakuta@example.com', DEFAULT_DEMO_PASSWORD);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('無効化');
  });

  it('上長メールでログインすると currentRole が manager になる', () => {
    const result = useAppStore.getState().login('sato@example.com', DEFAULT_DEMO_PASSWORD);
    expect(result.ok).toBe(true);
    expect(useAppStore.getState().currentRole).toBe('manager');
    expect(useAppStore.getState().currentUserId).toBe('u4');
  });

  it('ログアウトで authSession が null になる', () => {
    useAppStore.getState().loginAsUser('u1');
    expect(useAppStore.getState().isAuthenticated()).toBe(true);
    useAppStore.getState().logout();
    expect(useAppStore.getState().authSession).toBeNull();
    expect(useAppStore.getState().isAuthenticated()).toBe(false);
  });
});

describe('AUTH-2: セッション永続化 (localStorage)', () => {
  beforeEach(resetStoreState);

  it('ログインで localStorage にセッションが保存される', () => {
    useAppStore.getState().loginAsUser('u1');
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const session = JSON.parse(raw!);
    expect(session.userId).toBe('u1');
    expect(session.expiresAt).toBeDefined();
  });

  it('ログアウトで localStorage がクリアされる', () => {
    useAppStore.getState().loginAsUser('u1');
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
    useAppStore.getState().logout();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});

describe('AUTH-3: パスワード変更', () => {
  beforeEach(resetStoreState);

  it('正しい現在のパスワードで変更できる', () => {
    const result = useAppStore.getState().changePassword('u1', DEFAULT_DEMO_PASSWORD, 'newpass1');
    expect(result.ok).toBe(true);

    // 新しいパスワードでログインできる
    const login = useAppStore.getState().login('hakuta@example.com', 'newpass1');
    expect(login.ok).toBe(true);

    // 古いパスワードはもう使えない
    useAppStore.getState().logout();
    const oldLogin = useAppStore.getState().login('hakuta@example.com', DEFAULT_DEMO_PASSWORD);
    expect(oldLogin.ok).toBe(false);
  });

  it('現在のパスワードが違うと拒否される', () => {
    const result = useAppStore.getState().changePassword('u1', 'wrong', 'newpass1');
    expect(result.ok).toBe(false);
  });

  it('新しいパスワードが 4 文字未満だと拒否される', () => {
    const result = useAppStore.getState().changePassword('u1', DEFAULT_DEMO_PASSWORD, 'ab');
    expect(result.ok).toBe(false);
  });

  it('新しいパスワードが現在と同じだと拒否される', () => {
    const result = useAppStore.getState().changePassword('u1', DEFAULT_DEMO_PASSWORD, DEFAULT_DEMO_PASSWORD);
    expect(result.ok).toBe(false);
  });
});

describe('AUTH-4: セッション TTL とタッチ', () => {
  beforeEach(resetStoreState);

  it('セッションは 30 分の有効期限を持つ', () => {
    useAppStore.getState().loginAsUser('u1');
    const s = useAppStore.getState().authSession!;
    const diff = new Date(s.expiresAt).getTime() - new Date(s.loginAt).getTime();
    expect(diff).toBe(AUTH_SESSION_TTL_MS);
  });

  it('touchSession で expiresAt が延長される', async () => {
    useAppStore.getState().loginAsUser('u1');
    const before = useAppStore.getState().authSession!.expiresAt;
    await new Promise(r => setTimeout(r, 5));
    useAppStore.getState().touchSession();
    const after = useAppStore.getState().authSession!.expiresAt;
    expect(new Date(after).getTime()).toBeGreaterThan(new Date(before).getTime());
  });

  it('期限切れセッションは isAuthenticated() で false になり logout される', () => {
    useAppStore.getState().loginAsUser('u1');
    // 期限切れに改竄
    const expired = {
      ...useAppStore.getState().authSession!,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    useAppStore.setState({ authSession: expired });
    expect(useAppStore.getState().isAuthenticated()).toBe(false);
    expect(useAppStore.getState().authSession).toBeNull();
  });
});

describe('AUTH-5: ログイン時の lastLogin 更新', () => {
  beforeEach(resetStoreState);

  it('ログインで users[].lastLogin が現在時刻で更新される', () => {
    const before = useAppStore.getState().users.find(u => u.id === 'u1')!.lastLogin;
    useAppStore.getState().loginAsUser('u1');
    const after = useAppStore.getState().users.find(u => u.id === 'u1')!.lastLogin;
    expect(after).not.toBe(before);
    expect(new Date(after!).getTime()).toBeGreaterThan(0);
  });
});
