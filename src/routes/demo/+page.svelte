<script lang="ts">
	import { resolve } from '$app/paths';
	import { UpSet } from '../../lib/index.js';

	// Deterministic pseudo-random genre membership (movies-like toy data).
	const genres = ['Drama', 'Comedy', 'Action', 'Thriller', 'Romance', 'Sci-Fi'];
	const weights = [0.5, 0.4, 0.25, 0.2, 0.15, 0.1];
	let seed = 42;
	const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
	const data = Array.from({ length: 600 }, (_, i) => {
		const row: Record<string, unknown> = { id: i };
		genres.forEach((g, j) => (row[g] = rand() < weights[j]));
		return row;
	});

	let selected = $state<string | null>(null);
	let minSize = $state(5);
	let mode = $state<'distinct' | 'intersect' | 'union'>('distinct');
	let sortBy = $state<'cardinality' | 'degree'>('cardinality');
</script>

<main>
	<h1>UpSet with LayerChart</h1>
	<p><a href={resolve('/gallery')}>Gallery of optional settings →</a></p>
	<div class="controls">
		<label
			>mode
			<select bind:value={mode}>
				<option>distinct</option><option>intersect</option><option>union</option>
			</select>
		</label>
		<label
			>sort by
			<select bind:value={sortBy}><option>cardinality</option><option>degree</option></select>
		</label>
		<label
			>min size {minSize}
			<input type="range" min="1" max="30" bind:value={minSize} />
		</label>
		<span>selected: {selected ?? 'none'}</span>
	</div>
	<UpSet {data} sets={genres} {minSize} {mode} sortIntersectionsBy={sortBy} bind:selected />
</main>

<style>
	main {
		font-family: system-ui, sans-serif;
		padding: 1.5rem;
	}
	.controls {
		display: flex;
		gap: 1.25rem;
		align-items: center;
		margin-bottom: 1rem;
		font-size: 14px;
	}
</style>
