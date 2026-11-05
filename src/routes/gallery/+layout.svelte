<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { topics } from './topics.js';

	let { children } = $props();
	const here = (href: string) => (page.url.pathname.replace(/\/$/, '') === href.replace(/\/$/, '') ? 'page' : undefined);
</script>

<main class="gallery">
	<h1>UpSet gallery</h1>
	<nav aria-label="Gallery topics">
		<a href={resolve('/gallery')} aria-current={here(resolve('/gallery'))}>Index</a>
		{#each topics as t (t.slug)}
			<a href={resolve(`/gallery/${t.slug}`)} aria-current={here(resolve(`/gallery/${t.slug}`))}>{t.title}</a>
		{/each}
	</nav>
	{@render children()}
</main>

<style>
	main.gallery {
		font-family: system-ui, sans-serif;
		padding: 1.5rem;
		color: var(--fg);
		max-width: 1300px;
		margin: 0 auto;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin: 0.5rem 0 1rem;
	}
	nav a[aria-current='page'] {
		font-weight: 600;
		color: var(--fg);
		text-decoration: none;
	}
	.gallery :global(.lede),
	.gallery :global(.desc) {
		color: var(--muted);
		margin: 0.25rem 0;
	}
	.gallery :global(.grid) {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(760px, 1fr));
		gap: 1.5rem;
	}
	.gallery :global(section) {
		border: 1px solid var(--rule);
		border-radius: 8px;
		padding: 1rem;
		overflow-x: auto;
	}
	.gallery :global(h2) {
		font-size: 1rem;
		margin: 0 0 0.25rem;
	}
	.gallery :global(.desc code) {
		display: inline;
		margin: 0;
		padding: 0 4px;
	}
	.gallery :global(code) {
		display: block;
		font-size: 12px;
		background: var(--code-bg);
		padding: 4px 8px;
		border-radius: 4px;
		margin: 0.5rem 0;
		white-space: pre-wrap;
	}
	.gallery :global(.chart) {
		padding-top: 0.5rem;
	}
	.gallery :global(.dark .chart) {
		width: max-content;
		padding: 1rem;
	}
	.gallery :global(.dark) {
		background: #1a202c;
		color: #e2e8f0;
		border-color: #1a202c;
	}
	.gallery :global(.dark code) {
		background: #2d3748;
	}
</style>
