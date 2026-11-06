<script lang="ts">
	import { UpSet, computeUpset, summarize } from '../../../lib/index.js';
	import { genres, makeData } from '../../demo-data.js';
	import CodeBlock from '../CodeBlock.svelte';

	let { data: examples } = $props();

	const data = makeData();
	const result = computeUpset(data, genres, { minSize: 25 });
	const ratings = summarize(result, 'rating');
	const lo = 0;
	const hi = 10;
</script>

<CodeBlock html={examples.script} label="Show setup script" />

<div class="grid">
	<section>
		<h2>Compact, no labels, no stripes</h2>
		<div class="chart">
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
		</div>
		<CodeBlock html={examples.code["Compact, no labels, no stripes"]} />
	</section>

	<section>
		<h2>Big dots and thick connectors</h2>
		<div class="chart">
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
		</div>
		<CodeBlock html={examples.code["Big dots and thick connectors"]} />
	</section>

	<section>
		<h2>Axis titles</h2>
		<div class="chart">
			<UpSet
				{data}
				sets={genres}
				minSize={15}
				intersectionLabel="Intersection size"
				setLabel="Set size"
			/>
		</div>
		<CodeBlock html={examples.code["Axis titles"]} />
	</section>

	<section>
		<h2>Annotation row</h2>
		<p class="desc">
			An <code>annotation</code> snippet renders once per column, between the bars and the matrix, aligned with the
			column. Here it shows each column's share of all items.
		</p>
		<div class="chart" data-testid="annotated">
			<UpSet {data} sets={genres} minSize={25} annotationHeight={22}>
				{#snippet annotation({ intersection })}
					<small>{Math.round((100 * intersection.size) / data.length)}%</small>
				{/snippet}
			</UpSet>
		</div>
		<CodeBlock html={examples.code["Annotation row"]} />
	</section>

	<section>
		<h2>Box plot per column (annotation)</h2>
		<p class="desc">
			<code>summarize(result, 'rating')</code> gives quartiles, whiskers and outliers per column; the
			<code>annotation</code> snippet draws one box plot each on a shared y-axis.
		</p>
		<div class="chart" data-testid="boxplots">
			<UpSet {data} sets={genres} minSize={25} annotationHeight={90}>
				{#snippet annotation({ intersection, width, height })}
					{@const s = ratings.get(intersection.id)}
					{@const y = (v: number) => height - 4 - ((v - lo) / (hi - lo)) * (height - 8)}
					{#if s && s.n > 0}
						<svg {width} {height} style="display:block" data-boxplot>
							<line x1={width / 2} x2={width / 2} y1={y(s.whiskerLow)} y2={y(s.whiskerHigh)} stroke="currentColor" />
							<rect
								x={width * 0.2}
								y={y(s.q3)}
								width={width * 0.6}
								height={Math.max(1, y(s.q1) - y(s.q3))}
								fill="var(--upset-bar, steelblue)"
								fill-opacity="0.45"
								stroke="currentColor"
							/>
							<line x1={width * 0.2} x2={width * 0.8} y1={y(s.median)} y2={y(s.median)} stroke="currentColor" stroke-width="2" />
							{#each s.outliers as o}
								<circle cx={width / 2} cy={y(o)} r="1.5" fill="none" stroke="currentColor" />
							{/each}
						</svg>
					{/if}
				{/snippet}
			</UpSet>
		</div>
		<CodeBlock html={examples.code["Box plot per column (annotation)"]} />
	</section>

	<section>
		<h2>maxWidth: scroll inside the root</h2>
		<p class="desc">40 intersections capped at 600px; the plot scrolls horizontally.</p>
		<div class="chart">
			<UpSet {data} sets={genres} maxWidth={600} limit={40} data-upset="maxwidth" />
		</div>
		<CodeBlock html={examples.code["maxWidth: scroll inside the root"]} />
	</section>

	<section>
		<h2>fit: shrink cells to the container</h2>
		<p class="desc">20 columns in a 500px container; cells shrink toward minCellSize.</p>
		<div class="chart">
			<div style="width: 500px">
				<UpSet {data} sets={genres} fit limit={20} data-upset="fit" />
			</div>
		</div>
		<CodeBlock html={examples.code["fit: shrink cells to the container"]} />
	</section>

	<section>
		<h2>fit="fill": span the container</h2>
		<p class="desc">
			3 columns in a 700px container. <code>fit="fill"</code> pads with empty slots so the plot spans the container
			without growing the rows; <code>showLabels="auto"</code> drops labels that would collide.
		</p>
		<div class="chart">
			<div style="width: 700px" data-testid="fill-box">
				<UpSet {data} sets={genres.slice(0, 4)} fit="fill" showLabels="auto" limit={3} />
			</div>
		</div>
		<CodeBlock html={examples.code['fit="fill": span the container']} />
	</section>

	<section>
		<h2>Percent axis</h2>
		<p class="desc">
			<code>normalize="total"</code> labels the axes and bar labels as a share of all items. Without a known total
			(precomputed, no <code>total</code>) counts stay.
		</p>
		<div class="chart" data-testid="pct-data">
			<UpSet {data} sets={genres} minSize={20} normalize="total" />
		</div>
		<CodeBlock html={examples.code["Percent axis"]} />
	</section>

	<section>
		<h2>Percent axis (unknown total)</h2>
		<p class="desc">Precomputed counts without <code>total</code> keep showing counts.</p>
		<div class="chart" data-testid="pct-nototal">
			<UpSet
				sets={['A', 'B']}
				intersections={[
					{ sets: ['A'], size: 30 },
					{ sets: ['B'], size: 20 }
				]}
				normalize="total"
			/>
		</div>
		<CodeBlock html={examples.code["Percent axis (unknown total)"]} />
	</section>
</div>
