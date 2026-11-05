// Browser test for the roving tabindex: one Tab stop per bar kind, and Tab leaves the plot in a few steps.
// Usage: node test/interact/issue-20-roving-tabindex.mjs [baseUrl]
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
const setBars = sel.locator('[data-upset-set-bar]');
const stops = (loc) =>
	loc.evaluateAll((els) => els.flatMap((e, i) => (e.getAttribute('tabindex') === '0' ? [i] : [])));

assert.ok((await bars.count()) > 2 && (await setBars.count()) > 1);
assert.deepEqual(await stops(bars), [0]);
assert.deepEqual(await stops(setBars), [0]);
ok('single_tab_stop_per_kind_initially');

await bars.first().focus();
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowRight');
assert.deepEqual(await stops(bars), [2]);
await page.keyboard.press('End');
assert.deepEqual(await stops(bars), [(await bars.count()) - 1]);
await setBars.first().focus();
await page.keyboard.press('ArrowDown');
assert.deepEqual(await stops(setBars), [1]);
ok('arrow_keys_move_tab_stop');

// Enter selects, Esc clears, as before.
const readout = sel.locator('small');
await bars.first().focus();
await page.keyboard.press('Enter');
assert.ok(!(await readout.innerText()).includes('none'));
await page.keyboard.press('Escape');
assert.match(await readout.innerText(), /selected: none/);
ok('enter_selects_escape_clears');

// Tab from the intersection bars reaches a set bar, then leaves the plot.
await bars.nth(3).focus();
await page.keyboard.press('Tab');
assert.ok(await page.evaluate(() => document.activeElement?.hasAttribute('data-upset-set-bar')), 'Tab reaches a set bar');
let steps = 0;
const inPlot = () => page.evaluate(() => !!document.activeElement?.closest('[data-upset-bar], [data-upset-set-bar]'));
while (steps < 6 && (await inPlot())) {
	await page.keyboard.press('Tab');
	steps++;
}
assert.ok(steps <= 3, `left the plot after ${steps} more Tab presses`);
ok('tab_leaves_plot_in_few_steps');

await browser.close();
