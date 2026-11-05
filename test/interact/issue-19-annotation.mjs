// Browser test for the annotation row (spec S10).
// Usage: node test/interact/issue-19-annotation.mjs [baseUrl]
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch(
	process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome' }
);
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(`${base}/gallery/layout`, { waitUntil: 'networkidle' });
await page.waitForSelector('section svg');

let n = 0;
const ok = (name) => console.log(`ok ${++n} - ${name}`);
const section = (title) => page.locator('section', { has: page.locator('h2', { hasText: title }) });
const rows = (loc) => loc.locator('.upset').first().evaluate((e) => getComputedStyle(e).gridTemplateRows.split(' ').length);

// default layout: no annotation row, two grid rows
const plain = section('Axis titles');
assert.equal(await plain.locator('[data-upset-annotations]').count(), 0);
assert.equal(await rows(plain), 2);
ok('annotation_row_absent_by_default');

const ann = page.locator('[data-testid="annotated"]');
assert.equal(await rows(ann), 3);
const cells = await ann.locator('[data-upset-annotation]').evaluateAll((els) =>
	els.map((e) => ({ id: e.getAttribute('data-upset-annotation'), r: e.getBoundingClientRect().toJSON(), text: e.textContent.trim() }))
);
const cols = await ann.locator('[data-upset-column]').evaluateAll((els) =>
	els.map((e) => ({ id: e.getAttribute('data-upset-column'), r: e.getBoundingClientRect().toJSON() }))
);
assert.ok(cells.length > 3 && cells.length === cols.length);
for (const c of cells) {
	const col = cols.find((x) => x.id === c.id);
	const center = (r) => r.left + r.width / 2;
	assert.ok(Math.abs(center(c.r) - center(col.r)) < 1.5, `aligned ${c.id}`);
	assert.match(c.text, /^\d+%$/);
}
// the row sits between the bars and the matrix
const barBottom = await ann.locator('[data-upset-bar]').first().evaluate((e) => e.getBoundingClientRect().bottom);
const dotTop = await ann.locator('[data-upset-column] circle').first().evaluate((e) => e.getBoundingClientRect().top);
assert.ok(cells[0].r.top >= barBottom - 1 && cells[0].r.bottom <= dotTop + 1, 'between bars and matrix');
ok('annotation_aligned_with_columns');

await ann.locator('[data-upset-bar]').first().click();
const ops = await ann.locator('[data-upset-annotation]').evaluateAll((els) => els.map((e) => ({ id: e.getAttribute('data-upset-annotation'), o: Number(getComputedStyle(e).opacity) })));
const sel = await ann.locator('[data-upset-bar]').first().getAttribute('data-id');
for (const o of ops) assert.equal(o.o, o.id === sel ? 1 : 0.3, o.id);
ok('annotation_follows_dimming');

await browser.close();
