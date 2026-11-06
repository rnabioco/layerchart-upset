import { topics } from './topics.js';

// Example titles per topic: the `<h2>` of each section on the topic's page, read at build time.
const pages = import.meta.glob('./*/+page.svelte', { query: '?raw', import: 'default', eager: true }) as Record<
	string,
	string
>;

export const load = () => ({
	cards: topics.map((t) => {
		const raw = pages[`./${t.slug}/+page.svelte`] ?? '';
		const examples = [...raw.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((m) => m[1].trim());
		return { slug: t.slug, examples };
	})
});
