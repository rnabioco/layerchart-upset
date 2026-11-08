// Browser test: set-size axis tick labels sit above the first row, clear of the set bars and their count labels.
// Usage: node test/interact/set-tick-position.mjs [baseUrl]
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch(
	process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome' }
);
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(`${base}/gallery/scales`, { waitUntil: 'networkidle' });
await page.waitForSelector('section svg');

const sec = page.locator('section', { has: page.locator('h2', { hasText: 'Size scale (bound)' }) });
await sec.locator('[data-upset-scale-toggle]').click(); // linear -> symlog: the set panel now has ticks
const ticks = sec.locator('text[data-upset-set-tick], [data-upset-set-tick] ~ text, .upset-set-tick');
await ticks.first().waitFor();

const { tickBottoms, rowTop, labelTops } = await sec.evaluate((el) => {
	const bars = [...el.querySelectorAll('[data-upset-set-bar]')];
	const rowTop = Math.min(...bars.map((b) => b.getBoundingClientRect().top));
	const tickBottoms = [...el.querySelectorAll('.upset-set-tick')].map((t) => t.getBoundingClientRect().bottom);
	const svg = bars[0].closest('svg');
	const labelTops = [...svg.querySelectorAll('text.upset-label:not(.upset-set-tick)')].map(
		(t) => t.getBoundingClientRect().top
	);
	return { tickBottoms, rowTop, labelTops };
});

assert.ok(tickBottoms.length >= 2, `expected set ticks, got ${tickBottoms.length}`);
for (const b of tickBottoms) assert.ok(b <= rowTop + 0.5, `tick label bottom ${b} overlaps first row (top ${rowTop})`);
assert.ok(labelTops.length > 0, 'set count labels present');
for (const b of tickBottoms)
	for (const t of labelTops) assert.ok(b <= t + 0.5, `tick label (bottom ${b}) overlaps a count label (top ${t})`);
console.log('ok 1 - set_tick_labels_clear_of_rows_and_counts');

await browser.close();
