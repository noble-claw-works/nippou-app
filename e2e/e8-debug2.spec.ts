/**
 * E-8 デバッグ2: store 内の customers が c1 削除後に更新されているか直接確認
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

test('E-8 デバッグ2: store の customers を直接確認', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // ページ内の React fiber から Zustand store にアクセスする
  // Zustand は window.__ZUSTAND_DEVTOOLS__ などは使わない
  // 代わりに、React コンポーネントから store に直接アクセスする
  
  await page.goto('/customers');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // 削除前: c1 (KOORO GILSON) が顧客リストに存在する
  const kooroBeforeDelete = await page.getByText('KOORO GILSON').isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Before delete - KOORO GILSON visible:', kooroBeforeDelete);

  // 顧客ページのリストにある顧客数を確認
  const customerCount = await page.evaluate(() => {
    // ReactFiberのroot からstoreを探す試み
    const rootEl = document.querySelector('#root') as any;
    if (rootEl && rootEl._reactRootContainer) {
      const fiber = rootEl._reactRootContainer.current;
      // Zustand storeは通常 React context か module scope にある
      return 'React root found';
    }
    return 'React root not found';
  });
  console.log('React root check:', customerCount);

  // c1 を削除
  const deleteBtn = page.locator('button[aria-label="KOORO GILSON を削除"]');
  if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await deleteBtn.click();
    await page.waitForTimeout(300);
    const confirmBtn = page.getByRole('button', { name: '削除する' });
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  // 削除後: 同ページで KOORO GILSON が消えたか
  const kooroAfterDelete = await page.getByText('KOORO GILSON').isVisible({ timeout: 2000 }).catch(() => false);
  console.log('After delete (same page) - KOORO GILSON visible:', kooroAfterDelete);

  if (kooroAfterDelete) {
    console.log('❌ KOORO GILSON still visible after delete - deleteCustomer might not be working');
  } else {
    console.log('✅ KOORO GILSON removed from customer list');
  }

  // 過去日報ページへ遷移（page.goto - フル遷移）
  const date = new Date();
  date.setDate(date.getDate() - 2);
  const dateStr = date.toISOString().split('T')[0];
  
  await page.goto(`/reports/${dateStr}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // タイムラインに「不明」があるか
  const timelineItems = await page.evaluate(() => {
    const items = document.querySelectorAll('[role="article"] p');
    return Array.from(items).map(p => p.textContent?.trim());
  });
  console.log('Timeline items on report page:', timelineItems);

  const pageText = await page.textContent('body') || '';
  const hasKooro = pageText.includes('KOORO GILSON');
  const hasUnknown = pageText.includes('不明');
  console.log(`Report page (${dateStr}) - KOORO GILSON: ${hasKooro}, 不明: ${hasUnknown}`);

  // ページ HTML を確認
  const htmlSnippet = await page.evaluate(() => {
    // タイムラインの顧客名部分のHTML
    const p = document.querySelector('[role="article"] p');
    return p?.outerHTML || 'no p found';
  });
  console.log('Timeline customer p HTML:', htmlSnippet);
});

test('E-8 デバッグ3: page.goto vs navigate - フル遷移時にストアがリセットされるか', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await page.goto('/customers');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // c1 を削除
  const deleteBtn = page.locator('button[aria-label="KOORO GILSON を削除"]');
  if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await deleteBtn.click();
    await page.waitForTimeout(300);
    const confirmBtn = page.getByRole('button', { name: '削除する' });
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
      await page.waitForTimeout(500);
      console.log('✅ c1 deleted');
    }
  }

  // SPA 内部ナビゲーション (click) vs page.goto の違いを確認
  // SPA ルーターで顧客ページ → 日報ページへ遷移
  const calendarLink = page.locator('a[href="/calendar"], a:has-text("カレンダー")');
  if (await calendarLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await calendarLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    console.log('Navigated to calendar via SPA link');
    
    // カレンダーから日報をクリックして開く試み
    const reportCells = page.locator('button:has-text("✅"), button:has-text("⭐"), button:has-text("✎")');
    const cellCount = await reportCells.count();
    console.log('Report cells:', cellCount);
    
    if (cellCount > 0) {
      await reportCells.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      const url = page.url();
      console.log('After clicking report cell, URL:', url);
      
      const timelineItems = await page.evaluate(() => {
        const items = document.querySelectorAll('[role="article"] p');
        return Array.from(items).map(p => p.textContent?.trim());
      });
      console.log('Timeline items:', timelineItems);
    }
  }
});
