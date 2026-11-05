<script lang="ts">
	import { UpSet } from '../../../lib/index.js';
	import { genres, makeData } from '../../demo-data.js';

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
	let selected = $state<string | null>(null);
	let controlledPick = $state<string | null>('c');
	let controlledCalls = $state<(string | null)[]>([]);
	let selectCalls = $state<string[]>([]);
	let pickedSet = $state<string | null>(null);
	let controlledSet = $state<string | null>('Drama');
	let setCalls = $state<string[]>([]);
</script>

<div class="grid">
	<section>
		<h2>Selection and highlighting</h2>
		<p class="desc">Click a column. highlightColor + dimOpacity.</p>
		<code>{`bind:selected highlightColor="#e53e3e" dimOpacity={0.15}`}</code>
		<div class="chart">
			<UpSet
				{data}
				sets={genres}
				minSize={8}
				bind:selected
				highlightColor="#e53e3e"
				dimOpacity={0.15}
			/>
			<small>selected: {selected ?? 'none'}</small>
		</div>
	</section>

	<section>
		<h2>Custom tooltip</h2>
		<p class="desc">
			Hover or Tab to a bar. The tooltip is a snippet, and every bar is a button (Enter/Space select, arrows move,
			Esc clears).
		</p>
		<code>{`{#snippet tooltip(t)} … {/snippet}  onhover={(i) => …}`}</code>
		<div class="chart">
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
		</div>
	</section>

	<section>
		<h2>Controlled selection</h2>
		<p class="desc">The owner holds the selection; clicks only notify through onselect.</p>
		<code>{`controlled selected={pick} onselect={(i) => …}`}</code>
		<div class="chart">
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
		<h2>Set selection (bound)</h2>
		<p class="desc">
			Click a set bar or row label to keep only the columns that contain it; Esc or a second click clears.
		</p>
		<code>bind:selectedSet onsetselect=(set, previous)</code>
		<div class="chart">
			<UpSet {data} sets={genres} minSize={10} bind:selectedSet={pickedSet} />
		</div>
		<p class="desc" data-testid="set-bound">{pickedSet ?? 'none'}</p>
	</section>

	<section>
		<h2>Set selection (controlled)</h2>
		<p class="desc">With <code>controlled</code> the owner decides; <code>onsetselect</code> only reports.</p>
		<code>selectedSet={'{controlledSet}'} controlled onsetselect</code>
		<div class="chart">
			<UpSet
				{data}
				sets={genres}
				minSize={10}
				selectedSet={controlledSet}
				controlled
				onsetselect={(s, p) => (setCalls = [...setCalls, `${p?.name ?? 'none'}->${s?.name ?? 'none'}`])}
			/>
		</div>
		<p class="desc" data-testid="set-ctrl-calls">{setCalls.join(',')}</p>
	</section>
</div>
