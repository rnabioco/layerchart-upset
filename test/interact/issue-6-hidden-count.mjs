// Browser test for onresult / footer (issue #6).
// Usage: node test/interact/issue-6-hidden-count.mjs [baseUrl]
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

const sec = page.locator('section', { has: page.locator('h2', { hasText: 'Hidden count' }) });
const footer = sec.locator('[data-testid="hidden-footer"]');
const result = sec.locator('[data-testid="hidden-result"]');

assert.equal(await footer.count(), 1);
ok('footer renders once');

const text = async () => (await footer.innerText()).trim();
assert.match(await text(), /^the largest 8 of \d+ combinations are drawn$/);
const total = Number((await text()).match(/of (\d+)/)[1]);
assert.ok(total > 12);
assert.deepEqual(JSON.parse(await result.innerText()), { shown: 8, total, hidden: total - 8 });
ok('onresult reports shown/total/hidden');

assert.equal(await sec.locator('[data-upset-bar]').count(), 8);
await sec.locator('[data-testid="hidden-limit"]').selectOption('4');
await page.waitForFunction(() =>
	document.querySelector('[data-testid="hidden-footer"]')?.textContent?.includes('largest 4 of')
);
assert.equal(await footer.count(), 1);
assert.equal(await sec.locator('[data-upset-bar]').count(), 4);
assert.deepEqual(JSON.parse(await result.innerText()), { shown: 4, total, hidden: total - 4 });
ok('footer_snippet_updates when limit changes');

const other = page.locator('section', { has: page.locator('h2', { hasText: 'Precomputed intersections' }) });
assert.equal(await other.locator('.upset-footer').count(), 0);
ok('nothing rendered without a footer');

await browser.close();
console.log(`\n${n} checks passed`);
