// Render/compute benchmark. Usage: npm run dev (other terminal), then `npm run bench [baseUrl]`.
// Each config runs REPEAT times in a fresh page; the table shows the median. All times are ms.
import { chromium } from 'playwright-core';

const base = process.argv[2] ?? 'http://localhost:5173';
const REPEAT = Number(process.env.REPEAT ?? 3);
const configs = [
	{ rows: 600, sets: 6, cols: 20 },
	{ rows: 5000, sets: 10, cols: 50 },
	{ rows: 5000, sets: 10, cols: 200 },
	{ rows: 20000, sets: 15, cols: 200 },
	{ rows: 20000, sets: 15, cols: 500 },
	{ rows: 50000, sets: 20, cols: 1000 }
];
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

const browser = await chromium.launch(
	process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome' }
);
const rows = [];
for (const c of configs) {
	const runs = [];
	for (let i = 0; i < REPEAT; i++) {
		const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
		await page.goto(`${base}/bench/`, { waitUntil: 'networkidle' });
		await page.waitForFunction(() => typeof window.__bench === 'function');
		runs.push(await page.evaluate((c) => window.__bench(c), c));
		await page.close();
	}
	const m = (k) => Math.round(median(runs.map((r) => r[k])));
	rows.push({ ...c, columns: runs[0].columns, compute: m('computeMs'), script: m('scriptMs'), render: m('renderMs'), select: m('selectMs'), nodes: runs[0].nodes });
}
await browser.close();
console.table(rows);
