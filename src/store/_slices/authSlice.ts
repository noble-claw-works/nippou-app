// =====================================================
// Auth slice — setRole, login, loginAsUser, logout,
// isAuthenticated, touchSession, changePassword
// =====================================================
import type { StateCreator } from "zustand";
import type { AppState } from "../_internal/types";
import {
  AUTH_SESSION_TTL_MS,
  DEFAULT_DEMO_PASSWORD,
  persistAuthSession,
  persistRoleSwitch,
  type AuthSession,
} from "../auth";
import { uid } from "../_internal/constants";
import type { Role } from "../_internal/types";

export const createAuthSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "setRole"
    | "login"
    | "loginAsUser"
    | "logout"
    | "isAuthenticated"
    | "touchSession"
    | "changePassword"
  >
> = (set, get) => ({
  setRole: (role) => {
    const roleUserMap: Record<Role, string> = {
      general: "u1",
      manager: "u4",
      executive: "u5",
      admin: "u6",
    };
    const userId = roleUserMap[role];
    persistRoleSwitch(role, userId); // E-9: ロール切替を localStorage に永続化
    set({ currentRole: role, currentUserId: userId });
  },

  login: (email, password) => {
    const normalized = (email ?? "").trim().toLowerCase();
    const user = get().users.find((u) => u.email.toLowerCase() === normalized);
    if (!user) {
      return {
        ok: false,
        error: "メールアドレスまたはパスワードが正しくありません",
      };
    }
    if (user.status === "inactive") {
      return { ok: false, error: "このアカウントは無効化されています" };
    }
    const expected = get().passwords[user.id] ?? DEFAULT_DEMO_PASSWORD;
    if (password !== expected) {
      return {
        ok: false,
        error: "メールアドレスまたはパスワードが正しくありません",
      };
    }
    get().loginAsUser(user.id);
    return { ok: true, user };
  },

  loginAsUser: (userId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return;
    const now = new Date();
    const session: AuthSession = {
      userId: user.id,
      email: user.email,
      loginAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + AUTH_SESSION_TTL_MS).toISOString(),
    };
    persistAuthSession(session);
    persistRoleSwitch(null, null); // E-9: ログイン時はロール切替記録をクリア（ログインユーザー本来のロールを優先）
    set((s) => ({
      authSession: session,
      currentRole: user.role,
      currentUserId: user.id,
      // 最終ログインを users に反映
      users: s.users.map((u) =>
        u.id === user.id ? { ...u, lastLogin: session.loginAt } : u,
      ),
    }));
  },

  logout: () => {
    persistAuthSession(null);
    persistRoleSwitch(null, null); // E-9: ログアウト時もロール切替記録をクリア
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
      return { ok: false, error: "現在のパスワードが正しくありません" };
    }
    if (!next || next.length < 4) {
      return {
        ok: false,
        error: "新しいパスワードは 4 文字以上で設定してください",
      };
    }
    if (next === current) {
      return {
        ok: false,
        error: "新しいパスワードは現在のものと異なる必要があります",
      };
    }
    set({ passwords: { ...passwords, [userId]: next } });
    return { ok: true };
  },
});

// suppress unused import warning — uid is used by other slices
void uid;
