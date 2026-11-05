// Browser test for empty intersections and SVG/PNG export (specs S7, S8).
// Usage: node test/interact/issue-14-empty-export.mjs [baseUrl]
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch(
	process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome' }
);
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(`${base}/gallery`, { waitUntil: 'networkidle' });
await page.waitForSelector('section svg');

let n = 0;
const ok = (name) => console.log(`ok ${++n} - ${name}`);
const sec = page.locator('section', { has: page.locator('h2', { hasText: 'Empty intersections and export' }) });

// -- S7 ------------------------------------------------------------------------------------------
const bars = await sec.locator('[data-upset-bar]').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-n'))));
assert.equal(bars.length, 15, '2^4 - 1 columns');
assert.ok(bars.some((v) => v === 0), 'has empty columns');
ok('show_empty_draws_zero_columns');

await sec.locator('[data-upset-scale-toggle]').click();
assert.equal(await sec.locator('.upset').getAttribute('data-scale'), 'symlog');
ok('toggle_picks_symlog_with_zeros');

// -- S8 ------------------------------------------------------------------------------------------
await sec.locator('[data-testid="export-run"]').click();
await page.waitForFunction(() => document.querySelector('[data-testid="export-png"]')?.textContent?.startsWith('image/png'));
const svg = await sec.locator('[data-testid="export-svg"]').textContent();

const info = await page.evaluate((s) => {
	const doc = new DOMParser().parseFromString(s, 'image/svg+xml');
	const bars = [...doc.querySelectorAll('[data-upset-bar]')];
	return {
		err: doc.querySelector('parsererror')?.textContent ?? null,
		bars: bars.length,
		panels: doc.documentElement.querySelectorAll(':scope > svg').length,
		fills: bars.map((b) => /fill:([^;]+);/.exec(b.getAttribute('style') ?? '')?.[1]),
		classes: doc.querySelectorAll('[class]').length,
		vars: (s.match(/var\(--/g) ?? []).length
	};
}, svg);
assert.equal(info.err, null);
assert.equal(info.panels, 3);
assert.equal(info.bars, 15, 'every bar present');
ok('export_svg_has_all_bars');

assert.ok(info.fills.every((f) => f && f !== 'none' && !f.includes('var(')), JSON.stringify(info.fills));
assert.equal(info.classes, 0);
assert.equal(info.vars, 0);
ok('export_inlines_colors');

const png = await sec.locator('[data-testid="export-png"]').textContent();
assert.ok(Number(png.split(':')[1]) > 2000, png);
ok('export_png_is_a_png');

await browser.close();
