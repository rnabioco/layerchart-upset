// Browser test for per-set hover linking: hovering a set bar dims the columns that lack the set.
// Usage: node test/interact/issue-21-set-hover.mjs [baseUrl]
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
const bars = sel.locator('[data-upset-bar]');
const opacities = () => bars.evaluateAll((els) => els.map((e) => Number(e.getAttribute('fill-opacity') ?? 1)));

assert.ok((await opacities()).every((o) => o === 1), 'nothing dimmed at rest');
ok('no_dimming_at_rest');

await sel.locator('[data-upset-set-bar]').first().hover();
const dimmed = await opacities();
assert.ok(dimmed.some((o) => o < 1), 'non-member columns dim');
assert.ok(dimmed.some((o) => o === 1), 'member columns stay');
assert.match(await sel.locator('[data-set-hover]').innerText(), /hovered set: (?!none)\S+/);
assert.match(await sel.locator('small').first().innerText(), /selected: none/, 'hover did not select');
ok('hover_dims_non_members_without_selecting');

await page.mouse.move(5, 5);
assert.ok((await opacities()).every((o) => o === 1), 'dimming cleared');
assert.match(await sel.locator('[data-set-hover]').innerText(), /hovered set: none/);
ok('leave_restores');

await browser.close();
