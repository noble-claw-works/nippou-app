/**
 * E-8 デバッグ: 削除後のストア状態確認
 */
import { test, expect, type Page } from '@playwright/test';

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

test('E-8 デバッグ: 削除後のストア状態', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // c1 を削除
  await page.goto('/customers');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  const deleteBtn = page.locator('button[aria-label="KOORO GILSON を削除"]');
  await expect(deleteBtn).toBeVisible({ timeout: 5000 });
  await deleteBtn.click();
  await page.waitForTimeout(300);
  
  const confirmDeleteBtn = page.getByRole('button', { name: '削除する' });
  await expect(confirmDeleteBtn).toBeVisible({ timeout: 3000 });
  await confirmDeleteBtn.click();
  await page.waitForTimeout(500);
  console.log('✅ c1 deleted');

  // ストア状態を確認 - Zustand の状態を page.evaluate で取得
  const customerIds = await page.evaluate(() => {
    // React fiber から Zustand store にアクセスする試み
    // または window に露出している場合
    const storeKey = Object.keys(window).find(k => k.includes('zustand') || k.includes('store') || k.includes('appStore'));
    if (storeKey) {
      console.log('Found store key:', storeKey);
      return (window as any)[storeKey];
    }
    return null;
  });
  console.log('Store key found:', customerIds);

  // React DevTools 経由でストアにアクセス
  const storeState = await page.evaluate(() => {
    // Zustand stores are often accessible via __ZUSTAND__ or similar
    const allKeys = Object.getOwnPropertyNames(window);
    const relevantKeys = allKeys.filter(k => 
      k.includes('store') || k.includes('zustand') || k.includes('state')
    );
    return relevantKeys.join(',');
  });
  console.log('Relevant window keys:', storeState);

  // 削除後、顧客リストに KOORO GILSON が表示されないことを確認
  const kooroVisible = await page.getByText('KOORO GILSON').isVisible({ timeout: 2000 }).catch(() => false);
  console.log('KOORO GILSON visible after delete (same page):', kooroVisible);
  
  await page.screenshot({ path: '/tmp/customers-after-delete-same-page.png' });

  // 日報詳細ページに移動 (ページ遷移、リロードなし)
  // seed のレポート - 過去の日付を使用
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yd = yesterday.toISOString().split('T')[0];
  
  await page.goto(`/reports/${yd}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  const pageText = await page.textContent('body') || '';
  const hasKooro = pageText.includes('KOORO GILSON');
  const hasUnknown = pageText.includes('不明');
  console.log(`/reports/${yd} - KOORO GILSON: ${hasKooro}, 不明: ${hasUnknown}`);
  
  await page.screenshot({ path: '/tmp/report-detail-debug.png' });

  // より詳細: タイムラインのDOMを直接確認
  const timelineContent = await page.evaluate(() => {
    const articles = document.querySelectorAll('[role="article"]');
    return Array.from(articles).map(a => ({
      label: a.getAttribute('aria-label'),
      text: a.textContent?.trim().slice(0, 200)
    }));
  });
  console.log('Timeline articles:', JSON.stringify(timelineContent, null, 2));
});

test('E-8 デバッグ: ReadOnlyTimeline の customers prop に c1 が渡されているか', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // c1 を削除
  await page.goto('/customers');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  
  const deleteBtn = page.locator('button[aria-label="KOORO GILSON を削除"]');
  await expect(deleteBtn).toBeVisible({ timeout: 5000 });
  await deleteBtn.click();
  await page.waitForTimeout(300);
  
  const confirmDeleteBtn = page.getByRole('button', { name: '削除する' });
  await expect(confirmDeleteBtn).toBeVisible({ timeout: 3000 });
  await confirmDeleteBtn.click();
  await page.waitForTimeout(500);
  console.log('✅ c1 deleted');

  // console.log を仕込んで React のレンダリングを監視
  const consoleLogs: string[] = [];
  page.on('console', msg => consoleLogs.push(msg.text()));

  // 過去日報ページへ
  const date = new Date();
  date.setDate(date.getDate() - 2);
  const dateStr = date.toISOString().split('T')[0];
  
  await page.goto(`/reports/${dateStr}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  const pageText = await page.textContent('body') || '';
  const hasKooro = pageText.includes('KOORO GILSON');
  const hasUnknown = pageText.includes('不明');
  console.log(`/reports/${dateStr} - KOORO GILSON: ${hasKooro}, 不明: ${hasUnknown}`);
  
  // タイムラインの顧客名表示を確認
  const timelineItems = await page.evaluate(() => {
    // article[role=article] の中の p テキストを確認
    const items = document.querySelectorAll('[role="article"] p');
    return Array.from(items).map(p => p.textContent?.trim());
  });
  console.log('Timeline customer name items:', timelineItems);
  
  // aria-label でブロック情報確認
  const blockLabels = await page.evaluate(() => {
    const blocks = document.querySelectorAll('[role="article"]');
    return Array.from(blocks).map(b => b.getAttribute('aria-label'));
  });
  console.log('Block aria-labels:', blockLabels);
  
  console.log('Console logs:', consoleLogs.slice(0, 20));
});
