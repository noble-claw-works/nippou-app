/**
 * e2e/login-lockout.spec.ts
 * P1 ログイン失敗ロック永続化 e2e テスト
 *
 * 検証内容:
 * 1. 5回連続失敗でロックバナーが表示される
 * 2. リロード後もロックが維持される (localStorage 永続化)
 * 3. ロック中はログインボタンが disabled になる
 */
import { test, expect } from '@playwright/test';

const EMAIL = 'hakuta@example.com';
const WRONG_PW = 'wrong-password-lockout-test';

test.describe('P1 ログイン失敗ロック永続化', () => {
  test.beforeEach(async ({ page }) => {
    // localStorage をクリアしてクリーンな状態で開始
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.removeItem('nippou_login_fails');
      localStorage.removeItem('nippou_login_lock_until');
    });
    await page.reload();
  });

  test('5回連続失敗でロックバナーが表示され、ログインボタンが disabled になる', async ({ page }) => {
    await page.goto('/login');

    // 5回ログイン失敗
    for (let i = 0; i < 5; i++) {
      await page.getByLabel('メールアドレス').fill(EMAIL);
      await page.locator('#login-password').fill(WRONG_PW);
      await page.locator('button[type="submit"]').click();
      // エラーメッセージ or ロックバナーが出るまで待つ
      await page.waitForSelector('[role="alert"]', { timeout: 5000 });
    }

    // ロックバナーが表示されている (div[role=alert] with lock class)
    const lockBanner = page.locator('div[role="alert"]').filter({ hasText: /ロック/ });
    await expect(lockBanner).toBeVisible({ timeout: 3000 });

    // submit ボタンが disabled (type=submit で特定)
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled();
  });

  test('5回失敗後リロードしてもロックが維持される', async ({ page }) => {
    await page.goto('/login');

    // 5回ログイン失敗
    for (let i = 0; i < 5; i++) {
      await page.getByLabel('メールアドレス').fill(EMAIL);
      await page.locator('#login-password').fill(WRONG_PW);
      await page.locator('button[type="submit"]').click();
      await page.waitForSelector('[role="alert"]', { timeout: 5000 });
    }

    // ページをリロード
    await page.reload();
    await page.waitForLoadState('networkidle');

    // リロード後もロックバナーが表示されている
    const lockBanner = page.locator('div[role="alert"]').filter({ hasText: /ロック/ });
    await expect(lockBanner).toBeVisible({ timeout: 3000 });

    // submit ボタンが disabled のまま
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled();
  });

  test('ロック中はフォーム送信してもログインできない', async ({ page }) => {
    await page.goto('/login');

    // localStorage に直接ロック状態を設定
    await page.evaluate(() => {
      localStorage.setItem('nippou_login_fails', '5');
      localStorage.setItem('nippou_login_lock_until', String(Date.now() + 30 * 60 * 1000));
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // ロックバナーが表示されている
    const lockBanner = page.locator('div[role="alert"]').filter({ hasText: /ロック/ });
    await expect(lockBanner).toBeVisible({ timeout: 3000 });

    // submit ボタンが disabled
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled();

    // /login のままであることを確認
    await expect(page).toHaveURL(/\/login$/);
  });

  test('成功時にロックカウンタがクリアされる', async ({ page }) => {
    await page.goto('/login');

    // 3回失敗させる
    for (let i = 0; i < 3; i++) {
      await page.getByLabel('メールアドレス').fill(EMAIL);
      await page.locator('#login-password').fill(WRONG_PW);
      await page.locator('button[type="submit"]').click();
      await page.waitForSelector('[role="alert"]', { timeout: 5000 });
    }

    // localStorage の fail count を確認
    const failsBefore = await page.evaluate(() => localStorage.getItem('nippou_login_fails'));
    expect(failsBefore).toBe('3');

    // 正しいパスワードでログイン
    await page.getByLabel('メールアドレス').fill(EMAIL);
    await page.locator('#login-password').fill('demo');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/today$/, { timeout: 5000 });

    // ログイン成功後、/login に戻って localStorage がクリアされていることを確認
    await page.goto('/login');
    const failsAfter = await page.evaluate(() => localStorage.getItem('nippou_login_fails'));
    const lockAfter = await page.evaluate(() => localStorage.getItem('nippou_login_lock_until'));
    expect(failsAfter).toBeNull();
    expect(lockAfter).toBeNull();
  });
});
