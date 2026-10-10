// =====================================================
// roleSwitch.test.ts
// E-9: ロール切替永続化 — リロードでロール選択が戻るバグ修正
// =====================================================
import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadRoleSwitch,
  persistRoleSwitch,
  ROLE_SWITCH_STORAGE_KEY,
  USER_SWITCH_STORAGE_KEY,
} from '../store/auth';
import { useAppStore } from '../store';

function resetStoreState() {
  localStorage.clear();
  useAppStore.getState().resetAll();
  useAppStore.getState().logout();
}

describe('E-9-1: loadRoleSwitch / persistRoleSwitch 単体', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('localStorage が空のとき null を返す', () => {
    expect(loadRoleSwitch()).toBeNull();
  });

  it('role のみの場合 null を返す', () => {
    localStorage.setItem(ROLE_SWITCH_STORAGE_KEY, 'manager');
    expect(loadRoleSwitch()).toBeNull();
  });

  it('persistRoleSwitch で保存した値を loadRoleSwitch で取得できる', () => {
    persistRoleSwitch('manager', 'u4');
    const result = loadRoleSwitch();
    expect(result).not.toBeNull();
    expect(result!.role).toBe('manager');
    expect(result!.userId).toBe('u4');
  });

  it('persistRoleSwitch(null, null) でキーが削除される', () => {
    persistRoleSwitch('executive', 'u5');
    expect(localStorage.getItem(ROLE_SWITCH_STORAGE_KEY)).toBe('executive');
    persistRoleSwitch(null, null);
    expect(localStorage.getItem(ROLE_SWITCH_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(USER_SWITCH_STORAGE_KEY)).toBeNull();
    expect(loadRoleSwitch()).toBeNull();
  });

  it('各ロールを保存して正しく読み出せる', () => {
    const cases: Array<[import('../types').Role, string]> = [
      ['general', 'u1'],
      ['manager', 'u4'],
      ['executive', 'u5'],
      ['admin', 'u6'],
    ];
    for (const [role, userId] of cases) {
      persistRoleSwitch(role, userId);
      const result = loadRoleSwitch();
      expect(result).toEqual({ role, userId });
    }
  });
});

describe('E-9-2: setRole で localStorage に保存される', () => {
  beforeEach(resetStoreState);

  it('setRole("manager") 後 localStorage に manager が保存される', () => {
    useAppStore.getState().setRole('manager');
    expect(localStorage.getItem(ROLE_SWITCH_STORAGE_KEY)).toBe('manager');
    expect(localStorage.getItem(USER_SWITCH_STORAGE_KEY)).toBe('u4');
  });

  it('setRole("executive") 後 localStorage に executive が保存される', () => {
    useAppStore.getState().setRole('executive');
    expect(localStorage.getItem(ROLE_SWITCH_STORAGE_KEY)).toBe('executive');
    expect(localStorage.getItem(USER_SWITCH_STORAGE_KEY)).toBe('u5');
  });

  it('setRole("admin") 後 localStorage に admin が保存される', () => {
    useAppStore.getState().setRole('admin');
    expect(localStorage.getItem(ROLE_SWITCH_STORAGE_KEY)).toBe('admin');
    expect(localStorage.getItem(USER_SWITCH_STORAGE_KEY)).toBe('u6');
  });

  it('setRole 後に store の currentRole / currentUserId が更新される', () => {
    useAppStore.getState().setRole('manager');
    expect(useAppStore.getState().currentRole).toBe('manager');
    expect(useAppStore.getState().currentUserId).toBe('u4');
  });
});

describe('E-9-3: login / logout 時の localStorage クリア', () => {
  beforeEach(resetStoreState);

  it('loginAsUser 実行後ロール切替記録がクリアされる', () => {
    // 事前にロール切替を永続化
    useAppStore.getState().setRole('executive');
    expect(localStorage.getItem(ROLE_SWITCH_STORAGE_KEY)).toBe('executive');
    // ログインするとロール切替記録が消える
    useAppStore.getState().loginAsUser('u1');
    expect(localStorage.getItem(ROLE_SWITCH_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(USER_SWITCH_STORAGE_KEY)).toBeNull();
  });

  it('login() 成功後にロール切替記録がクリアされる', () => {
    useAppStore.getState().setRole('admin');
    expect(localStorage.getItem(ROLE_SWITCH_STORAGE_KEY)).toBe('admin');
    const result = useAppStore.getState().login('kirishima@example.com', 'demo');
    expect(result.ok).toBe(true);
    expect(localStorage.getItem(ROLE_SWITCH_STORAGE_KEY)).toBeNull();
  });

  it('logout 後にロール切替記録がクリアされる', () => {
    useAppStore.getState().setRole('manager');
    expect(localStorage.getItem(ROLE_SWITCH_STORAGE_KEY)).toBe('manager');
    useAppStore.getState().logout();
    expect(localStorage.getItem(ROLE_SWITCH_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(USER_SWITCH_STORAGE_KEY)).toBeNull();
  });
});

describe('E-9-4: resetAll でロール切替記録がクリアされる', () => {
  beforeEach(() => localStorage.clear());

  it('setRole 後 resetAll するとロール切替記録が消える', () => {
    useAppStore.getState().setRole('executive');
    expect(localStorage.getItem(ROLE_SWITCH_STORAGE_KEY)).toBe('executive');
    useAppStore.getState().resetAll();
    expect(localStorage.getItem(ROLE_SWITCH_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(USER_SWITCH_STORAGE_KEY)).toBeNull();
  });

  it('resetAll 後の currentRole は general に戻る', () => {
    useAppStore.getState().setRole('manager');
    useAppStore.getState().resetAll();
    expect(useAppStore.getState().currentRole).toBe('general');
    expect(useAppStore.getState().currentUserId).toBe('u1');
  });
});
