/**
 * E2E テスト: Today ページ (Playwright)
 *
 * 実行方法:
 *   pnpm exec playwright test e2e/today.spec.ts
 *
 * 前提: Playwright がインストールされ、dev サーバーが http://localhost:5173 で起動していること
 *       または baseURL を設定した playwright.config.ts を用意すること
 */
import { test, expect, type Page } from '@playwright/test';

// ─── helpers ──────────────────────────────────────────────────────────────────

/** 日報がなければ「白紙から始める」で作成する */
async function ensureReport(page: Page) {
  const startBtn = page.getByText('日報を作成する');
  if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await startBtn.click();
    await page.getByText('白紙から始める').click();
    await expect(page.locator('[data-testid="timeline"], .grid')).toBeVisible({ timeout: 5000 });
  }
}

/** 指定列をドラッグして仮ブロックを作成し、ChipPopover を表示する */
async function dragToCreateBlock(page: Page, colSelector: string, fromRatio = 0.3, toRatio = 0.4) {
  const col = page.locator(colSelector).first();
  const box = await col.boundingBox();
  if (!box) throw new Error(`column not found: ${colSelector}`);

  const x = box.x + box.width / 2;
  const fromY = box.y + box.height * fromRatio;
  const toY   = box.y + box.height * toRatio;

  await page.mouse.move(x, fromY);
  await page.mouse.down();
  await page.mouse.move(x, toY, { steps: 10 });
  await page.mouse.up();
}

// ─── テスト ───────────────────────────────────────────────────────────────────

test.describe('Today Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await ensureReport(page);
  });

  /**
   * テスト1: 予定列をドラッグ → ダイアログが「📋 予定を追加」タイトルで開く
   */
  test('予定列ドラッグ → 予定追加ダイアログが開く', async ({ page }) => {
    // 予定列: bg-indigo-50/20 クラスを持つ列
    await dragToCreateBlock(page, '[class*="bg-indigo-50"]');

    // ChipPopover または種別選択が表示される
    // 「種別未指定でダイアログを開く」をクリック
    const withoutType = page.getByText('種別未指定でダイアログを開く');
    if (await withoutType.isVisible({ timeout: 2000 }).catch(() => false)) {
      await withoutType.click();
    }

    // ダイアログが「📋 予定を追加」タイトルで開く
    await expect(page.getByText('📋 予定を追加')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('キャンセル')).toBeVisible();
  });

  /**
   * テスト2: 実績列をドラッグ → ダイアログが「✅ 実績を追加」タイトルで開く
   */
  test('実績列ドラッグ → 実績追加ダイアログが開く', async ({ page }) => {
    // 実績列: bg-emerald-50/20 クラスを持つ列
    await dragToCreateBlock(page, '[class*="bg-emerald-50"]');

    const withoutType = page.getByText('種別未指定でダイアログを開く');
    if (await withoutType.isVisible({ timeout: 2000 }).catch(() => false)) {
      await withoutType.click();
    }

    await expect(page.getByText('✅ 実績を追加')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('キャンセル')).toBeVisible();
  });

  /**
   * テスト3: visit ブロック保存 → 顧客対応サマリーに表示される
   */
  test('visit ブロック保存 → 顧客対応サマリーに表示', async ({ page }) => {
    // 実績列のプラスボタンからダイアログを開く
    await page.getByRole('button', { name: '+ 追加' }).last().click();
    await expect(page.getByText('✅ 実績を追加')).toBeVisible({ timeout: 3000 });

    // 訪問を選択
    await page.getByRole('button', { name: /🤝\s*訪問/ }).click();

    // タイトル入力
    await page.getByPlaceholder('活動内容を入力').fill('テスト訪問');

    // 訪問結果フィールドが展開されていることを確認
    await expect(page.getByText('🤝 訪問結果')).toBeVisible();

    // 保存
    await page.getByRole('button', { name: '✓ 保存' }).click();

    // サイドパネルに「顧客対応サマリー」が表示される
    await expect(page.getByText('👥 顧客対応サマリー')).toBeVisible({ timeout: 3000 });
  });

  /**
   * テスト4: 実績化ボタン → 実績列にブロックが追加される
   */
  test('予定ブロック → 実績化ボタンで実績列に追加', async ({ page }) => {
    // 予定列にブロックを追加
    await page.getByRole('button', { name: '+ 追加' }).first().click();
    await expect(page.getByText('📋 予定を追加')).toBeVisible({ timeout: 3000 });
    await page.getByPlaceholder('活動内容を入力').fill('予定テスト');
    await page.getByRole('button', { name: '✓ 保存' }).click();

    // 予定ブロックが表示される
    await expect(page.getByText('予定テスト')).toBeVisible({ timeout: 3000 });

    // ブロックにホバーして実績化ボタンを表示
    const block = page.getByText('予定テスト').first();
    await block.hover();

    // 実績化ボタンをクリック
    const actualizeBtn = page.getByRole('button', { name: /✅\s*実績化/ });
    await actualizeBtn.waitFor({ state: 'visible', timeout: 3000 });
    await actualizeBtn.click();

    // トースト「実績ブロックを生成しました」が表示される
    await expect(page.getByText(/実績ブロックを生成しました/)).toBeVisible({ timeout: 3000 });
  });
});
