/**
 * E-8 調査テスト: 削除した顧客が過去日報で「不明」と表示されるか
 */
import { test, expect, type Page } from '@playwright/test';

// admin ログイン用ヘルパー
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

test.describe('E-8 調査: 顧客削除後の過去日報表示', () => {
  test('seed の c1 を削除した後、過去日報で customerId=c1 のブロックが「不明」と表示される', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 管理者としてログイン確認
    console.log('Current URL:', page.url());

    // 顧客一覧ページへ
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // c1 (KOORO GILSON) が表示されているか確認
    const kooroRow = page.getByText('KOORO GILSON');
    const isVisible = await kooroRow.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('KOORO GILSON visible:', isVisible);

    if (!isVisible) {
      // 全ページのテキストを取得してデバッグ
      const content = await page.textContent('body');
      console.log('Page content (first 500):', content?.slice(0, 500));
    }

    // c1 の編集ボタンをクリック（削除モーダルへ）
    // 顧客行を見つけてクリック
    const customerItem = page.locator('[aria-label*="KOORO GILSON"], button:has-text("KOORO GILSON"), .customer-item:has-text("KOORO GILSON")').first();
    const editBtn = page.locator('button[aria-label*="KOORO GILSON 完全削除"], button:has-text("🗑")').first();
    
    // ページのスクリーンショット
    await page.screenshot({ path: '/tmp/customers-page.png' });
    console.log('Screenshot saved to /tmp/customers-page.png');

    // 削除ボタンを探す - テキストで検索
    const deleteButtons = page.locator('button').filter({ hasText: '🗑' });
    const deleteBtnCount = await deleteButtons.count();
    console.log('Delete buttons count:', deleteBtnCount);

    if (deleteBtnCount > 0) {
      // KOORO GILSON の行を探す
      const rows = page.locator('[data-testid="customer-row"], .customer-card, li:has-text("KOORO GILSON"), div:has-text("KOORO GILSON")');
      const rowCount = await rows.count();
      console.log('Customer rows with KOORO GILSON:', rowCount);
    }
  });

  test('seed の report を確認する - c1 を参照したブロックが存在するか', async ({ page }) => {
    await loginAsAdmin(page);
    
    // ストアを操作して日報データを確認するために inject script を使う
    await page.addInitScript(() => {
      // store からデータを取得するために window に expose
      (window as any).__testGetStore = () => {
        // Zustand store へのアクセス
        const storeModule = (window as any).__zustandStore;
        return storeModule;
      };
    });
    
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // 日報一覧から c1 を含む日報を探す
    const pageContent = await page.textContent('body');
    console.log('Reports page content (first 500):', pageContent?.slice(0, 500));
  });
});
