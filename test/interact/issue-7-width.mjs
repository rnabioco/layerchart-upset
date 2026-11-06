// Browser checks for maxWidth / fit (issue #7).
// Usage: node test/interact/issue-7-width.mjs [baseUrl]  (dev server must be running)
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch(
	process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome' }
);
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(`${base}/gallery/layout`, { waitUntil: 'networkidle' });
await page.waitForSelector('section svg');

const section = (title) => page.locator('section', { has: page.locator('h2', { hasText: title }) });
let n = 0;
const ok = (name) => console.log(`ok ${++n} - ${name}`);
const scroller = (sec) => sec.locator('.upset-scroll');
const pageScroll = () =>
	page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);

// max_width_scrolls_inside_the_root
{
	const sec = section('maxWidth: scroll');
	const m = await scroller(sec).evaluate((e) => ({
		w: e.getBoundingClientRect().width,
		sw: e.scrollWidth,
		cw: e.clientWidth
	}));
	assert.ok(m.w <= 600, `wrapper width ${m.w}`);
	assert.ok(m.sw > m.cw, `scrollWidth ${m.sw} <= clientWidth ${m.cw}`);
	const doc = await pageScroll();
	assert.ok(doc[0] <= doc[1], `page scrolls horizontally ${doc}`);
	assert.equal(await sec.locator('.upset[data-upset="maxwidth"]').count(), 1);
	// the tooltip still lands on the hovered bar while the wrapper is scrolled
	await scroller(sec).evaluate((e) => (e.scrollLeft = 120));
	const bar = sec.locator('[data-upset-bar]').nth(5);
	await bar.hover();
	const tip = sec.locator('.upset-tooltip');
	await tip.waitFor();
	const tb = await tip.boundingBox();
	const bb = await bar.boundingBox();
	assert.ok(Math.abs(tb.x + tb.width / 2 - (bb.x + bb.width / 2)) < bb.width + 20, 'tooltip near bar');
	assert.ok(tb.y + tb.height <= bb.y + bb.height, 'tooltip above bar bottom');
	ok('max_width_scrolls_inside_the_root');
}

// fit_shrinks_cells_to_the_minimum
{
	const sec = section('fit: shrink');
	const w = await sec.locator('[data-upset-bar]').first().evaluate((e) => e.getBoundingClientRect().width);
	const box = await sec.locator('.upset').evaluate((e) => e.getBoundingClientRect().width);
	const wrap = await scroller(sec).evaluate((e) => [e.scrollWidth, e.clientWidth]);
	// default bandwidth is ~19.6; fit must shrink it, but never below the minimum cell
	assert.ok(w < 19.6 - 0.5, `bar width ${w}`);
	// band step is cell * n / (n + 0.3): d3 padding(0.3) applies to inner and outer padding
	const n = await sec.locator('[data-upset-bar]').count();
	assert.ok(w >= 12 * 0.7 * (n / (n + 0.3)) - 0.01, `bar width ${w} below minimum`);
	if (box <= 501) assert.ok(wrap[0] <= wrap[1] + 1, 'fits without scrolling');
	else assert.ok(wrap[0] > wrap[1], 'wider than the container but not scrollable');
	const doc = await pageScroll();
	assert.ok(doc[0] <= doc[1]);
	ok('fit_shrinks_cells_to_the_minimum');
}

// fit_fill_spans_the_container
{
	const sec = section('fit="fill"');
	const m = await sec.evaluate((el) => ({
		box: el.querySelector('[data-testid="fill-box"]').getBoundingClientRect().width,
		plot: el.querySelector('.upset').getBoundingClientRect().width,
		bars: el.querySelectorAll('[data-upset-bar]').length,
		bar: el.querySelector('[data-upset-bar]').getBoundingClientRect().width
	}));
	assert.equal(m.bars, 3, 'real columns unchanged');
	assert.ok(m.box - m.plot < 28 + 1, `plot ${m.plot} leaves more than a cell of the ${m.box}px container empty`);
	assert.ok(m.bar <= 28, `cells did not grow (bar ${m.bar})`);
	ok('fit_fill_spans_the_container');
}

// default_layout_is_unchanged
{
	await page.goto(`${base}/gallery/basics`, { waitUntil: 'networkidle' });
	await page.waitForSelector('section svg');
	const sec = section('Default').first();
	const m = await sec.locator('.upset').evaluate((e) => ({
		cols: getComputedStyle(e).gridTemplateColumns,
		w: e.getBoundingClientRect().width,
		wrapOverflow: getComputedStyle(e.parentElement).overflowX
	}));
	const bars = await sec.locator('[data-upset-bar]').count();
	assert.equal(m.wrapOverflow, 'visible');
	assert.ok(Math.abs(m.w - (150 + 120 + bars * 28)) < 1, `width ${m.w} for ${bars} bars`);
	assert.equal(m.cols, `150px ${120 + bars * 28}px`);
	ok('default_layout_is_unchanged');
}

// focus_scrolls_bar_into_view
{
	await page.goto(`${base}/gallery/layout`, { waitUntil: 'networkidle' });
	await page.waitForSelector('section svg');
	const sec = section('maxWidth: scroll');
	const wrap = scroller(sec);
	await wrap.evaluate((e) => (e.scrollLeft = 0));
	const bars = sec.locator('[data-upset-bar]');
	await bars.first().focus();
	await page.keyboard.press('End');
	const inView = await bars.last().evaluate((e) => {
		const b = e.getBoundingClientRect();
		const r = e.closest('.upset-scroll').getBoundingClientRect();
		return b.left >= r.left - 1 && b.right <= r.right + 1;
	});
	assert.ok(inView, 'last bar not scrolled into view');
	assert.ok((await wrap.evaluate((e) => e.scrollLeft)) > 0);
	const doc = await pageScroll();
	assert.ok(doc[0] <= doc[1]);
	ok('focus_scrolls_bar_into_view');
}

await browser.close();
