// Browser test for the deviation view: one expected-size tick per column, sorted by deviation, in the tooltip.
// Usage: node test/interact/deviation.mjs [baseUrl]
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch(
	process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome' }
);
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(`${base}/gallery/scales`, { waitUntil: 'networkidle' });
await page.waitForSelector('section svg');

let n = 0;
const ok = (name) => console.log(`ok ${++n} - ${name}`);
const sec = page.locator('section', { has: page.locator('h2', { hasText: 'Deviation from independence' }) });
const bars = sec.locator('[data-upset-bar]');
const ticks = sec.locator('[data-upset-expected]');
assert.equal(await ticks.count(), await bars.count(), 'one expected tick per column');
ok('one expected tick per column');

assert.match(await bars.first().getAttribute('data-tip'), /expected \d+ \([+−]\d+\)/);
ok('tooltip text carries expected and deviation');

// Sorted by deviation, not size: observed minus expected must be non-increasing left to right.
const devs = await sec.evaluate((el) =>
	[...el.querySelectorAll('[data-upset-bar]')].map((b) => {
		const t = el.querySelector(`[data-upset-expected][data-id="${CSS.escape(b.getAttribute('data-id'))}"]`);
		return Number(b.getAttribute('data-n')) - Number(t.getAttribute('data-upset-expected'));
	})
);
for (let i = 1; i < devs.length; i++) assert.ok(devs[i] <= devs[i - 1] + 1e-6, `deviation order at ${i}: ${devs}`);
ok('columns are ordered by deviation, descending');

await browser.close();
