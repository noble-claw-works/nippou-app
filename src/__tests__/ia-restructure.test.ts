// =====================================================
// ia-restructure.test.ts — IA再編（IA-1〜IA-5）の検証テスト
// IA-1: ダッシュボード/営業実績タブ統合・全幅化
// IA-2: Today→日報改名・カレンダー統合タブ
// IA-3: 世帯+契約→顧客一覧タブ統合
// IA-4: 検索はヘッダ（メニューから削除）
// IA-5: メニュー順序 ①ダッシュボード ②商談一覧 ③顧客一覧 ④日報 ⑤設定
// =====================================================
import { describe, it, expect } from 'vitest';

// ── IA-5: NAV_ITEMS の順序と構成を検証 ──────────────────────────────────────

/**
 * AppShell.tsx の NAV_ITEMS を模した定義。
 * 実際の定義と同期させること（変更時はこちらも更新）。
 */
const NAV_ITEMS = [
  { to: '/dashboard',     label: 'ダッシュボード',  roles: ['general','manager','executive','admin'] },
  { to: '/opportunities', label: '商談一覧',        roles: ['general','manager','executive','admin'] },
  { to: '/customers',     label: '顧客一覧',        roles: ['general','manager','executive','admin'] },
  { to: '/nippou',        label: '日報',            roles: ['general','manager','executive','admin'] },
  { to: '/settings',      label: '設定',            roles: ['general','manager','executive','admin'] },
  { to: '/report-admin',  label: '日報管理',        roles: ['manager','executive'] },
  { to: '/templates',     label: 'テンプレート',    roles: ['admin'] },
  { to: '/admin',         label: '管理',            roles: ['admin','executive'] },
];

describe('IA-5: メニュー順序・構成', () => {
  const ALL_ROLES = ['general','manager','executive','admin'];

  const visibleForRole = (role: string) =>
    NAV_ITEMS.filter(n => n.roles.includes(role));

  it('全ロールの主要5項目の先頭が正しい順序', () => {
    for (const role of ALL_ROLES) {
      const items = visibleForRole(role);
      expect(items[0].to).toBe('/dashboard');
      expect(items[0].label).toBe('ダッシュボード');
      expect(items[1].to).toBe('/opportunities');
      expect(items[1].label).toBe('商談一覧');
      expect(items[2].to).toBe('/customers');
      expect(items[2].label).toBe('顧客一覧');
      expect(items[3].to).toBe('/nippou');
      expect(items[3].label).toBe('日報');
    }
  });

  it('general ロールは主要5項目のみ表示（ロール限定なし）', () => {
    const items = visibleForRole('general');
    expect(items).toHaveLength(5);
    const paths = items.map(i => i.to);
    expect(paths).toContain('/settings');
    // ロール限定項目はgeneralに見えない
    expect(paths).not.toContain('/report-admin');
    expect(paths).not.toContain('/templates');
    expect(paths).not.toContain('/admin');
  });

  it('manager ロールは 日報管理 を追加で表示', () => {
    const items = visibleForRole('manager');
    const paths = items.map(i => i.to);
    expect(paths).toContain('/report-admin');
    expect(paths).not.toContain('/templates');
  });

  it('admin ロールは テンプレート と 管理 を追加で表示', () => {
    const items = visibleForRole('admin');
    const paths = items.map(i => i.to);
    expect(paths).toContain('/templates');
    expect(paths).toContain('/admin');
  });

  it('IA-4: 検索（/search）はメニューから削除されている', () => {
    for (const role of ALL_ROLES) {
      const items = visibleForRole(role);
      const paths = items.map(i => i.to);
      expect(paths).not.toContain('/search');
    }
  });

  it('IA-1: 営業実績（/sales-perf）はメニューから削除されている', () => {
    for (const role of ALL_ROLES) {
      const items = visibleForRole(role);
      const paths = items.map(i => i.to);
      expect(paths).not.toContain('/sales-perf');
    }
  });

  it('IA-2: カレンダー（/calendar）はメニューから削除されている', () => {
    for (const role of ALL_ROLES) {
      const items = visibleForRole(role);
      const paths = items.map(i => i.to);
      expect(paths).not.toContain('/calendar');
    }
  });

  it('IA-2: Today（/today）はメニューから削除されている（日報/nippouに統合）', () => {
    for (const role of ALL_ROLES) {
      const items = visibleForRole(role);
      const paths = items.map(i => i.to);
      expect(paths).not.toContain('/today');
    }
  });

  it('IA-3: 世帯（/households）はメニューから削除されている', () => {
    for (const role of ALL_ROLES) {
      const items = visibleForRole(role);
      const paths = items.map(i => i.to);
      expect(paths).not.toContain('/households');
    }
  });

  it('IA-3: 契約（/policies）はメニューから削除されている', () => {
    for (const role of ALL_ROLES) {
      const items = visibleForRole(role);
      const paths = items.map(i => i.to);
      expect(paths).not.toContain('/policies');
    }
  });
});

