<script lang="ts">
	import { UpSet } from '../../lib/index.js';

	const genres = ['Drama', 'Comedy', 'Action', 'Thriller', 'Romance', 'Sci-Fi'];
	const weights = [0.5, 0.4, 0.25, 0.2, 0.15, 0.1];
	let seed = 42;
	const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
	const data = Array.from({ length: 600 }, (_, i) => {
		const row: Record<string, unknown> = { id: i };
		genres.forEach((g, j) => (row[g] = rand() < weights[j]));
		return row;
	});
</script>

<div class="wrap"><UpSet {data} sets={genres} minSize={5} /></div>

<style>
	:global(body) { margin: 0; background: #fff; }
	.wrap { font-family: system-ui, sans-serif; color: #222; padding: 16px; width: max-content; }
</style>
