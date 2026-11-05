// Browser test for set-row selection (spec S5).
// Usage: node test/interact/issue-9-set-select.mjs [baseUrl]
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
const section = (title) => page.locator('section', { has: page.locator('h2', { hasText: title }) });
const opacities = (sec) =>
	sec.locator('[data-upset-bar]').evaluateAll((els) =>
		els.map((e) => ({ id: e.getAttribute('data-id'), o: Number(getComputedStyle(e).fillOpacity) }))
	);

// -- bound ---------------------------------------------------------------------------------------
const bound = section('Set selection (bound)');
const value = bound.locator('[data-testid="set-bound"]');
assert.equal((await value.innerText()).trim(), 'none');
assert.ok((await opacities(bound)).every((b) => b.o === 1), 'nothing dimmed at first');

await bound.locator('[data-upset-set-bar="Drama"]').click();
assert.equal((await value.innerText()).trim(), 'Drama');
const dimmed = await opacities(bound);
assert.ok(dimmed.some((b) => b.id.split('&').includes('Drama')) && dimmed.some((b) => !b.id.split('&').includes('Drama')));
for (const b of dimmed) assert.equal(b.o, b.id.split('&').includes('Drama') ? 1 : 0.3, b.id);
assert.equal(await bound.locator('[data-upset-set-bar="Drama"]').getAttribute('aria-pressed'), 'true');
assert.equal(await bound.locator('[data-upset-set-bar="Comedy"]').getAttribute('aria-pressed'), 'false');
ok('set_select_dims_other_columns');

await bound.locator('[data-upset-set-bar="Drama"]').click();
assert.equal((await value.innerText()).trim(), 'none');
await page.mouse.move(5, 5); // a pointer left on the bar would hover-dim
await page.waitForTimeout(500); // opacity transition
assert.ok((await opacities(bound)).every((b) => b.o === 1));
ok('second_click_clears');

await bound.locator('[data-upset-row="Comedy"]').click();
assert.equal((await value.innerText()).trim(), 'Comedy');
ok('row_label_selects');

await bound.locator('[data-upset-set-bar="Comedy"]').focus();
await page.keyboard.press('Escape');
assert.equal((await value.innerText()).trim(), 'none');
await bound.locator('[data-upset-set-bar="Comedy"]').focus();
await page.keyboard.press('Enter');
assert.equal((await value.innerText()).trim(), 'Comedy');
await page.keyboard.press('ArrowDown');
const focusedSet = await page.evaluate(() => document.activeElement?.getAttribute('data-upset-set-bar'));
assert.ok(focusedSet && focusedSet !== 'Comedy', 'ArrowDown moves to the next set bar');
ok('keyboard_enter_escape_arrows');

// -- controlled ----------------------------------------------------------------------------------
const ctrl = section('Set selection (controlled)');
const calls = ctrl.locator('[data-testid="set-ctrl-calls"]');
assert.equal(await ctrl.locator('[data-upset-set-bar="Drama"]').getAttribute('aria-pressed'), 'true');
await ctrl.locator('[data-upset-set-bar="Comedy"]').click();
assert.equal((await calls.innerText()).trim(), 'Drama->Comedy');
assert.equal(await ctrl.locator('[data-upset-set-bar="Drama"]').getAttribute('aria-pressed'), 'true');
assert.equal(await ctrl.locator('[data-upset-set-bar="Comedy"]').getAttribute('aria-pressed'), 'false');
ok('controlled_set_select_only_notifies');

await browser.close();
console.log(`\n${n} checks passed`);
