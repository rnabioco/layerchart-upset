// Browser test: powerTicks labels power-of-ten ticks of a log axis as 10^n.
// Usage: node test/interact/power-ticks.mjs [baseUrl]
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch(
	process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome' }
);
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(`${base}/gallery/scales`, { waitUntil: 'networkidle' });
await page.waitForSelector('section svg');

const sec = page.locator('section', { has: page.locator('h2', { hasText: 'Power-of-ten ticks' }) });
const axis = (await sec.locator('.tick text, .upset-set-tick').allTextContents()).map((t) => t.trim());
assert.ok(axis.some((t) => /^10[⁰¹²³⁴⁵⁶⁷⁸⁹]+$/.test(t)), `expected 10^n tick labels, got ${axis}`);
assert.ok(!axis.includes('1000'), 'no plain 1000 tick');
const bars = (await sec.locator('[data-upset-count]').allTextContents()).map((t) => t.trim());
assert.ok(bars.includes('1000'), `bar labels keep plain numbers, got ${bars}`);
console.log('ok 1 - power_ticks_label_axis_only');

await browser.close();
