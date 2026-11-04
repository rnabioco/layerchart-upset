<script lang="ts" generics="T extends Record<string, unknown>">
	import { Axis, Chart, Circle, Layer, Line, Rect, Text } from 'layerchart';
	import { scaleBand, scaleLinear, type ScaleBand, type ScaleLinear } from 'd3-scale';
	import { computeUpset, type Intersection, type UpSetOptions } from './upset.js';

	interface Props extends UpSetOptions {
		/** Rows with one boolean column per set. */
		data: T[];
		/** Names of the boolean membership columns. */
		sets: string[];
		/** Width/height of one matrix cell, px. */
		cellSize?: number;
		/** Height of the intersection-size panel, px. */
		barHeight?: number;
		/** Width of the set-size panel, px. */
		setBarWidth?: number;
		/** Width reserved for set names / the intersection axis, px. */
		labelWidth?: number;
		/** Color of bars and active matrix dots. */
		color?: string;
		/** Color of inactive matrix dots. */
		inactiveColor?: string;
		/** Show size labels above intersection bars. */
		showLabels?: boolean;
		/** Alternate row shading in the matrix. */
		stripes?: boolean;
		/** Called when an intersection column is clicked (null when deselected). */
		onselect?: (selected: Intersection<T> | null) => void;
		/** Bindable selected intersection id. */
		selected?: string | null;
	}

	let {
		data,
		sets,
		cellSize = 28,
		barHeight = 200,
		setBarWidth = 150,
		labelWidth = 120,
		color = '#2b6cb0',
		inactiveColor = '#d4d4d8',
		showLabels = true,
		stripes = true,
		onselect,
		selected = $bindable(null),
		mode,
		sortIntersectionsBy,
		sortIntersectionsOrder,
		sortSetsBy,
		sortSetsOrder,
		minSize,
		maxSize,
		minDegree,
		maxDegree,
		limit
	}: Props = $props();

	const result = $derived(
		computeUpset(data, sets, {
			mode,
			sortIntersectionsBy,
			sortIntersectionsOrder,
			sortSetsBy,
			sortSetsOrder,
			minSize,
			maxSize,
			minDegree,
			maxDegree,
			limit
		})
	);

	const setNames = $derived(result.sets.map((s) => s.name));
	const ids = $derived(result.intersections.map((i) => i.id));
	const maxSetSize = $derived(Math.max(1, ...result.sets.map((s) => s.size)));

	const matrixWidth = $derived(Math.max(1, ids.length) * cellSize);
	const matrixHeight = $derived(Math.max(1, setNames.length) * cellSize);
	const topPad = 18;

	let hovered = $state<string | null>(null);
	const focus = $derived(hovered ?? selected);
	const opacity = (id: string) => (focus && focus !== id ? 0.3 : 1);

	function select(i: Intersection<T>) {
		selected = selected === i.id ? null : i.id;
		onselect?.(selected ? i : null);
	}
</script>

<div
	class="upset"
	style:grid-template-columns="{setBarWidth}px {labelWidth + matrixWidth}px"
	style:grid-template-rows="{barHeight + topPad}px {matrixHeight}px"
