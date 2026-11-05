<script lang="ts">
	import { page } from '$app/state';
	import { topics } from './topics.js';

	let { children } = $props();
</script>

<main class="gallery">
	<p><a href="../">← interactive demo</a></p>
	<h1>UpSet gallery</h1>
	<nav aria-label="Gallery topics">
		<a href="/gallery" aria-current={page.url.pathname.replace(/\/$/, '') === '/gallery' ? 'page' : undefined}
			>Index</a
		>
		{#each topics as t (t.slug)}
			<a
				href="/gallery/{t.slug}"
				aria-current={page.url.pathname.replace(/\/$/, '') === `/gallery/${t.slug}` ? 'page' : undefined}
				>{t.title}</a
			>
		{/each}
	</nav>
	{@render children()}
</main>

<style>
	main.gallery {
		font-family: system-ui, sans-serif;
		padding: 1.5rem;
		color: #222;
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
		color: #222;
		text-decoration: none;
	}
	.gallery :global(.lede),
	.gallery :global(.desc) {
		color: #555;
		margin: 0.25rem 0;
	}
	.gallery :global(.grid) {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(760px, 1fr));
		gap: 1.5rem;
	}
	.gallery :global(section) {
		border: 1px solid #e4e4e7;
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
		background: #f4f4f5;
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
