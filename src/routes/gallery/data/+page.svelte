<script lang="ts">
	import { UpSet, exportPNG, exportSVG } from '../../../lib/index.js';
	import { genres, makeData } from '../../demo-data.js';
	import CodeBlock from '../CodeBlock.svelte';

	let { data: examples } = $props();

	const data = makeData();

	// Counts that were computed elsewhere (e.g. a manifest): no per-item rows needed.
	const contrasts = ['treated vs control', 'KO vs WT', 'aged vs young'];
	const counted = [
		{ id: 'a', sets: ['treated vs control'], size: 42 },
		{ id: 'b', sets: ['KO vs WT'], size: 17 },
		{ id: 'c', sets: ['treated vs control', 'KO vs WT'], size: 9 },
		{ id: 'd', sets: ['aged vs young'], size: 4 },
		{ id: 'e', sets: ['KO vs WT', 'aged vs young', 'treated vs control'], size: 2 }
	];
	let pickedCounted = $state<string | null>('c');
	let exportBox = $state<HTMLElement>();
	let exportSvg = $state('');
	let exportPng = $state('');
	const exportNow = async () => {
		exportSvg = exportSVG(exportBox!);
		const blob = await exportPNG(exportBox!, { scale: 2 });
		exportPng = `${blob.type}:${blob.size}`;
	};
</script>

<CodeBlock html={examples.script} label="Show setup script" />

<div class="grid">
	<section>
		<h2>Precomputed intersections</h2>
		<p class="desc">
			Pass counts you already have instead of per-item rows. Order is kept as given; emphasise one row; reserve empty
			slots; no set-size panel.
		</p>
		<div class="chart">
			<UpSet
				intersections={counted}
				sets={contrasts}
				emphasizedSets={['KO vs WT']}
				minSlots={8}
				yTicks={[0, 20, 40]}
				labelWidth={140}
				bind:selected={pickedCounted}
			/>
		</div>
		<CodeBlock html={examples.code["Precomputed intersections"]} />
	</section>

	<section>
		<h2>Empty intersections and export</h2>
		<p class="desc">
			<code>showEmpty</code> lists combinations nobody has as size-0 columns. <code>exportSVG</code> and
			<code>exportPNG</code> take the wrapper element.
		</p>
		<div class="chart" bind:this={exportBox} data-testid="export-box">
			<UpSet data={data.slice(0, 25)} sets={genres.slice(0, 4)} showEmpty scaleToggle />
		</div>
		<CodeBlock html={examples.code["Empty intersections and export"]} />
		<button type="button" data-testid="export-run" onclick={exportNow}>Export</button>
		<p class="probe" aria-hidden="true" data-testid="export-png">{exportPng}</p>
		<p class="desc" data-testid="export-svg" hidden>{exportSvg}</p>
	</section>

	<section>
		<h2>Query overlays</h2>
		<p class="desc">
			Each query draws an overlay in every column, as tall as the number of its rows that pass
			<code>filter</code>. Hover a column to see the counts.
		</p>
		<div class="chart" data-testid="queries">
			<UpSet
				{data}
				sets={genres}
				minSize={15}
				queries={[
					{ id: 'first half', color: '#f6ad55', filter: (r) => (r.id as number) < 300 },
					{ id: 'every 10th', color: '#c53030', filter: (r) => (r.id as number) % 10 === 0 }
				]}
			/>
		</div>
		<CodeBlock html={examples.code["Query overlays"]} />
	</section>

	<section>
		<h2>Stacked bars</h2>
		<p class="desc">
			<code>stack</code> splits each bar by a row attribute. Linear scale only; <code>stack.legend</code> adds the
			swatches.
		</p>
		<div class="chart" data-testid="stacked">
			<UpSet {data} sets={genres} minSize={15} stack={{ by: "era", legend: true }} />
		</div>
		<CodeBlock html={examples.code["Stacked bars"]} />
	</section>
</div>