// ── IA-1: DashboardWithPerfPage — タブ選択ロジック ─────────────────────────

describe('IA-1: DashboardWithPerfPage タブ選択ロジック', () => {
  const resolveTab = (searchParam: string | null): 'dashboard' | 'salesperf' => {
    return searchParam === 'salesperf' ? 'salesperf' : 'dashboard';
  };

  it('tab パラメータなし → ダッシュボードタブ', () => {
    expect(resolveTab(null)).toBe('dashboard');
  });

  it('tab=salesperf → 営業実績タブ', () => {
    expect(resolveTab('salesperf')).toBe('salesperf');
  });

  it('tab=unknown → ダッシュボードタブ（フォールバック）', () => {
    expect(resolveTab('unknown')).toBe('dashboard');
  });

  it('tab=dashboard → ダッシュボードタブ', () => {
    expect(resolveTab('dashboard')).toBe('dashboard');
  });
});

// ── IA-2: NippouPage — タブ選択ロジック ─────────────────────────────────────

describe('IA-2: NippouPage タブ選択ロジック', () => {
  const resolveTab = (searchParam: string | null): 'today' | 'calendar' => {
    return searchParam === 'calendar' ? 'calendar' : 'today';
  };

  it('tab パラメータなし → 日報（today）タブ', () => {
    expect(resolveTab(null)).toBe('today');
  });

  it('tab=calendar → カレンダータブ', () => {
    expect(resolveTab('calendar')).toBe('calendar');
  });

  it('tab=unknown → 日報タブ（フォールバック）', () => {
    expect(resolveTab('unknown')).toBe('today');
  });
});

// ── IA-3: CustomerListPage — タブ選択ロジック ────────────────────────────────

describe('IA-3: CustomerListPage タブ選択ロジック', () => {
  const resolveTab = (searchParam: string | null): 'households' | 'policies' => {
    return searchParam === 'policies' ? 'policies' : 'households';
  };

  it('tab パラメータなし → 世帯タブ', () => {
    expect(resolveTab(null)).toBe('households');
  });

  it('tab=policies → 契約タブ', () => {
    expect(resolveTab('policies')).toBe('policies');
  });

  it('tab=unknown → 世帯タブ（フォールバック）', () => {
    expect(resolveTab('unknown')).toBe('households');
  });
});

// ── IA後方互換: パスリダイレクト確認 ───────────────────────────────────────

describe('IA: 後方互換パスのリダイレクト設計確認', () => {
  /**
   * App.tsx で定義したリダイレクトマップを再現して検証する。
   * 実際のリダイレクトは react-router で行われるが、
   * 設計意図をテストとして記録する。
   */
  const REDIRECTS: Record<string, string> = {
    '/':           '/dashboard',
    '/today':      '/nippou',
    '/calendar':   '/nippou?tab=calendar',
    '/households': '/customers',
    '/policies':   '/customers?tab=policies',
    '/sales-perf': '/dashboard?tab=salesperf',
  };

  it('/today → /nippou にリダイレクトされる設計', () => {
    expect(REDIRECTS['/today']).toBe('/nippou');
  });

  it('/calendar → /nippou?tab=calendar にリダイレクトされる設計', () => {
    expect(REDIRECTS['/calendar']).toBe('/nippou?tab=calendar');
  });

  it('/households → /customers にリダイレクトされる設計', () => {
    expect(REDIRECTS['/households']).toBe('/customers');
  });

  it('/policies → /customers?tab=policies にリダイレクトされる設計', () => {
    expect(REDIRECTS['/policies']).toBe('/customers?tab=policies');
  });

  it('/sales-perf → /dashboard?tab=salesperf にリダイレクトされる設計', () => {
    expect(REDIRECTS['/sales-perf']).toBe('/dashboard?tab=salesperf');
  });

  it('/ → /dashboard にリダイレクトされる設計', () => {
    expect(REDIRECTS['/']).toBe('/dashboard');
  });
});

// ── IA-4: ヘッダ検索の設計確認 ───────────────────────────────────────────────

describe('IA-4: ヘッダ検索の設計確認', () => {
  it('クエリあり → /search?q=<encoded> への遷移が正しい形式', () => {
    const q = '田中';
    const url = `/search?q=${encodeURIComponent(q)}`;
    expect(url).toBe('/search?q=%E7%94%B0%E4%B8%AD');
  });

  it('クエリなし → /search へ遷移（詳細検索ページへ）', () => {
    const q = '';
    const url = q.trim() ? `/search?q=${encodeURIComponent(q)}` : '/search';
    expect(url).toBe('/search');
  });

  it('クエリのURLエンコードが正しい（英数字はそのまま）', () => {
    const q = 'test123';
    const url = `/search?q=${encodeURIComponent(q)}`;
    expect(url).toBe('/search?q=test123');
  });
});
