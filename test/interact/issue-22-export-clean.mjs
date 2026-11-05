// Browser test for neutral-state export: `clean: true` drops selection outline and dimming.
// Usage: node test/interact/issue-22-export-clean.mjs [baseUrl]
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch(
	process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome' }
);
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(`${base}/gallery/interaction`, { waitUntil: 'networkidle' });
await page.waitForSelector('section svg');

let n = 0;
const ok = (name) => console.log(`ok ${++n} - ${name}`);
const sel = page.locator('section', { has: page.locator('h2', { hasText: 'Selection and highlighting' }) });
await sel.locator('[data-upset-bar]').first().click();
assert.ok(await sel.locator('[data-upset-clear]').count(), 'a column is selected');

// The dev server serves the library source, so the exporter can be imported in the page.
const run = (clean) =>
	page.evaluate(
		async (clean) => {
			const { exportSVG } = await import('/src/lib/index.ts');
			const box = [...document.querySelectorAll('section')].find((s) =>
				s.querySelector('h2')?.textContent?.includes('Selection and highlighting')
			);
			const svg = exportSVG(box.querySelector('.chart') ?? box, clean ? { clean: true } : {});
			const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
			const style = (e, p) => new RegExp(`(?:^|;)${p}:([^;]+);`).exec(e.getAttribute('style') ?? '')?.[1];
			const marks = [...doc.querySelectorAll('[data-upset-bar],[data-upset-column]')];
			return {
				err: doc.querySelector('parsererror')?.textContent ?? null,
				marks: marks.length,
				dimmed: marks.filter((e) =>
					[style(e, 'opacity'), style(e, 'fill-opacity')].some((v) => Number(v) > 0 && Number(v) < 1)
				).length,
				outlined: [...doc.querySelectorAll('[data-upset-bar]')].filter(
					(e) => style(e, 'stroke') !== 'none' && parseFloat(style(e, 'stroke-width')) > 0
				).length,
				fonts: [...doc.querySelectorAll('text')].every((t) => t.getAttribute('font-family') && t.getAttribute('font-size')),
				texts: doc.querySelectorAll('text').length
			};
		},
		clean
	);

const dirty = await run(false);
assert.equal(dirty.err, null);
assert.ok(dirty.dimmed > 0, 'default export keeps the dimming');
assert.ok(dirty.outlined > 0, 'default export keeps the selection outline');
ok('default_export_unchanged');

const clean = await run(true);
assert.equal(clean.err, null);
assert.equal(clean.marks, dirty.marks);
assert.equal(clean.dimmed, 0, 'no dimmed marks');
assert.equal(clean.outlined, 0, 'no selection outline');
ok('clean_export_has_neutral_marks');

assert.ok(clean.texts > 0 && clean.fonts, 'text carries font-family and font-size');
ok('text_has_inline_font');

await browser.close();
