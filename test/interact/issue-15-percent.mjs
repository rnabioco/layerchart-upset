// Browser test for the percent axis (spec S11).
// Usage: node test/interact/issue-15-percent.mjs [baseUrl]
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

const withData = page.locator('[data-testid="pct-data"]');
const counts = await withData.locator('[data-upset-count]').allTextContents();
assert.ok(counts.length > 0 && counts.every((t) => /^\d+(\.\d)?%$/.test(t.trim())), JSON.stringify(counts));
const ticks = await withData.locator('.upset-grid + text, text').allTextContents();
assert.ok(ticks.some((t) => /%$/.test(t.trim())), 'axis ticks are percentages');
ok('normalize_total_labels_percentages');

// bar geometry and tooltip counts are untouched
const n0 = await withData.locator('[data-upset-bar]').first().getAttribute('data-n');
assert.ok(Number(n0) > 1, 'data-n still holds the count');
ok('bar_data_stays_counts');

const bare = page.locator('[data-testid="pct-nototal"]');
const bareCounts = await bare.locator('[data-upset-count]').allTextContents();
assert.deepEqual(bareCounts.map((t) => t.trim()).sort(), ['20', '30']);
ok('unknown_total_falls_back_to_counts');

await browser.close();
