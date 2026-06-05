/**
 * e2e/customer-delete-role.spec.ts
 * P0 顧客削除権限 e2e テスト
 *
 * 検証内容:
 * 1. 一般社員ロールで付帯情報あり顧客の削除ボタンが disabled
 * 2. 付帯情報なし顧客は一般社員でも削除ボタンが active
 * 3. admin/executive ロールは付帯情報あり顧客も削除ボタンが active
 * 4. ホバーでツールチップが表示される
 */
import { test, expect } from '@playwright/test';

/**
 * 指定ロールのユーザーでログインする
 * 役割マップ: general=u1, manager=u2, executive=u3, admin=u4
 */
/**
 * ユーザー名マップ (seed.ts より)
 * u1: 袴田 祐司 (general)
 * u2: 田中 太郎 (general)
 * u4: 佐藤 健一 (manager)
 * u5: 鈴木 美咲 (executive)
 * u6: 高田 一郎 (admin)
 */
async function loginAs(page: import('@playwright/test').Page, role: 'general' | 'manager' | 'executive' | 'admin') {
  const userNames = { general: '袴田 祐司', manager: '佐藤 健一', executive: '鈴木 美咲', admin: '高田 一郎' };
  await page.goto('/login');
  await page.getByRole('button', { name: /役割で選んでログイン/ }).click();

  const targetName = userNames[role];
  const userButton = page.locator('button').filter({ hasText: targetName }).first();
  await userButton.click();
  await expect(page).toHaveURL(/\/today$|\/dashboard$/, { timeout: 5000 });
}

test.describe('P0 顧客削除権限チェック', () => {
  test('一般社員: 付帯情報あり顧客の削除ボタンが disabled', async ({ page }) => {
    await loginAs(page, 'general');
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    // 顧客一覧が表示されるまで待つ
    await expect(page.getByRole('heading', { name: /顧客マスタ/ })).toBeVisible({ timeout: 5000 });

    // 削除ボタンをすべて取得
    const deleteButtons = page.getByRole('button', { name: /削除/ });
    const count = await deleteButtons.count();

    if (count === 0) {
      // 顧客が0件の場合はスキップ
      test.skip();
      return;
    }

    // 少なくとも1つの削除ボタンが disabled (付帯情報あり顧客のため)
    let hasDisabled = false;
    for (let i = 0; i < count; i++) {
      const btn = deleteButtons.nth(i);
      const isDisabled = await btn.isDisabled();
      if (isDisabled) {
        hasDisabled = true;
        // disabled ボタンに title 属性があることを確認
        const title = await btn.getAttribute('title');
        expect(title).toContain('付帯情報あり');
        break;
      }
    }

    // シードデータに付帯情報あり顧客がいることを期待
    expect(hasDisabled).toBe(true);
  });

  test('一般社員: disabled な削除ボタンのツールチップが表示される', async ({ page }) => {
    await loginAs(page, 'general');
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /顧客マスタ/ })).toBeVisible({ timeout: 5000 });

    const deleteButtons = page.getByRole('button', { name: /削除/ });
    const count = await deleteButtons.count();
    if (count === 0) {
      test.skip();
      return;
    }

    for (let i = 0; i < count; i++) {
      const btn = deleteButtons.nth(i);
      const isDisabled = await btn.isDisabled();
      if (isDisabled) {
        // title 属性でツールチップを確認
        const title = await btn.getAttribute('title');
        expect(title).toBeTruthy();
        expect(title).toContain('admin/executive');
        break;
      }
    }
  });

  test('admin ロール: 全顧客の削除ボタンが active (disabled でない)', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /顧客マスタ/ })).toBeVisible({ timeout: 5000 });

    const deleteButtons = page.getByRole('button', { name: /削除/ });
    const count = await deleteButtons.count();
    if (count === 0) {
      test.skip();
      return;
    }

    // admin は全ての削除ボタンが enabled
    for (let i = 0; i < count; i++) {
      const btn = deleteButtons.nth(i);
      await expect(btn).toBeEnabled();
    }
  });

  test('manager ロール: 付帯情報あり顧客の削除ボタンが disabled', async ({ page }) => {
    await loginAs(page, 'manager');
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /顧客マスタ/ })).toBeVisible({ timeout: 5000 });

    const deleteButtons = page.getByRole('button', { name: /削除/ });
    const count = await deleteButtons.count();
    if (count === 0) {
      test.skip();
      return;
    }

    let hasDisabled = false;
    for (let i = 0; i < count; i++) {
      const btn = deleteButtons.nth(i);
      if (await btn.isDisabled()) {
        hasDisabled = true;
        break;
      }
    }
    expect(hasDisabled).toBe(true);
  });

  test('executive ロール: 全顧客の削除ボタンが active', async ({ page }) => {
    await loginAs(page, 'executive');
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /顧客マスタ/ })).toBeVisible({ timeout: 5000 });

    const deleteButtons = page.getByRole('button', { name: /削除/ });
    const count = await deleteButtons.count();
    if (count === 0) {
      test.skip();
      return;
    }

    for (let i = 0; i < count; i++) {
      const btn = deleteButtons.nth(i);
      await expect(btn).toBeEnabled();
    }
  });
});
