<script lang="ts">
	import { resolve } from '$app/paths';
	import { UpSet } from '../../lib/index.js';
	import { genres, makeData } from '../demo-data.js';
	import { topics } from './topics.js';

	let { data: index } = $props();

	// One small, inert chart per topic: a taste of what the page shows, on the same toy dataset.
	const data = makeData(400);
	const sets = genres.slice(0, 4);
	const exampleCount = (slug: string) => index.cards.find((c) => c.slug === slug)?.examples ?? [];
	const MAX_CHIPS = 3;
</script>

<p class="lede">Optional settings on the same dataset (600 items, 6 genres), grouped by topic.</p>

{#snippet preview(slug: string)}
	{@const base = {
		data,
		sets,
		limit: 6,
		minSize: 5,
		cellSize: 18,
		barHeight: 80,
		setBarWidth: 56,
		labelWidth: 64,
		fontSize: 10,
		showLabels: false,
		tooltip: false,
		clearButton: false
	}}
	{#if slug === 'basics'}
		<UpSet {...base} sortIntersectionsBy="degree" />
	{:else if slug === 'interaction'}
		<UpSet {...base} selected="Drama" />
	{:else if slug === 'layout'}
		<UpSet {...base} fit="fill" limit={3} />
	{:else if slug === 'data'}
		<UpSet {...base} stack={{ by: 'era' }} />
	{:else if slug === 'scales'}
		<UpSet {...base} scale="log" />
	{:else if slug === 'filters'}
		<UpSet {...base} minDegree={2} />
	{:else}
		<UpSet {...base} color="#63b3ed" inactiveColor="#3b4252" />
	{/if}
{/snippet}

<ul class="cards">
	{#each topics as t (t.slug)}
		{@const examples = exampleCount(t.slug)}
		<li class="card" class:dark={t.slug === 'theming'}>
			<div class="preview" aria-hidden="true" inert>
				{@render preview(t.slug)}
			</div>
			<div class="body">
				<h2><a href={resolve(`/gallery/${t.slug}`)}>{t.title}</a></h2>
				<p class="blurb">{t.blurb}</p>
				<ul class="chips" aria-label="Examples">
					{#each examples.slice(0, MAX_CHIPS) as e (e)}
						<li>{e}</li>
					{/each}
					{#if examples.length > MAX_CHIPS}
						<li class="more">+{examples.length - MAX_CHIPS} more</li>
					{/if}
				</ul>
				<p class="count">{examples.length} {examples.length === 1 ? 'example' : 'examples'}</p>
			</div>
		</li>
	{/each}
</ul>

<style>
	.cards {
		list-style: none;
		margin: 1rem 0 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
		gap: 1.25rem;
	}
	.card {
		position: relative;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--rule);
		border-radius: 10px;
		overflow: hidden;
		background: var(--bg);
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}
	.card:hover,
	.card:focus-within {
		border-color: var(--link);
		box-shadow: 0 2px 10px rgb(0 0 0 / 0.12);
	}
	.preview {
		height: 190px;
		padding: 0.75rem;
		overflow: hidden;
		border-bottom: 1px solid var(--rule);
		background: var(--code-bg);
		pointer-events: none;
	}
	.card.dark .preview {
		background: #1a202c;
		color: #e2e8f0;
	}
	.body {
		padding: 0.9rem 1rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		flex: 1;
	}
	h2 {
		margin: 0;
		font-size: 1.1rem;
	}
	/* The title link covers the whole card, so the card is one click target. */
	h2 a {
		color: var(--fg);
		text-decoration: none;
	}
	h2 a::after {
		content: '';
		position: absolute;
		inset: 0;
	}
	h2 a:focus-visible {
		outline: none;
	}
	.card:has(h2 a:focus-visible) {
		outline: 2px solid var(--link);
		outline-offset: 2px;
	}
	.blurb {
		margin: 0;
		color: var(--muted);
		font-size: 0.9rem;
	}
	.chips {
		list-style: none;
		margin: 0.25rem 0 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.chips li {
		font-size: 0.75rem;
		padding: 2px 8px;
		border: 1px solid var(--rule);
		border-radius: 999px;
		color: var(--muted);
		background: var(--code-bg);
	}
	.chips .more {
		background: none;
	}
	.count {
		margin: auto 0 0;
		padding-top: 0.25rem;
		font-size: 0.8rem;
		color: var(--muted);
	}
</style>
