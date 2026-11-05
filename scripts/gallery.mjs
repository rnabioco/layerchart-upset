// Screenshots every section of each /gallery/<topic> route and writes docs/gallery/index.md
// plus docs/gallery/<topic>.md. Topics come from src/routes/gallery/topics.ts.
// Usage: node scripts/gallery.mjs [baseUrl]   (default http://localhost:5173)
import { chromium } from 'playwright-core';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const base = process.argv[2] ?? 'http://localhost:5173';
const outDir = 'docs/assets/gallery';
const mdDir = 'docs/gallery';
await mkdir(outDir, { recursive: true });
await mkdir(mdDir, { recursive: true });

// Plain-node parse of the `{ slug: '…', title: '…', blurb: '…' }` entries (may span lines).
const src = await readFile('src/routes/gallery/topics.ts', 'utf8');
const topics = [...src.matchAll(/slug:\s*'([a-z0-9-]+)',\s*title:\s*'([^']+)',\s*blurb:\s*'([^']+)'/g)].map((m) => ({
	slug: m[1],
	title: m[2],
	blurb: m[3]
}));
if (!topics.length) throw new Error('no topics parsed from src/routes/gallery/topics.ts');

const browser = await chromium.launch(
	process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome' }
);
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });

let total = 0;
for (const topic of topics) {
	await page.goto(`${base}/gallery/${topic.slug}`, { waitUntil: 'networkidle' });
	await page.waitForSelector('section svg');

	const sections = await page.locator('section').all();
	let md = `# ${topic.title}

${topic.blurb} Optional settings demonstrated on one dataset (600 items, 6 genres). Every example is
rendered from [\`src/routes/gallery/${topic.slug}/+page.svelte\`](https://github.com/rnabioco/layerchart-upset/blob/main/src/routes/gallery/${topic.slug}/+page.svelte).

`;
	for (const section of sections) {
		const title = (await section.locator('h2').innerText()).trim();
		const desc = (await section.locator(':scope > .desc').first().count()) ? (await section.locator(':scope > .desc').first().innerText()).trim() : '';
		const code = section.locator(':scope > code').first();
		const props = (await code.count()) ? (await code.innerText()).trim() : '';
		const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
		await section.locator('.chart').screenshot({ path: `${outDir}/${slug}.png` });
		md += `## ${title}\n\n${desc ? desc + '\n\n' : ''}\`\`\`svelte\n<UpSet ${props.startsWith('<') ? '' : '{data} {sets} '}${props.replace(/^<UpSet |\s*\/>$/g, '')} />\n\`\`\`\n\n![${title}](../assets/gallery/${slug}.png)\n\n`;
	}
	await writeFile(`${mdDir}/${topic.slug}.md`, md);
	total += sections.length;
	console.log(`wrote ${mdDir}/${topic.slug}.md with ${sections.length} examples`);
}

const index = `# Gallery

Optional settings demonstrated on one dataset (600 items, 6 genres), grouped by topic.

${topics.map((t) => `- [${t.title}](${t.slug}.md): ${t.blurb}`).join('\n')}
`;
await writeFile(`${mdDir}/index.md`, index);
await browser.close();
console.log(`wrote ${mdDir}/index.md (${topics.length} topics, ${total} examples)`);
