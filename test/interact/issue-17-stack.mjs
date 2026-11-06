// Browser test for stacked bars (spec S9).
// Usage: node test/interact/issue-17-stack.mjs [baseUrl]
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
const chart = page.locator('[data-testid="stacked"]');

const bars = await chart.locator('[data-upset-bar]').evaluateAll((els) =>
	els.map((e) => ({ id: e.getAttribute('data-id'), n: Number(e.getAttribute('data-n')), h: e.getBoundingClientRect().height }))
);
const segs = await chart.locator('[data-upset-stack]').evaluateAll((els) =>
	els.map((e) => ({
		cat: e.getAttribute('data-upset-stack'),
		id: e.getAttribute('data-id'),
		n: Number(e.getAttribute('data-n')),
		h: e.getBoundingClientRect().height,
		fill: e.getAttribute('fill') ?? getComputedStyle(e).fill
	}))
);
for (const b of bars) {
	const mine = segs.filter((s) => s.id === b.id);
	assert.equal(mine.reduce((t, s) => t + s.n, 0), b.n, `segments sum to ${b.id}`);
	assert.ok(Math.abs(mine.reduce((t, s) => t + s.h, 0) - b.h) < 1, `heights fill the bar ${b.id}`);
}
const cats = [...new Set(segs.map((s) => s.cat))];
assert.deepEqual(cats.sort(), ['1990s', '2000s', '2010s']);
ok('stack_segments_sum_to_size');

const fills = new Map(segs.map((s) => [s.cat, s.fill]));
assert.equal(new Set(fills.values()).size, 3, 'one color per category');
const legend = await chart.locator('[data-upset-legend-item]').allTextContents();
assert.deepEqual(legend.map((t) => t.trim()).sort(), ['1990s', '2000s', '2010s']);
ok('stack_legend_matches_segments');

const first = chart.locator('[data-upset-bar]').first();
assert.equal(await first.evaluate((e) => getComputedStyle(e).pointerEvents !== 'none'), true);
await first.click();
assert.equal(await first.getAttribute('aria-pressed'), 'true');
const dimmed = await chart.locator('[data-upset-stack]').evaluateAll((els) => els.map((e) => Number(getComputedStyle(e).fillOpacity)));
assert.ok(dimmed.some((o) => o < 1) && dimmed.some((o) => o === 1), 'segments follow dimming');
ok('stack_keeps_selection');

assert.match(await first.getAttribute('data-tip'), / · (1990s|2000s|2010s): \d+/);
ok('stack_counts_in_tooltip_text');

// stack_from_precomputed_segments
{
	const c = page.locator('[data-testid="stacked-counts"]');
	const segs = await c.locator('[data-upset-stack]').evaluateAll((els) =>
		els.map((e) => ({ cat: e.getAttribute('data-upset-stack'), id: e.getAttribute('data-id'), n: Number(e.getAttribute('data-n')) }))
	);
	const sum = (id, cat) => segs.filter((g) => g.id === id && (!cat || g.cat === cat)).reduce((a, g) => a + g.n, 0);
	assert.equal(sum('A'), 40);
	assert.equal(sum('A&B', 'SE'), 10);
	assert.equal(sum('A&B', '(none)'), 8, 'shortfall against size is (none)');
	assert.equal(sum('C'), 20);
	ok('stack_from_precomputed_segments');
}

await browser.close();
