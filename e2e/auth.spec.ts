import { test, expect } from '@playwright/test';

test.describe('AUTH (ログイン認証ガード)', () => {
  test('未ログインで / にアクセスすると /login へリダイレクトされる', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /日報管理/ })).toBeVisible({ timeout: 3000 });
  });

  test('🎮 デモでお試しボタンでログインし /today に到達できる', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /デモでお試し/ }).click();
    await expect(page).toHaveURL(/\/today$/, { timeout: 5000 });
  });

  test('メールアドレス+パスワードでログインできる', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill('hakuta@example.com');
    await page.locator('#login-password').fill('demo');
    await page.getByRole('button', { name: /^ログイン$/ }).click();
    await expect(page).toHaveURL(/\/today$/, { timeout: 5000 });
  });

  test('間違ったパスワードではエラーが表示される', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill('hakuta@example.com');
    await page.locator('#login-password').fill('wrong-password');
    await page.getByRole('button', { name: /^ログイン$/ }).click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 3000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('役割で選んでログインから上長アカウントを選べる', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /役割で選んでログイン/ }).click();
    await page.getByRole('button', { name: /佐藤 健一/ }).click();
    await expect(page).toHaveURL(/\/today$|\/dashboard$/, { timeout: 5000 });
  });
});
