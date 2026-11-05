// Browser test for clearing a selection: the Clear button and Esc from anywhere after clicking the plot.
// Usage: node test/interact/issue-18-clear.mjs [baseUrl]
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
const sel = section('Selection and highlighting');
const readout = sel.locator('small');
const clear = sel.locator('[data-upset-clear]');

assert.equal(await clear.count(), 0, 'no button without a selection');
ok('clear_button_hidden_without_selection');

await sel.locator('[data-upset-bar]').first().click();
assert.match(await readout.innerText(), /selected: \S+/);
assert.ok(!(await readout.innerText()).includes('none'));
await clear.click();
assert.match(await readout.innerText(), /selected: none/);
assert.equal(await clear.count(), 0);
ok('clear_button_clears_selection');

// Esc with the focus on the page rather than on a bar: click a set row label, then press Escape.
const sets = section('Set selection (bound)');
await sets.locator('[data-upset-row]').first().click();
assert.ok(await sets.locator('[data-upset-clear]').count());
await page.evaluate(() => document.activeElement?.blur());
await page.keyboard.press('Escape');
assert.equal(await sets.locator('[data-upset-clear]').count(), 0, 'Esc cleared the set selection');
ok('escape_clears_from_anywhere_after_click');

// Esc after clicking elsewhere on the page leaves the plot alone.
await sel.locator('[data-upset-bar]').first().click();
await page.locator('h1').click();
await page.keyboard.press('Escape');
assert.equal(await clear.count(), 1, 'still selected');
await clear.click();
ok('escape_ignored_after_clicking_elsewhere');

// Controlled: the button only calls onselect; the owner keeps the selection.
const ctl = section('Controlled selection');
const calls = ctl.locator('[data-calls]');
const before = (await calls.innerText()).trim();
await ctl.locator('[data-upset-clear]').click();
const after = (await calls.innerText()).trim();
assert.notEqual(after, before, 'callback fired');
assert.equal(await ctl.locator('[data-upset-clear]').count(), 1, 'owner kept the selection');
ok('clear_button_controlled_only_notifies');

await browser.close();
