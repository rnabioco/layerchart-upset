// Browser interaction test for onselect's `previous` argument (issue #4).
// Usage: node test/interact/issue-4-onselect-previous.mjs [baseUrl]  (dev server must be running)
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch(
	process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome' }
);
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(`${base}/gallery/interaction`, { waitUntil: 'networkidle' });
await page.waitForSelector('section svg');

const sec = page.locator('section', { has: page.locator('h2', { hasText: 'onselect previous argument' }) });
const bars = sec.locator('[data-upset-bar]');
const calls = async () => ((await sec.locator('[data-calls]').textContent()) ?? '').split('\n').filter(Boolean);
let n = 0;
const ok = (name) => console.log(`ok ${++n} - ${name}`);

try {
	assert.ok((await bars.count()) >= 2);
	const a = await bars.nth(0).getAttribute('data-id');
	const b = await bars.nth(1).getAttribute('data-id');

	// Escape with no selection stays silent
	await bars.nth(0).focus();
	await page.keyboard.press('Escape');
	assert.deepEqual(await calls(), []);
	ok('escape_without_selection_is_silent');

	await bars.nth(0).click();
	await bars.nth(1).click();
	assert.deepEqual(await calls(), [`${a},null`, `${b},${a}`]);

	// pressing the selected bar clears it and reports it
	await bars.nth(1).click();
	assert.equal((await calls()).at(-1), `null,${b}`);
	ok('deselect_reports_the_cleared_intersection');

	await bars.nth(0).click();
	await bars.nth(0).focus();
	await page.keyboard.press('Escape');
	assert.deepEqual((await calls()).slice(-2), [`${a},null`, `null,${a}`]);
	ok('escape_reports_the_cleared_intersection');
} finally {
	await browser.close();
}
