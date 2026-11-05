<script lang="ts">
	import { UpSet } from '../../../lib/index.js';
	import { genres, makeData } from '../../demo-data.js';
	import CodeBlock from '../CodeBlock.svelte';

	let { data: examples } = $props();

	const data = makeData();
	const customOrder = ['Sci-Fi', 'Romance', 'Drama', 'Action', 'Comedy', 'Thriller'];
	const setPalette = {
		Drama: '#4e79a7',
		Comedy: '#f28e2b',
		Action: '#e15759',
		Thriller: '#76b7b2',
		Romance: '#b07aa1',
		'Sci-Fi': '#59a14f'
	};
	const degreeColor = (d: { degree: number }) =>
		['#2b6cb0', '#dd6b20', '#c53030', '#6b46c1', '#2f855a', '#975a16'][d.degree - 1];
</script>

<CodeBlock html={examples.script} label="Show setup script" />

<div class="grid">
	<section>
		<h2>Default</h2>
		<div class="chart">
			<UpSet {data} sets={genres} minSize={5} />
		</div>
		<CodeBlock html={examples.code["Default"]} />
	</section>

	<section>
		<h2>Mode: intersect (inclusive)</h2>
		<p class="desc">Items count in every combination they fully contain.</p>
		<div class="chart">
			<UpSet {data} sets={genres} mode="intersect" minSize={20} />
		</div>
		<CodeBlock html={examples.code["Mode: intersect (inclusive)"]} />
	</section>

	<section>
		<h2>Mode: union</h2>
		<p class="desc">Items count in every combination they touch at least one set of.</p>
		<div class="chart">
			<UpSet {data} sets={genres} mode="union" minDegree={2} maxDegree={3} limit={12} />
		</div>
		<CodeBlock html={examples.code["Mode: union"]} />
	</section>

	<section>
		<h2>Sort by degree, ascending</h2>
		<div class="chart">
			<UpSet
				{data}
				sets={genres}
				sortIntersectionsBy="degree"
				sortIntersectionsOrder="ascending"
				minSize={8}
			/>
		</div>
		<CodeBlock html={examples.code["Sort by degree, ascending"]} />
	</section>

	<section>
		<h2>Filtering: minSize, maxDegree, limit</h2>
		<div class="chart">
			<UpSet {data} sets={genres} minSize={10} maxDegree={2} limit={10} />
		</div>
		<CodeBlock html={examples.code["Filtering: minSize, maxDegree, limit"]} />
	</section>

	<section>
		<h2>Fixed set order</h2>
		<p class="desc">Sets keep the order you pass in.</p>
		<div class="chart">
			<UpSet {data} sets={customOrder} sortSetsBy="none" minSize={15} />
		</div>
		<CodeBlock html={examples.code["Fixed set order"]} />
	</section>

	<section>
		<h2>Color by degree (function)</h2>
		<div class="chart">
			<UpSet {data} sets={genres} color={degreeColor} minSize={8} />
		</div>
		<CodeBlock html={examples.code["Color by degree (function)"]} />
	</section>

	<section>
		<h2>Per-set colors</h2>
		<div class="chart">
			<UpSet {data} sets={genres} setColors={setPalette} minSize={8} />
		</div>
		<CodeBlock html={examples.code["Per-set colors"]} />
	</section>
</div>
