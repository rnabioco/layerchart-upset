// Browser test for theming through CSS custom properties (--upset-bar, --upset-dot-off, ...).
// Usage: node test/interact/issue-5-theming.mjs [baseUrl]  (default http://localhost:5173; dev server must be running)
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch(
	process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome' }
);
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(`${base}/gallery/theming`, { waitUntil: 'networkidle' });
await page.waitForSelector('section svg');

const section = (title) => page.locator('section', { has: page.locator('h2', { hasText: title }) });
let n = 0;
const ok = (name) => console.log(`ok ${++n} - ${name}`);

const themed = section('CSS custom properties');
const fills = (loc) => loc.evaluateAll((els) => els.map((e) => getComputedStyle(e).fill));
const setVars = (vars) =>
	themed.evaluate((el, v) => {
		for (const [k, val] of Object.entries(v)) el.style.setProperty(k, val);
	}, vars);
const clearVars = () => themed.evaluate((el) => el.removeAttribute('style'));

const bars = themed.locator('[data-upset-bar]');
const setBars = themed.locator('[data-upset-set-bar]');
const dotOff = themed.locator('path.upset-off[data-upset-empty]');
const dotOn = themed.locator('[data-upset-column] circle.upset-on');
assert.ok((await bars.count()) > 3);

// ---- defaults_are_unchanged ----
for (const f of await fills(bars)) assert.equal(f, 'rgb(43, 108, 176)');
for (const f of await fills(setBars)) assert.equal(f, 'rgb(43, 108, 176)');
for (const f of await fills(dotOn)) assert.equal(f, 'rgb(43, 108, 176)');
for (const f of await fills(dotOff)) assert.equal(f, 'rgb(212, 212, 216)');
const withAttr = await bars.evaluateAll((els) => els.filter((e) => e.getAttribute('fill') !== null).length);
assert.equal(withAttr, 0, 'plain bars carry no inline fill attribute');
// stripes keep the old 6% currentColor alpha; labels stay currentColor
const stripe = await themed.locator('rect.upset-stripe').first().evaluate((e) => getComputedStyle(e).fill);
assert.match(stripe, /0\.06\)$/);
const text = await themed
	.locator('.upset-set-name')
	.first()
	.evaluate((e) => [getComputedStyle(e).fill, getComputedStyle(e).color]);
assert.equal(text[0], text[1]);
ok('defaults_are_unchanged');

// ---- css_variable_recolours_bars ----
await setVars({ '--upset-bar': 'rgb(1, 2, 3)' });
for (const f of await fills(bars)) assert.equal(f, 'rgb(1, 2, 3)');
for (const f of await fills(setBars)) assert.equal(f, 'rgb(1, 2, 3)');
for (const f of await fills(dotOn)) assert.equal(f, 'rgb(1, 2, 3)', 'dots follow --upset-bar');
const connector = await themed.locator('line.upset-on').first().evaluate((e) => getComputedStyle(e).stroke);
assert.equal(connector, 'rgb(1, 2, 3)');
ok('css_variable_recolours_bars');

// runtime flip without re-rendering: same DOM nodes, new colours
await bars.first().evaluate((e) => (e.dataset.marker = 'same-node'));
await setVars({ '--upset-bar': 'rgb(200, 50, 50)', '--upset-dot-off': 'rgb(9, 9, 9)', '--upset-dot-on': 'rgb(5, 6, 7)' });
for (const f of await fills(bars)) assert.equal(f, 'rgb(200, 50, 50)');
for (const f of await fills(dotOff)) assert.equal(f, 'rgb(9, 9, 9)');
for (const f of await fills(dotOn)) assert.equal(f, 'rgb(5, 6, 7)');
assert.equal(await bars.first().getAttribute('data-marker'), 'same-node');
await setVars({ '--upset-text': 'rgb(10, 20, 30)', '--upset-stripe': 'rgb(40, 50, 60)', '--upset-grid': 'rgb(70, 80, 90)' });
assert.equal(await themed.locator('.upset-set-name').first().evaluate((e) => getComputedStyle(e).fill), 'rgb(10, 20, 30)');
assert.equal(await themed.locator('.upset-label').first().evaluate((e) => getComputedStyle(e).fill), 'rgb(10, 20, 30)');
assert.equal(await themed.locator('rect.upset-stripe').first().evaluate((e) => getComputedStyle(e).fill), 'rgb(40, 50, 60)');
assert.equal(await themed.locator('line.upset-grid').first().evaluate((e) => getComputedStyle(e).stroke), 'rgb(70, 80, 90)');
ok('custom properties flip at runtime without re-rendering');

// selected bar uses --upset-bar-selected
await bars.nth(1).click();
await setVars({ '--upset-bar-selected': 'rgb(0, 128, 0)' });
assert.equal(await bars.nth(1).evaluate((e) => getComputedStyle(e).fill), 'rgb(0, 128, 0)');
assert.equal(await bars.nth(2).evaluate((e) => getComputedStyle(e).fill), 'rgb(200, 50, 50)');
await bars.nth(1).click();
ok('--upset-bar-selected colours the selected bar');
await clearVars();

// ---- prop_overrides_css_variable ----
// "Dark theme" passes color / inactiveColor props; the variables set on an ancestor must lose.
const dark = section('Dark theme');
await dark.evaluate((el) => {
	el.style.setProperty('--upset-bar', 'rgb(1, 2, 3)');
	el.style.setProperty('--upset-dot-off', 'rgb(4, 5, 6)');
});
// (color, or highlightColor for the bound selection; inactiveColor for off dots)
const propColors = ['rgb(99, 179, 237)', 'rgb(246, 173, 85)', 'rgb(59, 66, 82)'];
for (const f of await fills(dark.locator('[data-upset-bar]'))) assert.ok(propColors.includes(f) && f !== propColors[2], f);
for (const f of await fills(dark.locator('[data-upset-column] circle'))) assert.ok(propColors.includes(f), f);
await dark.evaluate((el) => el.removeAttribute('style'));
ok('prop_overrides_css_variable');

// a per-intersection color function wins over the variable
await page.goto(`${base}/gallery/basics`, { waitUntil: 'networkidle' });
await page.waitForSelector('section svg');
const byDegree = section('Color by degree');
await byDegree.evaluate((el) => el.style.setProperty('--upset-bar', 'rgb(1, 2, 3)'));
const degFills = await fills(byDegree.locator('[data-upset-bar]'));
assert.ok(degFills.length > 0 && degFills.every((f) => f !== 'rgb(1, 2, 3)'), degFills.join());
await byDegree.evaluate((el) => el.removeAttribute('style'));
ok('per-intersection color function still wins');

await browser.close();
console.log(`\n${n} checks passed`);
