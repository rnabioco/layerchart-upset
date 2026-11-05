import { codeToHtml } from 'shiki';

// The gallery shows the code behind each demo. Instead of keeping a second copy next to the markup, the page
// source (`+page.svelte?raw`) is parsed at build time: the `<script>` becomes a "setup" block and the inside of
// each section's `<div class="chart">` becomes that section's example, keyed by its `<h2>`. Both are dedented and
// highlighted with shiki, so what you read is what runs.

export interface GalleryExamples {
	/** Highlighted `<script>` of the page (state and data the examples use), or null. */
	script: string | null;
	/** Highlighted example per section, keyed by the section's `<h2>` text. */
	code: Record<string, string>;
}

const THEMES = { light: 'github-light', dark: 'github-dark' };
const highlight = (code: string) => codeToHtml(code, { lang: 'svelte', themes: THEMES, defaultColor: false });

/** Remove the indentation shared by every non-empty line. */
function dedent(text: string): string {
	const lines = text.replace(/^\s*\n/, '').replace(/\s+$/, '').split('\n');
	const indents = lines.filter((l) => l.trim()).map((l) => /^\t*/.exec(l)![0].length);
	const strip = indents.length ? Math.min(...indents) : 0;
	return lines.map((l) => l.slice(strip)).join('\n');
}

/** End index (exclusive) of the `<div>` whose opening tag ends at `from`, counting nested divs. */
function closingDiv(src: string, from: number): { inner: number; after: number } | null {
	const re = /<div\b|<\/div>/g;
	re.lastIndex = from;
	let depth = 1;
	for (let m = re.exec(src); m; m = re.exec(src)) {
		depth += m[0] === '</div>' ? -1 : 1;
		if (depth === 0) return { inner: m.index, after: m.index + m[0].length };
	}
	return null;
}

export async function loadExamples(raw: string): Promise<GalleryExamples> {
	const script = /<script[^>]*>([\s\S]*?)<\/script>/
		.exec(raw)?.[1]
		// the plumbing that renders these blocks is not part of the example
		.replace(/^\s*import CodeBlock .*\n/m, '')
		.replace(/^\s*let \{ data: examples \} = \$props\(\);\n/m, '')
		.replace(/^\n+/, '');
	const code: Record<string, string> = {};
	for (const part of raw.split(/<section\b/).slice(1)) {
		const title = /<h2>([\s\S]*?)<\/h2>/.exec(part)?.[1].trim();
		const open = /<div class="chart"([^>]*)>/.exec(part);
		if (!title || !open) continue;
		const start = open.index + open[0].length;
		const end = closingDiv(part, start);
		if (!end) continue;
		let body = dedent(part.slice(start, end.inner));
		// A chart wrapper that carries a style (theming) is part of the example.
		const style = /style="([^"]*)"/.exec(open[1])?.[1];
		if (style) body = `<div style="${style}">\n${body.replace(/^/gm, '\t')}\n</div>`;
		code[title] = await highlight(body);
	}
	return { script: script ? await highlight(dedent(`<script lang="ts">\n${script}</script>`)) : null, code };
}
