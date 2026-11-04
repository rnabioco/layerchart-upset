// Browser test for the log/symlog size scale and its toggle (spec S1).
// Usage: node test/interact/issue-8-scale.mjs [baseUrl]
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
const section = (title) => page.locator('section', { has: page.locator('h2', { hasText: title }) });
const heights = (sec) =>
	sec.locator('[data-upset-bar]').evaluateAll((els) =>
		Object.fromEntries(els.map((e) => [e.getAttribute('data-id'), e.getBoundingClientRect().height]))
	);

// -- uncontrolled: bind:scale follows the toggle; zero => symlog -------------------------------
const bound = section('Size scale (bound)');
const toggle = bound.locator('[data-upset-scale-toggle]');
assert.equal(await bound.locator('.upset').getAttribute('data-scale'), 'linear');
assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
const lin = await heights(bound);
assert.ok(lin.a > 100 * lin.d, 'linear: 1000 dwarfs 1');
await toggle.click();
assert.equal((await bound.locator('[data-testid="scale-bound"]').innerText()).trim(), 'symlog');
assert.equal(await bound.locator('.upset').getAttribute('data-scale'), 'symlog');
assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
ok('uncontrolled_toggle_binds');

const sym = await heights(bound);
assert.ok(sym.d > 0.1 * sym.a, 'symlog: 1 is clearly visible next to 1000');
assert.ok(sym.a > sym.b && sym.b > sym.c && sym.c > sym.d, 'symlog keeps the order');
assert.equal(sym.z, 0, 'a size of 0 has no bar height');
assert.equal((await bound.locator('[data-upset-count="z"]').textContent())?.trim(), '0');
assert.equal(await bound.locator('[data-id="z"]').getAttribute('data-n'), '0');
ok('zero_size_bar_keeps_label');

await toggle.click();
assert.equal((await bound.locator('[data-testid="scale-bound"]').innerText()).trim(), 'linear');
ok('toggle_returns_to_linear');

// -- controlled: only notifies ----------------------------------------------------------------
const ctrl = section('Size scale (controlled)');
await ctrl.locator('[data-upset-scale-toggle]').click();
assert.equal((await ctrl.locator('[data-testid="scale-ctrl-calls"]').innerText()).trim(), 'linear->log');
assert.equal(await ctrl.locator('.upset').getAttribute('data-scale'), 'linear');
assert.equal(await ctrl.locator('[data-upset-scale-toggle]').getAttribute('aria-pressed'), 'false');
assert.equal((await ctrl.locator('[data-testid="scale-ctrl-value"]').innerText()).trim(), 'linear');
ok('controlled_toggle_only_notifies');

// -- set panel override -----------------------------------------------------------------------
const over = section('Size scale (set panel override)');
assert.equal(await over.locator('.upset').getAttribute('data-scale'), 'log');
const log = await heights(over);
// equal ratios between decades give equal height steps: (1000,100) step ~ (100,10) step
const stepA = log.a - log.b;
const stepB = log.b - log.c;
assert.ok(Math.abs(stepA - stepB) < 1.5, `log steps equal (${stepA} vs ${stepB})`);
assert.ok(log.d > 0, 'a size of 1 still has a bar under log');
ok('log_bar_heights_follow_log_ratio');

assert.equal(await over.locator('[data-upset-set-tick]').count(), 0, 'linear set panel has no ticks');
const setW = await over
	.locator('[data-upset-set-bar]')
	.evaluateAll((els) =>
		Object.fromEntries(els.map((e) => [e.getAttribute('data-upset-set-bar'), e.getBoundingClientRect().width]))
	);
assert.ok(setW.H3K4me3 > 20 * setW.CTCF, 'set bars stay linear when setScale is pinned');
ok('set_scale_override_independent');

await browser.close();
console.log(`\n${n} checks passed`);
