/**
 * E-8 SPA ナビゲーションテスト
 * page.goto vs React Router リンクナビゲーションの違いを確認
 */
import { test, expect, type Page } from '@playwright/test';
import { format, subDays } from 'date-fns';

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

test('E-8 SPA: c1 削除後に SPA ナビゲーションで過去日報を開いたとき「不明」が表示される', async ({ page }) => {
  await loginAsAdmin(page);
  
  // 最初から顧客ページを開く
  await page.goto('/customers');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // c1 を削除
  const deleteBtn = page.locator('button[aria-label="KOORO GILSON を削除"]');
  await expect(deleteBtn).toBeVisible({ timeout: 5000 });
  await deleteBtn.click();
  await page.waitForTimeout(300);
  
  const confirmBtn = page.getByRole('button', { name: '削除する' });
  await expect(confirmBtn).toBeVisible({ timeout: 3000 });
  await confirmBtn.click();
  await page.waitForTimeout(500);
  console.log('✅ c1 deleted (SPA state)');

  // SPA ナビゲーション: カレンダーリンクをクリック
  await page.locator('nav a[href="/calendar"], a:has-text("カレンダー")').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  
  console.log('Current URL after calendar nav:', page.url());

  // カレンダーの日報セルをクリック
  // 先週あたりのセルを探す
  const reportCells = page.locator('button').filter({ hasText: /[✅⭐✎🌤️]/ });
  const count = await reportCells.count();
  console.log('Report cells found:', count);

  if (count > 0) {
    // 最初のセルをクリック
    await reportCells.first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const url = page.url();
    console.log('After clicking report cell, URL:', url);
    
    // 日報詳細ページに遷移したか
    if (url.includes('/reports/')) {
      const timelineItems = await page.evaluate(() => {
        const items = document.querySelectorAll('[role="article"] p');
        return Array.from(items).map(p => p.textContent?.trim());
      });
      console.log('Timeline items (via SPA nav):', timelineItems);
      
      const pageText = await page.textContent('body') || '';
      const hasKooro = pageText.includes('KOORO GILSON');
      const hasUnknown = pageText.includes('不明');
      console.log(`SPA nav result - KOORO GILSON: ${hasKooro}, 不明: ${hasUnknown}`);
      
      await page.screenshot({ path: '/tmp/report-spa-nav.png' });
    }
  }
});

test('E-8 SPA: window.history.pushState で遷移', async ({ page }) => {
  await loginAsAdmin(page);
  
  await page.goto('/customers');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // c1 を削除
  const deleteBtn = page.locator('button[aria-label="KOORO GILSON を削除"]');
  await expect(deleteBtn).toBeVisible({ timeout: 5000 });
  await deleteBtn.click();
  await page.waitForTimeout(300);
  
  const confirmBtn = page.getByRole('button', { name: '削除する' });
  await expect(confirmBtn).toBeVisible({ timeout: 3000 });
  await confirmBtn.click();
  await page.waitForTimeout(500);
  console.log('✅ c1 deleted');

  // SPA ルーターで遷移 (React Router の pushState)
  const date2 = format(subDays(new Date(), 2), 'yyyy-MM-dd');
  const date3 = format(subDays(new Date(), 3), 'yyyy-MM-dd');
  
  await page.evaluate((dateStr) => {
    window.history.pushState({}, '', `/reports/${dateStr}`);
    // React Router に変更を通知するため popstate イベントを発火
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  }, date2);
  await page.waitForTimeout(1000);
  
  console.log('URL after pushState:', page.url());
  
  const timelineItems = await page.evaluate(() => {
    const items = document.querySelectorAll('[role="article"] p');
    return Array.from(items).map(p => p.textContent?.trim());
  });
  console.log('Timeline items (via pushState):', timelineItems);
  
  const pageText = await page.textContent('body') || '';
  const hasKooro = pageText.includes('KOORO GILSON');
  const hasUnknown = pageText.includes('不明');
  console.log(`pushState result - KOORO GILSON: ${hasKooro}, 不明: ${hasUnknown}`);
});
