// Browser test for query overlays (spec S6).
// Usage: node test/interact/issue-16-queries.mjs [baseUrl]
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch(
	process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome' }
);
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(`${base}/gallery/data`, { waitUntil: 'networkidle' });
await page.waitForSelector('section svg');

let n = 0;
const ok = (name) => console.log(`ok ${++n} - ${name}`);
const chart = page.locator('[data-testid="queries"]');

const bars = await chart.locator('[data-upset-bar]').evaluateAll((els) =>
	els.map((e) => ({ id: e.getAttribute('data-id'), n: Number(e.getAttribute('data-n')), h: e.getBoundingClientRect().height }))
);
assert.ok(bars.length > 3);

const overlays = await chart.locator('[data-upset-query]').evaluateAll((els) =>
	els.map((e) => ({
		q: e.getAttribute('data-upset-query'),
		id: e.getAttribute('data-id'),
		n: Number(e.getAttribute('data-n')),
		h: e.getBoundingClientRect().height
	}))
);
assert.ok(overlays.some((o) => o.q === 'first half') && overlays.some((o) => o.q === 'every 10th'));
for (const o of overlays) {
	const bar = bars.find((b) => b.id === o.id);
	assert.ok(o.n > 0 && o.n <= bar.n, `${o.q} ${o.id}`);
	assert.ok(o.h <= bar.h + 0.5, 'overlay is never taller than its bar');
	// height is proportional to the count (same linear scale as the bar)
	assert.ok(Math.abs(o.h / o.n - bar.h / bar.n) < 0.6, `scale ${o.q} ${o.id}`);
}
ok('query_overlay_heights');

const pe = await chart.locator('[data-upset-query]').first().evaluate((e) => getComputedStyle(e).pointerEvents);
assert.equal(pe, 'none');
const first = chart.locator('[data-upset-bar]').first();
await first.click();
assert.equal(await first.getAttribute('aria-pressed'), 'true');
ok('query_does_not_block_select');

const tip = await first.getAttribute('data-tip');
assert.match(tip, / · first half: \d+ · every 10th: \d+$/);
ok('query_counts_in_tooltip_text');

await browser.close();
