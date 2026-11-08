<script lang="ts">
	// Dev-only benchmark harness, driven by bench/run.mjs (`npm run bench`). Not linked from the site. Exposes
	// window.__bench({ rows, sets, cols }) -> timings for compute, first render and a selection update.
	import { tick } from 'svelte';
	import { UpSet, computeUpset } from '../../lib/index.js';

	let cfg = $state<{ data: Record<string, unknown>[]; sets: string[]; cols: number; props: Record<string, unknown> } | null>(null);

	function makeRows(rows: number, sets: string[], seed = 7) {
		const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
		return Array.from({ length: rows }, () => {
			const r: Record<string, unknown> = {};
			// Mixed set densities so there are many distinct combinations.
			sets.forEach((s, j) => (r[s] = rand() < 0.15 + 0.5 * ((j % 4) / 3)));
			return r;
		});
	}
	const frames = (n = 2) => new Promise<void>((res) => {
		const step = (k: number) => (k === 0 ? res() : requestAnimationFrame(() => step(k - 1)));
		step(n);
	});

	async function bench(o: { rows: number; sets: number; cols: number; props?: Record<string, unknown> }) {
		const names = Array.from({ length: o.sets }, (_, i) => `S${i + 1}`);
		const data = makeRows(o.rows, names);

		let t = performance.now();
		const r = computeUpset(data, names, { limit: o.cols });
		const computeMs = performance.now() - t;

		cfg = null;
		await tick();
		await frames();
		t = performance.now();
		cfg = { data, sets: names, cols: o.cols, props: o.props ?? {} };
		await tick();
		const scriptMs = performance.now() - t; // Svelte + LayerChart work until the DOM is updated
		await frames();
		const renderMs = performance.now() - t; // ... through the next paints
		const nodes = document.querySelectorAll('.bench svg *').length;
		const byKind: Record<string, number> = {};
		for (const e of document.querySelectorAll('.bench svg *')) {
			const k = e.tagName + (e.getAttribute('data-upset-bar') != null ? '.bar' : '');
			byKind[k] = (byKind[k] ?? 0) + 1;
		}

		const bar = document.querySelector<SVGElement>('.bench [data-upset-bar]');
		t = performance.now();
		bar?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		await tick();
		await frames();
		const selectMs = performance.now() - t;

		return { computeMs, scriptMs, renderMs, selectMs, nodes, byKind, columns: r.intersections.length };
	}
	if (typeof window !== 'undefined') (window as unknown as { __bench: typeof bench }).__bench = bench;
</script>

<svelte:head><meta name="robots" content="noindex" /></svelte:head>

<div class="bench">
	{#if cfg}
		<UpSet data={cfg.data} sets={cfg.sets} limit={cfg.cols} tooltip={false} {...cfg.props} />
	{/if}
</div>
