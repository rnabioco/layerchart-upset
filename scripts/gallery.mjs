// Screenshots every section of the /gallery route and writes docs/gallery.md.
// Usage: node scripts/gallery.mjs [baseUrl]   (default http://localhost:5173)
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.argv[2] ?? 'http://localhost:5173';
const outDir = 'docs/assets/gallery';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
await page.goto(`${base}/gallery`, { waitUntil: 'networkidle' });
await page.waitForSelector('section svg');

const sections = await page.locator('section').all();
let md = `# Gallery

Optional settings demonstrated on one dataset (600 items, 6 genres). Every example is
rendered from [\`src/routes/gallery/+page.svelte\`](https://github.com/rnabioco/layerchart-upset/blob/main/src/routes/gallery/+page.svelte).

`;
for (const section of sections) {
	const title = (await section.locator('h2').innerText()).trim();
	const desc = (await section.locator('.desc').count()) ? (await section.locator('.desc').innerText()).trim() : '';
	const props = (await section.locator('code').innerText()).trim();
	const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	await section.locator('.chart').screenshot({ path: `${outDir}/${slug}.png` });
	md += `## ${title}\n\n${desc ? desc + '\n\n' : ''}\`\`\`svelte\n<UpSet ${props.startsWith('<') ? '' : '{data} {sets} '}${props.replace(/^<UpSet |\s*\/>$/g, '')} />\n\`\`\`\n\n![${title}](assets/gallery/${slug}.png)\n\n`;
}
await writeFile('docs/gallery.md', md);
await browser.close();
console.log(`wrote docs/gallery.md with ${sections.length} examples`);
