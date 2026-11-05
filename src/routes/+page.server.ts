import { resolve } from '$app/paths';
import { marked } from 'marked';
import md from '../../docs/index.md?raw';

// The docs home is docs/index.md rendered at build time. Links to the gallery point at the gallery routes.
export function load() {
	const repo = 'https://github.com/rnabioco/layerchart-upset/blob/main';
	const source = md
		.replace('(gallery/index.md)', `(${resolve('/gallery')})`)
		.replace('(LICENSE)', `(${repo}/LICENSE)`)
		.replace('(CHANGELOG.md)', `(${repo}/CHANGELOG.md)`);
	return { html: marked.parse(source, { gfm: true, async: false }) as string };
}
