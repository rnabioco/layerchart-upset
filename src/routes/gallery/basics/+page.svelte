<script lang="ts">
	import { UpSet } from '../../../lib/index.js';
	import { genres, makeData } from '../../demo-data.js';

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

<div class="grid">
	<section>
		<h2>Default</h2>
		<code>{`<UpSet {data} {sets} minSize={5} />`}</code>
		<div class="chart">
			<UpSet {data} sets={genres} minSize={5} />
		</div>
	</section>

	<section>
		<h2>Mode: intersect (inclusive)</h2>
		<p class="desc">Items count in every combination they fully contain.</p>
		<code>{`mode="intersect" minSize={20}`}</code>
		<div class="chart">
			<UpSet {data} sets={genres} mode="intersect" minSize={20} />
		</div>
	</section>

	<section>
		<h2>Mode: union</h2>
		<p class="desc">Items count in every combination they touch at least one set of.</p>
		<code>{`mode="union" minDegree={2} maxDegree={3} limit={12}`}</code>
		<div class="chart">
			<UpSet {data} sets={genres} mode="union" minDegree={2} maxDegree={3} limit={12} />
		</div>
	</section>

	<section>
		<h2>Sort by degree, ascending</h2>
		<code>{`sortIntersectionsBy="degree" sortIntersectionsOrder="ascending" minSize={8}`}</code>
		<div class="chart">
			<UpSet
				{data}
				sets={genres}
				sortIntersectionsBy="degree"
				sortIntersectionsOrder="ascending"
				minSize={8}
			/>
		</div>
	</section>

	<section>
		<h2>Filtering: minSize, maxDegree, limit</h2>
		<code>{`minSize={10} maxDegree={2} limit={10}`}</code>
		<div class="chart">
			<UpSet {data} sets={genres} minSize={10} maxDegree={2} limit={10} />
		</div>
	</section>

	<section>
		<h2>Fixed set order</h2>
		<p class="desc">Sets keep the order you pass in.</p>
		<code>{`sets={['Sci-Fi', 'Romance', 'Drama', ...]} sortSetsBy="none"`}</code>
		<div class="chart">
			<UpSet {data} sets={customOrder} sortSetsBy="none" minSize={15} />
		</div>
	</section>

	<section>
		<h2>Color by degree (function)</h2>
		<code>{`color={(i) => palette[i.degree - 1]} minSize={8}`}</code>
		<div class="chart">
			<UpSet {data} sets={genres} color={degreeColor} minSize={8} />
		</div>
	</section>

	<section>
		<h2>Per-set colors</h2>
		<code>{`setColors={{ Drama: '#4e79a7', ... }} minSize={8}`}</code>
		<div class="chart">
			<UpSet {data} sets={genres} setColors={setPalette} minSize={8} />
		</div>
	</section>
</div>
