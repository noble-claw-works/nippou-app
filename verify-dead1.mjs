import { chromium } from 'playwright';
const today = new Date().toISOString().slice(0,10);
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('console', m => console.log('[browser]', m.type(), m.text()));

// staging に直接アクセス
const url = `https://staging--nippou-app-ncw.netlify.app/reports/${today}`;
console.log('Opening:', url);
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

// 現在のスクリーンショット
await page.screenshot({ path: '/tmp/dead1-staging.png', fullPage: true });
console.log('Screenshot saved: /tmp/dead1-staging.png');

// DOM 内に "期限切れ" or bg-red-50 があるか確認
const html = await page.content();
console.log('期限切れ in HTML:', (html.match(/期限切れ/g) || []).length);
console.log('bg-red-50 in HTML:', (html.match(/bg-red-50/g) || []).length);
console.log('Title:', await page.title());
console.log('Body excerpt:', (await page.locator('body').innerText()).slice(0, 500));

await browser.close();
