// Browser interaction test for controlled selection mode (issue #3).
// Usage: node test/interact/issue-3-controlled.mjs [baseUrl]  (dev server must be running)
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch(
	process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome' }
);
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(`${base}/gallery/interaction`, { waitUntil: 'networkidle' });
await page.waitForSelector('section svg');

const section = (title) => page.locator('section', { has: page.locator('h2', { hasText: title }) });
let n = 0;
const ok = (name) => console.log(`ok ${++n} - ${name}`);

const ctl = section('Controlled selection');
const bars = ctl.locator('[data-upset-bar]');
const calls = async () => (await ctl.locator('[data-calls]').textContent()).replace('calls:', '').trim();
const pressed = () => ctl.locator('[data-upset-bar][aria-pressed="true"]').evaluateAll((e) => e.map((x) => x.dataset.id));
// Snapshot of everything visual about a bar: its markup, descendants included (tabindex roves with focus, so it is excluded).
const look = (i) => bars.nth(i).evaluate((e) => e.outerHTML.replace(/ tabindex="-?\d"/, ''));

assert.deepEqual(await pressed(), ['c']);
const before = [await look(0), await look(2)];

// controlled_selection_only_notifies
await bars.nth(0).click();
assert.equal(await calls(), 'a');
assert.deepEqual(await pressed(), ['c']);
await bars.nth(0).focus();
await page.keyboard.press('Enter');
assert.equal(await calls(), 'a,a');
assert.deepEqual(await pressed(), ['c']);
await page.mouse.move(0, 0);
await bars.nth(0).blur();
assert.deepEqual([await look(0), await look(2)], before);
ok('controlled_selection_only_notifies');

// controlled_selection_follows_the_prop
await ctl.locator('[data-set-pick]').click();
assert.deepEqual(await pressed(), ['a']);
assert.notEqual(await look(0), before[0]);
assert.notEqual(await look(2), before[1]);
ok('controlled_selection_follows_the_prop');

// Escape notifies only
await bars.nth(0).focus();
await page.keyboard.press('Escape');
assert.equal(await calls(), 'a,a,null');
assert.deepEqual(await pressed(), ['a']);
ok('controlled_escape_only_notifies');

// uncontrolled_selection_is_unchanged
await page.goto(`${base}/gallery/data`, { waitUntil: 'networkidle' });
await page.waitForSelector('section svg');
const pre = section('Precomputed intersections');
const pbars = pre.locator('[data-upset-bar]');
await pbars.nth(0).click();
assert.equal(await pbars.nth(0).getAttribute('aria-pressed'), 'true');
assert.equal(await pbars.nth(2).getAttribute('aria-pressed'), 'false');
await pbars.nth(0).focus();
await page.keyboard.press('Escape');
assert.equal(await pre.locator('[aria-pressed="true"]').count(), 0);
ok('uncontrolled_selection_is_unchanged');

await browser.close();
console.log(`\n${n} checks passed`);
