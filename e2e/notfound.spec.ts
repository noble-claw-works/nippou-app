import { test, expect, type Page } from '@playwright/test';

/** ログイン済みセッションを localStorage に仕込む */
async function loginAsDemo(page: Page) {
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

test.describe('E-7: 404 フォールバックページ', () => {
  test('存在しない URL にアクセスすると 404 メッセージが表示される', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/hogehoge/fugafuga');

    // 404 見出しが表示される
    await expect(page.getByRole('heading', { name: /404/ })).toBeVisible({ timeout: 5000 });

    // 「ページが見つかりません」のテキストが含まれる
    await expect(page.getByText(/ページが見つかりません/)).toBeVisible();
  });

  test('「トップへ戻る」ボタンで / にナビゲートできる', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/hogehoge');

    const backBtn = page.getByRole('link', { name: 'トップへ戻る' });
    await expect(backBtn).toBeVisible({ timeout: 5000 });
    await backBtn.click();

    // / は /today にリダイレクトされる
    await expect(page).toHaveURL(/\/(today)?$/);
  });
});
