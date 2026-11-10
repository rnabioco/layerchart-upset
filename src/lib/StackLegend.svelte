<script lang="ts">
	interface Props {
		/** Category names, in stacking order. */
		categories: string[];
		colorOf: (category: string) => string;
	}

	let { categories, colorOf }: Props = $props();
</script>

<ul class="upset-legend" aria-label="Stack categories" data-upset-legend="">
	{#each categories as c (c)}
		<li data-upset-legend-item={c}>
			<span class="upset-swatch" style:background={colorOf(c)}></span>{c}
		</li>
	{/each}
</ul>

<style>
	.upset-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 2px 14px;
		margin: 0 0 8px;
		padding: 0 0 0 2px;
		list-style: none;
		font-size: 0.9em;
		color: var(--upset-text, currentColor);
	}
	.upset-legend li {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}
	.upset-swatch {
		width: 0.9em;
		height: 0.9em;
		border-radius: 2px;
	}
</style>
