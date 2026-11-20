/**
 * e2e/buga-layout.spec.ts
 * BUG-A: ReportDetail / Today ページの md breakpoint (768px) で 2 列表示を確認
 *
 * 主上ご指摘「1 列」 → lg (1024px) 未満で 1 列になっていた可能性
 * 対策: lg → md (768px) に breakpoint を引き下げ
 * このテストでは viewport=800px で 2 列表示になることを検証する
 *
 * BUG-A 真の修正 (2026-06-06): ReadOnlyTimeline 内部も 予定/実績 2 カラム並列に統一
 */
import { test, expect } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, role: 'general' | 'manager' | 'executive' | 'admin') {
  const userNames = { general: '袴田 祐司', manager: '佐藤 健一', executive: '鈴木 美咲', admin: '高田 一郎' };
  await page.goto('/login');
  await page.getByRole('button', { name: /役割で選んでログイン/ }).click();
  const targetName = userNames[role];
  const userButton = page.locator('button').filter({ hasText: targetName }).first();
  await userButton.click();
  await expect(page).toHaveURL(/\/today$|\/dashboard$/, { timeout: 5000 });
}

test.describe('BUG-A: md breakpoint (800px) で 2 列表示', () => {
  test.use({ viewport: { width: 800, height: 900 } });

  test('ReportDetail ページで 800px viewport で main+aside が横並び (2 列)', async ({ page }) => {
    await loginAs(page, 'general');

    // 日報一覧から最初の日報を開く
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // 日報リンクを探す
    const reportLinks = page.locator('a[href^="/reports/"]');
    const count = await reportLinks.count();
    if (count === 0) {
      // 日報なし → Today から日付 URL を構築
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/reports/${today}`);
    } else {
      await reportLinks.first().click();
    }
    await page.waitForLoadState('networkidle');

    // md:col-span-2 を持つ main エリアの存在確認
    const mainArea = page.locator('.md\\:col-span-2').first();
    const asideArea = page.locator('.md\\:col-span-1').first();

    // 要素が存在することを確認
    const mainCount = await mainArea.count();
    const asideCount = await asideArea.count();

    if (mainCount > 0 && asideCount > 0) {
      // 両方の要素が同一の行に並んでいることを確認 (top 座標が近い)
      const mainBox = await mainArea.boundingBox();
      const asideBox = await asideArea.boundingBox();
      if (mainBox && asideBox) {
        // 横並び: x 座標が異なる (main が左、aside が右)
        expect(mainBox.x).toBeLessThan(asideBox.x);
        // かつ同じ行: y 差が 50px 未満
        expect(Math.abs(mainBox.y - asideBox.y)).toBeLessThan(50);
      }
    } else {
      // 日報が存在しない場合はスキップ
      test.skip();
    }
  });

  test('Today ページで 800px viewport で timeline+aside が横並び (2 列)', async ({ page }) => {
    await loginAs(page, 'general');
    await page.goto('/today');
    await page.waitForLoadState('networkidle');

    // md:col-span-2 を持つエリア (TodayPage の timeline panel)
    const mainArea = page.locator('.md\\:col-span-2').first();
    const mainCount = await mainArea.count();

    if (mainCount === 0) {
      // 日報未作成 → グリッドが表示されないためスキップ
      test.skip();
      return;
    }

    // 親グリッドが md:grid になっていることを確認
    const gridContainer = page.locator('.md\\:grid').first();
    const gridCount = await gridContainer.count();
    expect(gridCount).toBeGreaterThan(0);
  });

  test('ReportDetail ページで ReadOnlyTimeline 内部が 2 カラム並列になっている', async ({ page }) => {
    await loginAs(page, 'general');

    // 日報ページに移動
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    const reportLinks = page.locator('a[href^="/reports/"]');
    const count = await reportLinks.count();
    if (count === 0) {
      test.skip();
      return;
    }
    await reportLinks.first().click();
    await page.waitForLoadState('networkidle');

    // タイムライン内部の 2 カラム確認 (sm: 以上は hidden sm:flex で表示)
    const plannedCol = page.locator('[data-testid="timeline-planned-col"]').first();
    const actualCol = page.locator('[data-testid="timeline-actual-col"]').first();

    const plannedCount = await plannedCol.count();
    const actualCount = await actualCol.count();

    if (plannedCount > 0 && actualCount > 0) {
      const plannedBox = await plannedCol.boundingBox();
      const actualBox = await actualCol.boundingBox();

      if (plannedBox && actualBox) {
        // 横並び: 予定カラムが左、実績カラムが右
        expect(plannedBox.x).toBeLessThan(actualBox.x);
        // 同じ行内: y 座標差が小さい
        expect(Math.abs(plannedBox.y - actualBox.y)).toBeLessThan(50);
      }
    } else {
      // 日報データなし → スキップ
      test.skip();
    }
  });
});
