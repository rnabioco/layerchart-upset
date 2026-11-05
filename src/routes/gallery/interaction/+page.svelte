<script lang="ts">
	import { UpSet } from '../../../lib/index.js';
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
	let selected = $state<string | null>(null);
	let hoverSet = $state<string | null>(null);
	let controlledPick = $state<string | null>('c');
	let controlledCalls = $state<(string | null)[]>([]);
	let selectCalls = $state<string[]>([]);
	let pickedSet = $state<string | null>(null);
	let controlledSet = $state<string | null>('Drama');
	let setCalls = $state<string[]>([]);
</script>

<CodeBlock html={examples.script} label="Show setup script" />

<div class="grid">
	<section>
		<h2>Selection and highlighting</h2>
		<p class="desc">Click a column. highlightColor + dimOpacity.</p>
		<div class="chart">
			<UpSet
				{data}
				sets={genres}
				minSize={8}
				bind:selected
				highlightColor="#e53e3e"
				dimOpacity={0.15}
				onsethover={(s) => (hoverSet = s?.name ?? null)}
			/>
		</div>
		<small class="probe" aria-hidden="true">selected: {selected ?? 'none'}</small>
		<div class="probe" aria-hidden="true" data-set-hover>hovered set: {hoverSet ?? 'none'}</div>
		<CodeBlock html={examples.code["Selection and highlighting"]} />
	</section>

	<section>
		<h2>Custom tooltip</h2>
		<p class="desc">
			Hover or Tab to a bar. The tooltip is a snippet, and every bar is a button (Enter/Space select, arrows move,
			Esc clears).
		</p>
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
		<CodeBlock html={examples.code["Custom tooltip"]} />
	</section>

	<section>
		<h2>Controlled selection</h2>
		<p class="desc">The owner holds the selection; clicks only notify through onselect.</p>
		<div class="chart">
			<UpSet
				intersections={counted}
				sets={contrasts}
				labelWidth={140}
				controlled
				selected={controlledPick}
				onselect={(i) => controlledCalls.push(i?.id ?? null)}
			/>
			<button type="button" data-set-pick onclick={() => (controlledPick = 'a')}>select a</button>
		</div>
		<small class="probe" aria-hidden="true" data-calls>calls: {controlledCalls.map((c) => c ?? 'null').join(',')}</small>
		<CodeBlock html={examples.code["Controlled selection"]} />
	</section>

	<section>
		<h2>onselect previous argument</h2>
		<div class="chart">
			<UpSet
				{data}
				sets={genres}
				minSize={40}
				onselect={(s, p) => selectCalls.push(`${s?.id ?? 'null'},${p?.id ?? 'null'}`)}
			/>
		</div>
		<CodeBlock html={examples.code["onselect previous argument"]} />
		<pre class="probe" aria-hidden="true" data-calls>{selectCalls.join('\n')}</pre>
	</section>

	<section>
		<h2>Set selection (bound)</h2>
		<p class="desc">
			Click a set bar or row label to keep only the columns that contain it; Esc or a second click clears.
		</p>
		<div class="chart">
			<UpSet {data} sets={genres} minSize={10} bind:selectedSet={pickedSet} />
		</div>
		<CodeBlock html={examples.code["Set selection (bound)"]} />
		<p class="probe" aria-hidden="true" data-testid="set-bound">{pickedSet ?? 'none'}</p>
	</section>

	<section>
		<h2>Set selection (controlled)</h2>
		<p class="desc">With <code>controlled</code> the owner decides; <code>onsetselect</code> only reports.</p>
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
		<CodeBlock html={examples.code["Set selection (controlled)"]} />
		<p class="probe" aria-hidden="true" data-testid="set-ctrl-calls">{setCalls.join(',')}</p>
	</section>
</div>
