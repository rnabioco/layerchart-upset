import { resolve } from '$app/paths';
import { codeToHtml } from 'shiki';
import { marked, type Token } from 'marked';
import md from '../../docs/index.md?raw';

const LANGS = new Set(['svelte', 'sh', 'bash', 'ts', 'typescript', 'js', 'css', 'json', 'html']);

// The docs home is docs/index.md rendered at build time: code blocks are highlighted with shiki and wrapped
// with a copy button (wired up in +page.svelte). Links to the gallery point at the gallery routes.
export async function load() {
	const repo = 'https://github.com/rnabioco/layerchart-upset/blob/main';
	const source = md
		.replace('(gallery/index.md)', `(${resolve('/gallery')})`)
		.replace('(LICENSE)', `(${repo}/LICENSE)`)
		.replace('(CHANGELOG.md)', `(${repo}/CHANGELOG.md)`);

	const tokens = marked.lexer(source, { gfm: true });
	for (const [i, t] of tokens.entries()) {
		if (t.type !== 'code') continue;
		const lang = LANGS.has(t.lang ?? '') ? t.lang! : 'text';
		const code = await codeToHtml(t.text, { lang, theme: 'github-light' });
		tokens[i] = {
			type: 'html',
			raw: t.raw,
			text: `<div class="code"><button type="button" class="copy" aria-label="Copy code">Copy</button>${code}</div>`
		} as Token;
	}
	return { html: marked.parser(tokens) };
}
