// Browser test: one box plot per column in the annotation row, aligned with the bars (runs in CI only).
// Usage: node test/interact/issue-23-boxplot.mjs [baseUrl]
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch(
	process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome' }
);
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(`${base}/gallery/layout`, { waitUntil: 'networkidle' });
const chart = page.locator('[data-testid="boxplots"]');
await chart.locator('[data-upset-bar]').first().waitFor();

const bars = await chart.locator('[data-upset-bar]').evaluateAll((els) =>
	els.map((e) => ({ id: e.getAttribute('data-id'), r: e.getBoundingClientRect().toJSON() }))
);
const boxes = await chart.locator('[data-upset-annotation]').evaluateAll((els) =>
	els.map((e) => ({ id: e.getAttribute('data-upset-annotation'), n: e.querySelectorAll('svg[data-boxplot] rect').length, r: e.getBoundingClientRect().toJSON() }))
);
assert.equal(boxes.length, bars.length);
for (const b of boxes) {
	assert.equal(b.n, 1, `one box for ${b.id}`);
	const bar = bars.find((x) => x.id === b.id);
	assert.ok(Math.abs(b.r.left + b.r.width / 2 - (bar.r.left + bar.r.width / 2)) < 1.5, `aligned ${b.id}`);
}
console.log('ok 1 - one_boxplot_per_column_aligned');
await browser.close();
