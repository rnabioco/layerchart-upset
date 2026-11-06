// Browser test for the gallery index: one card per topic, each with a live preview and a working link.
// Usage: node test/interact/gallery-index.mjs [baseUrl]
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch(
	process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome' }
);
const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
await page.goto(`${base}/gallery`, { waitUntil: 'networkidle' });
await page.waitForSelector('.card svg');

let n = 0;
const ok = (name) => console.log(`ok ${++n} - ${name}`);
const cards = page.locator('ul.cards > li.card');
assert.equal(await cards.count(), 7, 'one card per topic');
assert.equal(await page.locator('.card .preview [data-upset-bar]').first().isVisible(), true, 'previews render');
ok('one card per topic with a live preview');

assert.equal(await page.locator('.card .preview .upset-tooltip').count(), 0);
await cards.nth(2).click(); // anywhere on the card follows its title link
await page.waitForURL(/\/gallery\/layout\/?$/);
ok('clicking a card opens its topic page');

await browser.close();
