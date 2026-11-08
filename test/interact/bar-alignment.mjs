// Browser test: size bars and their count labels are centred on the matrix columns/rows (dots).
// Usage: node test/interact/bar-alignment.mjs [baseUrl]
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
const m = await sec.evaluate((el) => {
	const mid = (r, axis) => (axis === 'x' ? r.left + r.width / 2 : r.top + r.height / 2);
	const uniq = (a) => [...new Set(a.map((v) => Math.round(v * 2) / 2))].sort((x, y) => x - y);
	const dots = [...el.querySelectorAll('circle')].map((c) => c.getBoundingClientRect());
	const cols = uniq(dots.map((d) => mid(d, 'x')));
	const rows = uniq(dots.map((d) => mid(d, 'y')));
	const bars = [...el.querySelectorAll('[data-upset-bar]')].map((b) => mid(b.getBoundingClientRect(), 'x'));
	const counts = [...el.querySelectorAll('[data-upset-count]')].map((t) => mid(t.getBoundingClientRect(), 'x'));
	const setBars = [...el.querySelectorAll('[data-upset-set-bar]')].map((b) => mid(b.getBoundingClientRect(), 'y'));
	return { cols, rows, bars, counts, setBars };
});

const near = (a, b, what) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) <= 1, `${what} ${i}: ${v} vs ${b[i]}`));
assert.equal(m.bars.length, m.cols.length, 'one bar per matrix column');
near(m.bars, m.cols, 'intersection bar centre vs dot column');
near(m.counts, m.cols, 'count label centre vs dot column');
assert.equal(m.setBars.length, m.rows.length, 'one set bar per matrix row');
near(m.setBars, m.rows, 'set bar centre vs dot row');
console.log('ok 1 - bars_and_labels_centred_on_matrix');

await browser.close();
