// Browser test for interactive filtering (spec S12).
// Usage: node test/interact/issue-10-filters.mjs [baseUrl]
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch(
	process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome' }
);
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(`${base}/gallery/filters`, { waitUntil: 'networkidle' });
await page.waitForSelector('section svg');

let n = 0;
const ok = (name) => console.log(`ok ${++n} - ${name}`);
const section = (title) => page.locator('section', { has: page.locator('h2', { hasText: title }) });
const bars = (sec) =>
	sec.locator('[data-upset-bar]').evaluateAll((els) =>
		els.map((e) => ({ id: e.getAttribute('data-id'), n: Number(e.getAttribute('data-n')) }))
	);
const state = async (sec) => JSON.parse(await sec.locator('[data-testid="filter-bound"]').innerText());
const setInput = async (sec, name, value) => {
	const input = sec.locator(`[data-upset-filter="${name}"]`);
	await input.fill(value);
	await input.blur();
};

// -- bound ---------------------------------------------------------------------------------------
const bound = section('Filter controls (bound)');
assert.equal(await bound.locator('[data-upset-filters]').count(), 1);
const start = await bars(bound);
assert.ok(start.length > 3 && start.every((b) => b.n >= 10));
assert.equal(await bound.locator('[data-upset-filter="minSize"]').inputValue(), '10');
ok('controls_render_initial_values');

await setInput(bound, 'minSize', '100');
const big = await bars(bound);
assert.ok(big.length < start.length && big.every((b) => b.n >= 100));
assert.equal((await state(bound)).minSize, 100);
ok('bind_min_size_filters_bars');

await setInput(bound, 'minSize', '10');
await setInput(bound, 'limit', '3');
assert.equal((await bars(bound)).length, 3);
assert.equal((await state(bound)).limit, 3);
ok('limit_caps_bars');

await bound.locator('[data-upset-filter-set="Drama"]').uncheck();
const noDrama = await bars(bound);
assert.ok(noDrama.every((b) => !b.id.split('&').includes('Drama')));
assert.equal(await bound.locator('[data-upset-row="Drama"]').count(), 0);
assert.deepEqual((await state(bound)).hiddenSets, ['Drama']);
ok('hide_set_recomputes_intersections');

await bound.locator('[data-upset-filter-reset]').click();
const after = await state(bound);
assert.deepEqual(after, { minSize: null, limit: null, hiddenSets: [] });
assert.equal(await bound.locator('[data-upset-row="Drama"]').count(), 1);
assert.equal(await bound.locator('[data-upset-filter="minSize"]').inputValue(), '');
assert.equal(await bound.locator('[data-upset-filter-reset]').isDisabled(), true);
ok('reset_clears_everything');

// -- controlled ----------------------------------------------------------------------------------
const ctrl = section('Filter controls (controlled)');
const before = (await bars(ctrl)).length;
await setInput(ctrl, 'minSize', '100');
assert.equal((await ctrl.locator('[data-testid="filter-ctrl-calls"]').innerText()).trim(), '10->100');
assert.equal((await bars(ctrl)).length, before);
ok('controlled_filter_only_notifies');

await browser.close();
console.log(`\n${n} checks passed`);
