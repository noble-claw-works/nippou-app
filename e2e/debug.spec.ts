import { test, expect } from '@playwright/test';

test('debug: DOM structure after report creation', async ({ page }) => {
  await page.goto('/');

  // 日報作成
  const startBtn = page.getByText('日報を作成する');
  if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await startBtn.click();
    await page.getByText('白紙から始める').click();
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: '/tmp/after_create.png' });

  // タイムライン列のクラスを確認
  const indigoDivs = await page.$$eval('div', els =>
    els
      .map(el => el.className)
      .filter(c => c.includes('indigo') || c.includes('emerald') || c.includes('crosshair'))
      .slice(0, 20)
  );
  console.log('Timeline related classes:', JSON.stringify(indigoDivs, null, 2));

  // crosshair cursor の要素があるか
  const crosshairEl = page.locator('[style*="crosshair"]').first();
  const box = await crosshairEl.boundingBox().catch(() => null);
  console.log('crosshair element box:', box);

  // 追加ボタンのテキスト確認
  const addBtns = await page.$$eval('button', btns =>
    btns.map(b => b.textContent?.trim()).filter(t => t && t.length < 20)
  );
  console.log('Buttons:', addBtns.slice(0, 20));
});
