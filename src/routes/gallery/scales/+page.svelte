<script lang="ts">
	import { UpSet } from '../../../lib/index.js';

	// Counts spanning four decades, for the log-scale sections.
	const decades = ['H3K4me3', 'H3K27ac', 'CTCF'];
	const decadeCounts = [
		{ id: 'a', sets: ['H3K4me3'], size: 1000 },
		{ id: 'b', sets: ['H3K27ac'], size: 100 },
		{ id: 'c', sets: ['H3K4me3', 'H3K27ac'], size: 10 },
		{ id: 'd', sets: ['CTCF'], size: 1 },
		{ id: 'z', sets: ['CTCF', 'H3K27ac'], size: 0 }
	];
	const decadeSets = { H3K4me3: 1010, H3K27ac: 110, CTCF: 1 };
	let boundScale = $state<'linear' | 'log' | 'symlog'>('linear');
	let controlledScale = $state<'linear' | 'log' | 'symlog'>('linear');
	let scaleCalls = $state<string[]>([]);
</script>

<div class="grid">
	<section>
		<h2>Size scale (bound)</h2>
		<p class="desc">
			<code>scaleToggle</code> adds a button; <code>bind:scale</code> follows it. Sizes span four decades and one
			combination is empty, so the toggle picks <code>symlog</code>.
		</p>
		<code>{`bind:scale scaleToggle minSize={0}`}</code>
		<div class="chart">
			<UpSet
				intersections={decadeCounts}
				sets={decades}
				setSizes={decadeSets}
				minSize={0}
				scaleToggle
				bind:scale={boundScale}
			/>
		</div>
		<p class="desc" data-testid="scale-bound">{boundScale}</p>
	</section>

	<section>
		<h2>Size scale (controlled)</h2>
		<p class="desc">With <code>controlled</code> the toggle only calls <code>onscalechange</code>.</p>
		<code>{`controlled scale={mine} scaleToggle onscalechange={(next) => (mine = next)}`}</code>
		<div class="chart">
			<UpSet
				intersections={decadeCounts.filter((d) => d.size > 0)}
				sets={decades}
				setSizes={decadeSets}
				scale={controlledScale}
				controlled
				scaleToggle
				onscalechange={(next, prev) => (scaleCalls = [...scaleCalls, `${prev}->${next}`])}
			/>
		</div>
		<p class="desc" data-testid="scale-ctrl-calls">{scaleCalls.join(',')}</p>
		<p class="desc" data-testid="scale-ctrl-value">{controlledScale}</p>
	</section>

	<section>
		<h2>Size scale (set panel override)</h2>
		<p class="desc"><code>scale="log"</code> on the intersections, <code>setScale="linear"</code> on the set bars.</p>
		<code>scale="log" setScale="linear"</code>
		<div class="chart">
			<UpSet
				intersections={decadeCounts.filter((d) => d.size > 0)}
				sets={decades}
				setSizes={decadeSets}
				scale="log"
				setScale="linear"
			/>
		</div>
	</section>
</div>
