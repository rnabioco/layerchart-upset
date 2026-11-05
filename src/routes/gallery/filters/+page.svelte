<script lang="ts">
	import { UpSet } from '../../../lib/index.js';
	import { genres, makeData } from '../../demo-data.js';
	import CodeBlock from '../CodeBlock.svelte';

	let { data: examples } = $props();

	const data = makeData();

	let fMin = $state<number | undefined>(10);
	let fLimit = $state<number | undefined>(undefined);
	let fHidden = $state<string[]>([]);
	let filterCalls = $state<string[]>([]);
	let hiddenLimit = $state(8);
	let lastReport = $state('');
</script>

<CodeBlock html={examples.script} label="Show setup script" />

<div class="grid">
	<section>
		<h2>Hidden count (limit + footer)</h2>
		<p class="desc">
			<code>limit</code> drops intersections; <code>onresult</code> and the <code>footer</code> snippet say how many.
		</p>
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
		<CodeBlock html={examples.code["Hidden count (limit + footer)"]} />
		<p class="probe" aria-hidden="true" data-testid="hidden-result">{lastReport}</p>
	</section>

	<section>
		<h2>Filter controls (bound)</h2>
		<p class="desc">
			<code>filterControls</code> renders a bar for min size, degree, limit and which sets to show; the filter props
			are bindable.
		</p>
		<div class="chart">
			<UpSet
				{data}
				sets={genres}
				filterControls
				bind:minSize={fMin}
				bind:limit={fLimit}
				bind:hiddenSets={fHidden}
			/>
		</div>
		<CodeBlock html={examples.code["Filter controls (bound)"]} />
		<p class="probe" aria-hidden="true" data-testid="filter-bound">
			{JSON.stringify({ minSize: fMin ?? null, limit: fLimit ?? null, hiddenSets: fHidden })}
		</p>
	</section>

	<section>
		<h2>Filter controls (controlled)</h2>
		<p class="desc">With <code>controlled</code> the controls only call <code>onfilterchange</code>.</p>
		<div class="chart">
			<UpSet
				{data}
				sets={genres}
				filterControls
				controlled
				minSize={10}
				onfilterchange={(next, prev) => (filterCalls = [...filterCalls, `${prev.minSize ?? ''}->${next.minSize ?? ''}`])}
			/>
		</div>
		<CodeBlock html={examples.code["Filter controls (controlled)"]} />
		<p class="probe" aria-hidden="true" data-testid="filter-ctrl-calls">{filterCalls.join(',')}</p>
	</section>
</div>
