/**
 * E-8 詳細再現テスト: 過去日報 URL に直接アクセスして「不明」表示確認
 */
import { test, expect, type Page } from '@playwright/test';
import { format, subDays } from 'date-fns';

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

test.describe('E-8 詳細再現', () => {
  test('c1 削除前: 過去日報で KOORO GILSON が表示される', async ({ page }) => {
    await loginAsGeneral(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 1週間前の日付 (seed に含まれる日報)
    const date7 = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    const date5 = format(subDays(new Date(), 5), 'yyyy-MM-dd');
    const date3 = format(subDays(new Date(), 3), 'yyyy-MM-dd');

    // いくつかの日付を試してみる
    for (const date of [date7, date5, date3]) {
      await page.goto(`/reports/${date}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      const notFound = await page.getByText('日報が見つかりません').isVisible({ timeout: 1000 }).catch(() => false);
      if (!notFound) {
        const pageText = await page.textContent('body');
        const hasKooro = pageText?.includes('KOORO GILSON');
        const hasUnknown = pageText?.includes('不明');
        console.log(`Date: ${date}, KOORO GILSON: ${hasKooro}, 不明: ${hasUnknown}`);
        await page.screenshot({ path: `/tmp/report-${date}-before-delete.png` });
        break;
      }
      console.log(`Date ${date}: report not found`);
    }
  });

  test('c1 削除後: 過去日報で「不明」が表示されることを確認', async ({ page }) => {
    // admin でログインして c1 を削除
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

    // ページリロードなしで過去日報を確認 (同一セッション内)
    const date7 = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    const date5 = format(subDays(new Date(), 5), 'yyyy-MM-dd');
    const date3 = format(subDays(new Date(), 3), 'yyyy-MM-dd');
    const date1 = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    let reportFound = false;
    for (const date of [date1, date3, date5, date7]) {
      await page.goto(`/reports/${date}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      const notFound = await page.getByText('日報が見つかりません').isVisible({ timeout: 1000 }).catch(() => false);
      if (!notFound) {
        const pageText = await page.textContent('body') || '';
        const hasKooro = pageText.includes('KOORO GILSON');
        const hasUnknown = pageText.includes('不明');
        console.log(`Date: ${date}, KOORO GILSON: ${hasKooro}, 不明: ${hasUnknown}`);
        await page.screenshot({ path: `/tmp/report-${date}-after-delete.png` });
        
        // KOORO GILSON ではなく「不明」が表示されるべき
        expect(hasKooro).toBe(false);
        expect(hasUnknown).toBe(true);
        reportFound = true;
        break;
      }
      console.log(`Date ${date}: report not found`);
    }
    
    if (!reportFound) {
      console.log('No past reports found in tested dates');
      // 今日の日報を確認
      const today = format(new Date(), 'yyyy-MM-dd');
      await page.goto(`/reports/${today}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      const pageText = await page.textContent('body') || '';
      const hasKooro = pageText.includes('KOORO GILSON');
      const hasUnknown = pageText.includes('不明');
      console.log(`Today: ${today}, KOORO GILSON: ${hasKooro}, 不明: ${hasUnknown}`);
      await page.screenshot({ path: '/tmp/report-today-after-delete.png' });
    }
  });

  test('c1 削除後にページをリロード → store がリセットされ c1 が復元されてしまう問題を確認', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // c1 を削除
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const deleteBtn = page.locator('button[aria-label="KOORO GILSON を削除"]');
    if (await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deleteBtn.click();
      await page.waitForTimeout(300);
      const confirmDeleteBtn = page.getByRole('button', { name: '削除する' });
      if (await confirmDeleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmDeleteBtn.click();
        await page.waitForTimeout(500);
        console.log('✅ c1 deleted');
      }
    }

    // 削除後、顧客ページをリロード
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // リロード後に KOORO GILSON が復元されるか確認
    const kooroAfterReload = await page.getByText('KOORO GILSON').isVisible({ timeout: 3000 }).catch(() => false);
    console.log('KOORO GILSON after reload:', kooroAfterReload);
    // → これが true なら「ページリロードでストアがリセットされる」が問題の原因
    
    await page.screenshot({ path: '/tmp/customers-after-reload.png' });
    
    if (kooroAfterReload) {
      console.log('🚨 ROOT CAUSE CONFIRMED: Page reload resets store, restoring deleted customer');
    } else {
      console.log('Store persists after reload');
    }
  });
});
