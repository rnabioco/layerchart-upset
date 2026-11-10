<script lang="ts">
	import type { UpSetFilters } from './upset.js';

	type NumberKey = 'minSize' | 'minDegree' | 'maxDegree' | 'limit';

	interface Props {
		/** All sets (the checkboxes), in their original order. */
		sets: string[];
		/** Sets currently removed from the plot. */
		hiddenSets: string[];
		/** Current values of the four number filters. */
		values: Pick<UpSetFilters, NumberKey>;
		/** True while any filter is set (enables the reset button). */
		active: boolean;
		/** Controlled mode: an input shows what the owner holds, not what was typed. */
		controlled: boolean;
		labelOf: (name: string) => string;
		/** Apply a change; the owner assigns the props (unless `controlled`) and reports it. */
		onchange: (patch: Partial<UpSetFilters>) => void;
	}

	let { sets, hiddenSets, values, active, controlled, labelOf, onchange }: Props = $props();

	const fields: { key: NumberKey; label: string; min: number; placeholder?: string }[] = [
		{ key: 'minSize', label: 'min size', min: 0, placeholder: '1' },
		{ key: 'minDegree', label: 'min degree', min: 1, placeholder: '1' },
		{ key: 'maxDegree', label: 'max degree', min: 1 },
		{ key: 'limit', label: 'limit', min: 1 }
	];

	const visibleCount = $derived(sets.filter((s) => !hiddenSets.includes(s)).length);

	function numberChange(key: NumberKey, e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		const raw = el.value.trim();
		const n = Number(raw);
		onchange({ [key]: raw === '' || !Number.isFinite(n) ? undefined : n });
		if (controlled) el.value = String(values[key] ?? '');
	}
	function toggleSet(e: Event, name: string) {
		onchange({
			hiddenSets: hiddenSets.includes(name) ? hiddenSets.filter((s) => s !== name) : [...hiddenSets, name]
		});
		if (controlled) (e.currentTarget as HTMLInputElement).checked = !hiddenSets.includes(name);
	}
</script>

<div class="upset-filters" role="group" aria-label="Filters" data-upset-filters="">
	{#each fields as f (f.key)}
		<label>
			{f.label}
			<input
				type="number"
				min={f.min}
				value={values[f.key] ?? ''}
				placeholder={f.placeholder}
				data-upset-filter={f.key}
				onchange={(e) => numberChange(f.key, e)}
			/>
		</label>
	{/each}
	<span class="upset-filter-sets">
		{#each sets as name (name)}
			<label>
				<input
					type="checkbox"
					checked={!hiddenSets.includes(name)}
					disabled={!hiddenSets.includes(name) && visibleCount <= 1}
					data-upset-filter-set={name}
					onchange={(e) => toggleSet(e, name)}
				/>
				{labelOf(name)}
			</label>
		{/each}
	</span>
	<button
		type="button"
		disabled={!active}
		data-upset-filter-reset=""
		onclick={() =>
			onchange({
				minSize: undefined,
				maxSize: undefined,
				minDegree: undefined,
				maxDegree: undefined,
				limit: undefined,
				hiddenSets: []
			})}
	>
		reset
	</button>
</div>

<style>
	.upset-filters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px 14px;
		margin-bottom: 8px;
		font-size: 0.9em;
		color: var(--upset-control-fg, var(--upset-text, currentColor));
	}
	.upset-filters input[type='number'] {
		width: 4.5em;
		margin-left: 4px;
		font: inherit;
		color: inherit;
		background: transparent;
		border: 1px solid var(--upset-control-border, var(--upset-grid, color-mix(in srgb, currentColor 25%, transparent)));
		border-radius: 3px;
	}
	.upset-filter-sets {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 2px 10px;
	}
	.upset-filters button {
		font: inherit;
		color: inherit;
		background: transparent;
		cursor: pointer;
		border: 1px solid var(--upset-control-border, var(--upset-grid, color-mix(in srgb, currentColor 25%, transparent)));
		border-radius: 3px;
	}
	.upset-filters button:disabled {
		opacity: 0.4;
		cursor: default;
	}
</style>
