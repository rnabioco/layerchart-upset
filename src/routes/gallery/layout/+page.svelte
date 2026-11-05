<script lang="ts">
	import { UpSet } from '../../../lib/index.js';
	import { genres, makeData } from '../../demo-data.js';

	const data = makeData();
</script>

<div class="grid">
	<section>
		<h2>Compact, no labels, no stripes</h2>
		<code
			>{`cellSize={18} barHeight={120} setBarWidth={90} labelWidth={80} fontSize={10} showLabels={false} stripes={false}`}</code
		>
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
	</section>

	<section>
		<h2>Big dots and thick connectors</h2>
		<code>{`cellSize={34} dotRadius={0.38} connectorWidth={6} barPadding={0.15} barRadius={6}`}</code>
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
	</section>

	<section>
		<h2>Axis titles</h2>
		<code>{`intersectionLabel="Intersection size" setLabel="Set size"`}</code>
		<div class="chart">
			<UpSet
				{data}
				sets={genres}
				minSize={15}
				intersectionLabel="Intersection size"
				setLabel="Set size"
			/>
		</div>
	</section>

	<section>
		<h2>Annotation row</h2>
		<p class="desc">
			An <code>annotation</code> snippet renders once per column, between the bars and the matrix, aligned with the
			column. Here it shows each column's share of all items.
		</p>
		<code>{`{#snippet annotation({ intersection })}{Math.round((100 * intersection.size) / total)}%{/snippet}`}</code>
		<div class="chart" data-testid="annotated">
			<UpSet {data} sets={genres} minSize={25} annotationHeight={22}>
				{#snippet annotation({ intersection })}
					<small>{Math.round((100 * intersection.size) / data.length)}%</small>
				{/snippet}
			</UpSet>
		</div>
	</section>

	<section>
		<h2>maxWidth: scroll inside the root</h2>
		<p class="desc">40 intersections capped at 600px; the plot scrolls horizontally.</p>
		<code>{`maxWidth={600} limit={40}`}</code>
		<div class="chart">
			<UpSet {data} sets={genres} maxWidth={600} limit={40} data-upset="maxwidth" />
		</div>
	</section>

	<section>
		<h2>fit: shrink cells to the container</h2>
		<p class="desc">20 columns in a 500px container; cells shrink toward minCellSize.</p>
		<code>{`fit minCellSize={12} limit={20}`}</code>
		<div class="chart">
			<div style="width: 500px">
				<UpSet {data} sets={genres} fit limit={20} data-upset="fit" />
			</div>
		</div>
	</section>

	<section>
		<h2>Percent axis</h2>
		<p class="desc">
			<code>normalize="total"</code> labels the axes and bar labels as a share of all items. Without a known total
			(precomputed, no <code>total</code>) counts stay.
		</p>
		<code>normalize="total"</code>
		<div class="chart" data-testid="pct-data">
			<UpSet {data} sets={genres} minSize={20} normalize="total" />
		</div>
	</section>

	<section>
		<h2>Percent axis (unknown total)</h2>
		<p class="desc">Precomputed counts without <code>total</code> keep showing counts.</p>
		<code>{`intersections={counts} normalize="total"`}</code>
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
	</section>
</div>
