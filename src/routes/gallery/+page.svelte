<script lang="ts">
	import { UpSet } from '../../lib/index.js';
	import { genres, makeData } from '../demo-data.js';

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

	let selected = $state<string | null>(null);
	let selectedDark = $state<string | null>('Drama&Comedy');

	const examples = [
		{ title: 'Default', props: `<UpSet {data} {sets} minSize={5} />` },
		{
			title: 'Mode: intersect (inclusive)',
			desc: 'Items count in every combination they fully contain.',
			props: `mode="intersect" minSize={20}`
		},
		{
			title: 'Mode: union',
			desc: 'Items count in every combination they touch at least one set of.',
			props: `mode="union" minDegree={2} maxDegree={3} limit={12}`
		},
		{
			title: 'Sort by degree, ascending',
			props: `sortIntersectionsBy="degree" sortIntersectionsOrder="ascending" minSize={8}`
		},
		{
			title: 'Filtering: minSize, maxDegree, limit',
			props: `minSize={10} maxDegree={2} limit={10}`
		},
		{
			title: 'Fixed set order',
			desc: 'Sets keep the order you pass in.',
			props: `sets={['Sci-Fi', 'Romance', 'Drama', ...]} sortSetsBy="none"`
		},
		{
			title: 'Color by degree (function)',
			props: `color={(i) => palette[i.degree - 1]} minSize={8}`
		},
		{
			title: 'Per-set colors',
			props: `setColors={{ Drama: '#4e79a7', ... }} minSize={8}`
		},
		{
			title: 'Selection and highlighting',
			desc: 'Click a column. highlightColor + dimOpacity.',
			props: `bind:selected highlightColor="#e53e3e" dimOpacity={0.15}`
		},
		{
			title: 'Compact, no labels, no stripes',
			props: `cellSize={18} barHeight={120} setBarWidth={90} labelWidth={80} fontSize={10} showLabels={false} stripes={false}`
		},
		{
			title: 'Big dots and thick connectors',
			props: `cellSize={34} dotRadius={0.38} connectorWidth={6} barPadding={0.15} barRadius={6}`
		},
		{
			title: 'Axis titles',
			props: `intersectionLabel="Intersection size" setLabel="Set size"`
		}
	] as const;
</script>

<main>
	<p><a href="../">← interactive demo</a></p>
	<h1>UpSet gallery</h1>
	<p class="lede">Optional settings on the same dataset (600 items, 6 genres).</p>

	<div class="grid">
		{#each examples as ex (ex.title)}
			<section>
				<h2>{ex.title}</h2>
				{#if 'desc' in ex}<p class="desc">{ex.desc}</p>{/if}
				<code>{ex.props}</code>
				<div class="chart">
					{#if ex.title === 'Default'}
						<UpSet {data} sets={genres} minSize={5} />
					{:else if ex.title.startsWith('Mode: intersect')}
						<UpSet {data} sets={genres} mode="intersect" minSize={20} />
					{:else if ex.title.startsWith('Mode: union')}
						<UpSet {data} sets={genres} mode="union" minDegree={2} maxDegree={3} limit={12} />
					{:else if ex.title.startsWith('Sort by degree')}
						<UpSet
							{data}
							sets={genres}
							sortIntersectionsBy="degree"
							sortIntersectionsOrder="ascending"
							minSize={8}
						/>
					{:else if ex.title.startsWith('Filtering')}
						<UpSet {data} sets={genres} minSize={10} maxDegree={2} limit={10} />
					{:else if ex.title === 'Fixed set order'}
						<UpSet {data} sets={customOrder} sortSetsBy="none" minSize={15} />
					{:else if ex.title.startsWith('Color by degree')}
						<UpSet {data} sets={genres} color={degreeColor} minSize={8} />
					{:else if ex.title === 'Per-set colors'}
						<UpSet {data} sets={genres} setColors={setPalette} minSize={8} />
					{:else if ex.title.startsWith('Selection')}
						<UpSet
							{data}
							sets={genres}
							minSize={8}
							bind:selected
							highlightColor="#e53e3e"
							dimOpacity={0.15}
						/>
						<small>selected: {selected ?? 'none'}</small>
					{:else if ex.title.startsWith('Compact')}
						<UpSet
							{data}
							sets={genres}
							minSize={8}
							cellSize={18}
							barHeight={120}
							setBarWidth={90}
							labelWidth={80}
							fontSize={10}
							showLabels={false}
							stripes={false}
						/>
					{:else if ex.title.startsWith('Big dots')}
						<UpSet
							{data}
							sets={genres}
							minSize={25}
							cellSize={34}
							dotRadius={0.38}
							connectorWidth={6}
							barPadding={0.15}
							barRadius={6}
						/>
					{:else if ex.title === 'Axis titles'}
						<UpSet
							{data}
							sets={genres}
							minSize={15}
							intersectionLabel="Intersection size"
							setLabel="Set size"
						/>
					{/if}
				</div>
			</section>
		{/each}

		<section class="dark">
			<h2>Dark theme</h2>
			<code>color="#63b3ed" inactiveColor="#3b4252" + dark background</code>
			<div class="chart">
				<UpSet
					{data}
					sets={genres}
					minSize={8}
					color="#63b3ed"
					inactiveColor="#3b4252"
					highlightColor="#f6ad55"
					bind:selected={selectedDark}
				/>
			</div>
		</section>
	</div>
</main>

<style>
	main {
		font-family: system-ui, sans-serif;
		padding: 1.5rem;
		color: #222;
		max-width: 1300px;
		margin: 0 auto;
	}
	.lede,
	.desc {
		color: #555;
		margin: 0.25rem 0;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(760px, 1fr));
		gap: 1.5rem;
	}
	section {
		border: 1px solid #e4e4e7;
		border-radius: 8px;
		padding: 1rem;
		overflow-x: auto;
	}
	h2 {
		font-size: 1rem;
		margin: 0 0 0.25rem;
	}
	code {
		display: block;
		font-size: 12px;
		background: #f4f4f5;
		padding: 4px 8px;
		border-radius: 4px;
		margin: 0.5rem 0;
		white-space: pre-wrap;
	}
	.chart {
		padding-top: 0.5rem;
	}
	.dark {
		background: #1a202c;
		color: #e2e8f0;
		border-color: #1a202c;
	}
	.dark code {
		background: #2d3748;
	}
</style>