>
	<div></div>

	<!-- Intersection size: vertical bars aligned to matrix columns -->
	<div class="panel">
		<Chart
			data={result.intersections}
			x="id"
			xScale={scaleBand().padding(0.3)}
			xDomain={ids}
			y="size"
			yScale={scaleLinear()}
			yDomain={[0, null]}
			yNice
			padding={{ top: topPad, right: 0, bottom: 0, left: labelWidth }}
		>
			{#snippet children({ context })}
				{@const xs = context.xScale as ScaleBand<string>}
				{@const ys = context.yScale as ScaleLinear<number, number>}
				<Layer type="svg">
					<Axis
						placement="left"
						grid={{ style: 'stroke: currentColor; stroke-opacity: 0.12' }}
						rule={false}
					/>
					{#each result.intersections as d (d.id)}
						{@const x = xs(d.id) ?? 0}
						{@const y = ys(d.size)}
						<Rect
							{x}
							{y}
							width={xs.bandwidth()}
							height={Math.max(0, context.height - y)}
							fill={color}
							fillOpacity={opacity(d.id)}
							class="clickable"
							onclick={() => select(d)}
							onpointerenter={() => (hovered = d.id)}
							onpointerleave={() => (hovered = null)}
						/>
						{#if showLabels}
							<Text
								value={String(d.size)}
								x={x + xs.bandwidth() / 2}
								{y}
								dy={-4}
								textAnchor="middle"
								class="upset-label"
							/>
						{/if}
					{/each}
				</Layer>
			{/snippet}
		</Chart>
	</div>

	<!-- Set size: horizontal bars growing to the left, aligned to matrix rows -->
	<div class="panel">
		<Chart
			data={result.sets}
			y="name"
			yScale={scaleBand().padding(0.3)}
			yDomain={setNames}
			x="size"
			xScale={scaleLinear()}
			xDomain={[maxSetSize, 0]}
			padding={{ top: 0, right: 6, bottom: 0, left: 30 }}
		>
			{#snippet children({ context })}
				{@const xs = context.xScale as ScaleLinear<number, number>}
				{@const ys = context.yScale as ScaleBand<string>}
				<Layer type="svg">
					{#each result.sets as s (s.name)}
						{@const y = ys(s.name) ?? 0}
						{@const x = xs(s.size)}
						<Rect
							{x}
							{y}
							width={Math.max(0, context.width - x)}
							height={ys.bandwidth()}
							fill={color}
						/>
						<Text
							value={String(s.size)}
							x={x - 4}
							y={y + ys.bandwidth() / 2}
							textAnchor="end"
							verticalAnchor="middle"
							class="upset-label"
						/>
					{/each}
				</Layer>
			{/snippet}
		</Chart>
	</div>

	<!-- Membership matrix -->
	<div class="panel">
		<Chart
			data={result.intersections}
			x="id"
			xScale={scaleBand().padding(0)}
			xDomain={ids}
			y="id"
			yScale={scaleBand().padding(0)}
			yDomain={setNames}
			padding={{ top: 0, right: 0, bottom: 0, left: labelWidth }}
		>
			{#snippet children({ context })}
				{@const xs = context.xScale as ScaleBand<string>}
				{@const ys = context.yScale as ScaleBand<string>}
				{@const w = xs.bandwidth()}
				{@const h = ys.bandwidth()}
				<Layer type="svg">
					{#each setNames as name, r (name)}
						{@const y = ys(name) ?? 0}
						{#if stripes && r % 2 === 0}
							<Rect
								x={-labelWidth}
								{y}
								width={labelWidth + matrixWidth}
								height={h}
								fill="currentColor"
								fillOpacity={0.06}
							/>
						{/if}
						<Text
							value={name}
							x={-8}
							y={y + h / 2}
							textAnchor="end"
							verticalAnchor="middle"
							class="upset-set-name"
						/>
					{/each}

					{#each result.intersections as d (d.id)}
						{@const cx = (xs(d.id) ?? 0) + w / 2}
						{@const rows = d.sets.map((s) => setNames.indexOf(s))}
						{@const top = Math.min(...rows)}
						{@const bottom = Math.max(...rows)}
						<g
							class="clickable"
							role="button"
							tabindex="0"
							aria-label={d.id}
							onclick={() => select(d)}
							onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && select(d)}
							onpointerenter={() => (hovered = d.id)}
							onpointerleave={() => (hovered = null)}
						>
							<Rect x={cx - w / 2} y={0} width={w} height={context.height} fill="transparent" />
							{#if d.degree > 1}
								<Line
									x1={cx}
									x2={cx}
									y1={top * h + h / 2}
									y2={bottom * h + h / 2}
									stroke={color}
									strokeWidth={3}
									opacity={opacity(d.id)}
								/>
							{/if}
							{#each setNames as name (name)}
								{@const on = d.sets.includes(name)}
								<Circle
									{cx}
									cy={(ys(name) ?? 0) + h / 2}
									r={Math.min(w, h) * 0.3}
									fill={on ? color : inactiveColor}
									fillOpacity={on ? opacity(d.id) : 1}
								/>
							{/each}
						</g>
					{/each}
				</Layer>
			{/snippet}
		</Chart>
	</div>
</div>

<style>
	.upset {
		display: grid;
		font-size: 12px;
		width: max-content;
	}
	.panel {
		position: relative;
		min-width: 0;
		min-height: 0;
	}
	.upset :global(.clickable) {
		cursor: pointer;
	}
	.upset :global(.upset-label) {
		font-size: 11px;
		fill: currentColor;
	}
	.upset :global(.upset-set-name) {
		font-size: 13px;
		fill: currentColor;
	}
</style>
