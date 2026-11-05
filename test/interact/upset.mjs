// Browser interaction test for the UpSet component (keyboard, tooltip, selection, data hooks).
// Usage: node test/interact/upset.mjs [baseUrl]  (default http://localhost:5173; dev server must be running)
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch(
	process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome' }
);
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(`${base}/gallery/data`, { waitUntil: 'networkidle' });
await page.waitForSelector('section svg');

const section = (title) => page.locator('section', { has: page.locator('h2', { hasText: title }) });
let n = 0;
const ok = (name) => console.log(`ok ${++n} - ${name}`);

// ---- precomputed example ----
const pre = section('Precomputed intersections');
const bars = pre.locator('[data-upset-bar]');
assert.equal(await bars.count(), 5);
ok('one bar per precomputed intersection');

assert.deepEqual(
	await bars.evaluateAll((els) => els.map((e) => [e.dataset.id, e.dataset.n])),
	[['a', '42'], ['b', '17'], ['c', '9'], ['d', '4'], ['e', '2']]
);
ok('bars keep the given order and carry data-id / data-n');

assert.equal(await bars.first().getAttribute('role'), 'button');
assert.equal(await bars.first().getAttribute('data-tip'), 'treated vs control: 42');
assert.equal(await bars.first().getAttribute('aria-label'), 'treated vs control: 42');
ok('bars are buttons with aria-label and data-tip');

assert.equal(await pre.locator('[data-upset-bar][aria-pressed="true"]').getAttribute('data-id'), 'c');
ok('bound selection is reflected as aria-pressed');

const row = pre.locator('[data-upset-row="KO vs WT"]');
assert.match((await row.textContent()) ?? '', /●/);
assert.match((await row.getAttribute('style')) ?? '', /700/);
ok('emphasised row is bold with a marker');

assert.equal(await pre.locator('[data-upset-set-bar]').count(), 0);
ok('set-size panel hidden without setSizes');

assert.equal(await pre.locator('[data-upset-count]').count(), 5);
ok('count labels carry data-upset-count');

// minSlots=8 reserves width for 8 columns
const w = await pre.locator('.upset').evaluate((e) => e.getBoundingClientRect().width);
assert.ok(w >= 140 + 8 * 28 - 1, `width ${w}`);
ok('minSlots reserves empty columns');

// ---- keyboard ----
await bars.first().focus();
assert.ok(await pre.locator('[role="tooltip"]').isVisible());
assert.match(await pre.locator('[role="tooltip"]').innerText(), /treated vs control: 42/);
ok('focus shows the tooltip');

await page.keyboard.press('ArrowRight');
assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-id')), 'b');
await page.keyboard.press('End');
assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-id')), 'e');
await page.keyboard.press('Home');
assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-id')), 'a');
ok('arrow keys, Home and End move focus');

await page.keyboard.press('Enter');
assert.equal(await bars.first().getAttribute('aria-pressed'), 'true');
assert.equal(await bars.nth(2).getAttribute('aria-pressed'), 'false');
await page.keyboard.press(' ');
assert.equal(await bars.first().getAttribute('aria-pressed'), 'false');
await page.keyboard.press(' ');
assert.equal(await bars.first().getAttribute('aria-pressed'), 'true');
ok('Enter and Space toggle selection');

await page.keyboard.press('Escape');
assert.equal(await pre.locator('[aria-pressed="true"]').count(), 0);
ok('Escape clears selection');

await page.keyboard.press('Tab');
assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-id')), 'b');
ok('every bar is a Tab stop');

await page.evaluate(() => document.activeElement?.blur());
await page.mouse.move(0, 0);
assert.equal(await pre.locator('[role="tooltip"]').count(), 0);
ok('tooltip hides on blur');

// ---- pointer ----
await bars.nth(1).hover();
assert.match(await pre.locator('[role="tooltip"]').innerText(), /KO vs WT: 17/);
await bars.nth(1).click();
assert.equal(await bars.nth(1).getAttribute('aria-pressed'), 'true');
ok('hover shows tooltip, click selects');

// ---- row-based example: custom tooltip snippet + set bars ----
await page.goto(`${base}/gallery/interaction`, { waitUntil: 'networkidle' });
await page.waitForSelector('section svg');
const custom = section('Custom tooltip');
await custom.locator('[data-upset-bar]').first().hover();
assert.match(await custom.locator('[role="tooltip"]').innerText(), /films · degree/);
await custom.locator('[data-upset-set-bar]').first().hover();
assert.match(await custom.locator('[role="tooltip"]').innerText(), /films$/);
ok('custom tooltip snippet renders for bars and set bars');

await browser.close();
console.log(`\n${n} checks passed`);
