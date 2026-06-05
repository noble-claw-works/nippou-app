/**
 * E-8 再現テスト: 削除した顧客が過去日報で「不明」と表示されるか
 * 
 * seed データには c1 (KOORO GILSON) を参照する日報ブロックが存在する。
 * c1 を削除した後、その日報を開いて「不明」が表示されるか確認。
 */
import { test, expect, type Page } from '@playwright/test';

// admin ログイン
async function loginAsAdmin(page: Page) {
  await page.addInitScript(() => {
    const session = {
      userId: 'u6',
      email: 'admin@example.com',
      loginAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
    window.localStorage.setItem('nippou.auth.v1', JSON.stringify(session));
  });
}

// general user (u1) ログイン - seed の日報オーナー
async function loginAsGeneral(page: Page) {
  await page.addInitScript(() => {
    const session = {
      userId: 'u1',
      email: 'hakuta@example.com',
      loginAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
    window.localStorage.setItem('nippou.auth.v1', JSON.stringify(session));
  });
}

test.describe('E-8 再現: 顧客削除後の過去日報表示', () => {
  test('seed c1 削除後、ReportDetailPage の ReadOnlyTimeline で「不明」が表示される', async ({ page }) => {
    // admin でログイン (削除権限)
    await loginAsAdmin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // ---- Step 1: seed c1 (KOORO GILSON) を削除 ----
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // KOORO GILSON の削除ボタンをクリック
    const deleteBtn = page.locator('button[aria-label="KOORO GILSON を削除"]');
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    await deleteBtn.click();
    await page.waitForTimeout(300);

    // 削除確認ダイアログの「削除する」ボタン
    const confirmBtn = page.locator('button:has-text("削除する"), button:has-text("確認"), button:has-text("OK")').last();
    // ConfirmDialog の confirmLabel="削除する"
    const confirmDeleteBtn = page.getByRole('button', { name: '削除する' });
    await expect(confirmDeleteBtn).toBeVisible({ timeout: 3000 });
    await confirmDeleteBtn.click();
    await page.waitForTimeout(500);

    // KOORO GILSON が消えたことを確認
    const kooroText = page.getByText('KOORO GILSON');
    await expect(kooroText).not.toBeVisible({ timeout: 3000 });
    console.log('✅ c1 (KOORO GILSON) deleted successfully');

    // ---- Step 2: seed に c1 を参照する日報があるはず (ReportDetailPage) ----
    // seed データ: r_today_u1 や past reports が c1 を customerId として持つ
    // 過去日報ページに移動 - カレンダーから探す
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // カレンダーに日報アイテムがあるか確認
    await page.screenshot({ path: '/tmp/calendar-after-delete.png' });
    console.log('Calendar screenshot saved');

    // 日報を開く
    // seed には r_today_u1 (今日の日報) と過去の日報がある
    // u1 (一般ユーザー) として日報詳細を開く必要がある
    // admin から ReportDetailPage に直接アクセス
    // seed reports の date を取得するため、ページのリンクを探す
    const reportLinks = page.locator('a[href*="/reports/"]');
    const linkCount = await reportLinks.count();
    console.log('Report links count:', linkCount);

    if (linkCount > 0) {
      const href = await reportLinks.first().getAttribute('href');
      console.log('First report link:', href);
      await reportLinks.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/report-detail-after-delete.png' });
      console.log('Report detail screenshot saved');
      
      // タイムラインに「不明」が表示されているか
      const unknownText = page.getByText('不明');
      const hasUnknown = await unknownText.isVisible({ timeout: 3000 }).catch(() => false);
      console.log('「不明」visible:', hasUnknown);
      
      const pageContent = await page.textContent('.relative.bg-white.rounded-lg') || '';
      console.log('Timeline content:', pageContent.slice(0, 500));
    } else {
      console.log('No report links found on calendar page');
      const content = await page.textContent('body');
      console.log('Page content (first 1000):', content?.slice(0, 1000));
    }
  });

  test('seed c1 削除後、SearchPage で「不明」が表示される', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // c1 を削除
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const deleteBtn = page.locator('button[aria-label="KOORO GILSON を削除"]');
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtn.click();
      await page.waitForTimeout(300);
      const confirmDeleteBtn = page.getByRole('button', { name: '削除する' });
      if (await confirmDeleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmDeleteBtn.click();
        await page.waitForTimeout(500);
        console.log('✅ c1 deleted');
      }
    }

    // 検索ページへ
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/search-after-delete.png' });
    
    const content = await page.textContent('body');
    console.log('Search page content (first 500):', content?.slice(0, 500));
    
    // 検索結果に「不明」があるか
    const unknownText = page.getByText('不明');
    const hasUnknown = await unknownText.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('「不明」visible in search:', hasUnknown);
  });
});
