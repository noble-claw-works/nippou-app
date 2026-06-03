// =====================================================
// 認証セッション関連の定義とヘルパー
// =====================================================

export interface AuthSession {
  userId: string;
  email: string;
  loginAt: string;     // ISO
  expiresAt: string;   // ISO
}

export const AUTH_STORAGE_KEY = 'nippou.auth.v1';
export const AUTH_SESSION_TTL_MS = 30 * 60 * 1000; // 30 分無操作で失効
// デモ用・全ユーザ共通パスワード。ユーザ個別 password は store の passwords マップで上書き可能。
export const DEFAULT_DEMO_PASSWORD = 'demo';

export function loadAuthSession(): AuthSession | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as AuthSession;
    if (!s || typeof s.userId !== 'string' || !s.expiresAt) return null;
    if (new Date(s.expiresAt).getTime() < Date.now()) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function persistAuthSession(s: AuthSession | null) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (s) window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
}
