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
	let hiddenLimit = $state(8);
	let lastReport = $state('');
	let selected = $state<string | null>(null);
	let controlledPick = $state<string | null>('c');
	let controlledCalls = $state<(string | null)[]>([]);
	let selectCalls = $state<string[]>([]);
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
			title: 'Precomputed intersections',
			desc: 'Pass counts you already have instead of per-item rows. Order is kept as given; emphasise one row; reserve empty slots; no set-size panel.',
			props: `intersections={counted} sets={contrasts} emphasizedSets={['KO vs WT']} minSlots={8} yTicks={[0, 20, 40]} bind:selected`
		},
		{
			title: 'Custom tooltip',
			desc: 'Hover or Tab to a bar. The tooltip is a snippet, and every bar is a button (Enter/Space select, arrows move, Esc clears).',
			props: `{#snippet tooltip(t)} … {/snippet}  onhover={(i) => …}`
		},
		{
			title: 'Axis titles',
			props: `intersectionLabel="Intersection size" setLabel="Set size"`
		},
		{
			title: 'Controlled selection',
			desc: 'The owner holds the selection; clicks only notify through onselect.',
			props: `controlled selected={pick} onselect={(i) => …}`
		},
		{
			title: 'maxWidth: scroll inside the root',
			desc: '40 intersections capped at 600px; the plot scrolls horizontally.',
			props: `maxWidth={600} limit={40}`
		},
		{
			title: 'fit: shrink cells to the container',
			desc: '20 columns in a 500px container; cells shrink toward minCellSize.',
			props: `fit minCellSize={12} limit={20}`
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
					{:else if ex.title === 'Precomputed intersections'}
						<UpSet
							intersections={counted}
							sets={contrasts}
							emphasizedSets={['KO vs WT']}
							minSlots={8}
							yTicks={[0, 20, 40]}
							labelWidth={140}
							bind:selected={pickedCounted}
						/>
					{:else if ex.title === 'Custom tooltip'}
						<UpSet {data} sets={genres} minSize={15}>
							{#snippet tooltip(t)}
								{#if t.kind === 'intersection'}
									<strong>{t.intersection.sets.join(' + ')}</strong><br />
									{t.intersection.size} films · degree {t.intersection.degree}
								{:else}
									<strong>{t.set.name}</strong>: {t.set.size} films
								{/if}
							{/snippet}
						</UpSet>
					{:else if ex.title === 'Axis titles'}
						<UpSet
							{data}
							sets={genres}
							minSize={15}
							intersectionLabel="Intersection size"
							setLabel="Set size"
						/>
					{:else if ex.title === 'Controlled selection'}
						<UpSet
							intersections={counted}
							sets={contrasts}
							labelWidth={140}
							controlled
							selected={controlledPick}
							onselect={(i) => controlledCalls.push(i?.id ?? null)}
						/>
						<small data-calls>calls: {controlledCalls.map((c) => c ?? 'null').join(',')}</small>
						<button type="button" data-set-pick onclick={() => (controlledPick = 'a')}>select a</button>
					{:else if ex.title.startsWith('maxWidth')}
						<UpSet {data} sets={genres} maxWidth={600} limit={40} data-upset="maxwidth" />
					{:else if ex.title.startsWith('fit:')}
						<div style="width: 500px">
							<UpSet {data} sets={genres} fit limit={20} data-upset="fit" />
						</div>
					{/if}
				</div>
			</section>
		{/each}

		<section class="dark">
			<h2>Dark theme</h2>
			<code>color="#63b3ed" inactiveColor="#3b4252" highlightColor="#f6ad55" bind:selected</code>
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

		<section>
			<h2>onselect previous argument</h2>
			<code>onselect=(selected, previous) => log</code>
			<div class="chart">
				<UpSet
					{data}
					sets={genres}
					minSize={40}
					onselect={(s, p) => selectCalls.push(`${s?.id ?? 'null'},${p?.id ?? 'null'}`)}
				/>
			</div>
			<pre data-calls>{selectCalls.join('\n')}</pre>
		</section>

		<section>
			<h2>Hidden count (limit + footer)</h2>
			<p class="desc">
				<code>limit</code> drops intersections; <code>onresult</code> and the <code>footer</code> snippet say how
				many.
			</p>
			<code>limit={'{8}'} onresult={'{(r) => …}'} {'{#snippet footer({ shown, total })} … {/snippet}'}</code>
			<label>
				limit
				<select bind:value={hiddenLimit} data-testid="hidden-limit">
					<option value={4}>4</option>
					<option value={8}>8</option>
					<option value={12}>12</option>
				</select>
			</label>
			<div class="chart">
				<UpSet
					{data}
					sets={genres}
					limit={hiddenLimit}
					onresult={(r) => (lastReport = JSON.stringify(r))}
				>
					{#snippet footer({ shown, total })}
						<p class="desc" data-testid="hidden-footer">
							the largest {shown} of {total} combinations are drawn
						</p>
					{/snippet}
				</UpSet>
			</div>
			<p class="desc" data-testid="hidden-result">{lastReport}</p>
		</section>

		<section>
			<h2>Size scale (bound)</h2>
			<p class="desc">
				<code>scaleToggle</code> adds a button; <code>bind:scale</code> follows it. Sizes span four decades and one
				combination is empty, so the toggle picks <code>symlog</code>.
			</p>
			<code>bind:scale scaleToggle minSize={'{0}'}</code>
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
			<code>scale={'{controlledScale}'} controlled scaleToggle onscalechange</code>
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

		<section class="themed">
			<h2>CSS custom properties</h2>
			<code>no colour props; --upset-bar, --upset-dot-off, ... set on an ancestor</code>
			<div class="chart">
				<UpSet {data} sets={genres} minSize={25} />
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
	.desc code {
		display: inline;
		margin: 0;
		padding: 0 4px;
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
	.dark .chart {
		width: max-content;
		padding: 1rem;
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
