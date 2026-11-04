<script lang="ts" generics="T extends Record<string, unknown> = Record<string, unknown>">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Axis, Chart, Circle, Layer, Line, Rect, Text } from 'layerchart';
	import { scaleBand, type ScaleBand, type ScaleContinuousNumeric } from 'd3-scale';
	import {
		clampSize,
		computeUpset,
		fromIntersections,
		sizeDomain,
		sizeScale,
		sizeTicks,
		reportOf,
		type Intersection,
		type PrecomputedIntersection,
		type SetInfo,
		type TooltipContext,
		type UpSetOptions,
		type UpSetReport,
		type UpSetResult,
		type UpSetScale
	} from './upset.js';

	interface Props extends UpSetOptions, Omit<HTMLAttributes<HTMLDivElement>, 'color' | 'onselect'> {
		/** Rows with one boolean column per set. Ignored when `intersections` is given. */
		data?: T[];
		/**
		 * Intersections that were counted elsewhere. Order is kept as given (no re-sorting unless you
		 * pass `sortIntersectionsBy`), and `sets` keep their order too.
		 */
		intersections?: PrecomputedIntersection[];
		/** Set sizes for precomputed input; without them the set-size panel is hidden. */
		setSizes?: Record<string, number>;
		/** Total item count (precomputed input), used for percentages in the default tooltip. */
		total?: number;
		/** Names of the sets (matrix rows). With `data`: the boolean membership columns. */
		sets: string[];
		/** Show the set-size bars on the left. Default: true for `data`, only with `setSizes` otherwise. */
		showSetSizes?: boolean;
		/** Display labels for set names (map or function). */
		setLabels?: Record<string, string> | ((name: string) => string);
		/** Sets whose row label is drawn bold and followed by `emphasisMarker`. */
		emphasizedSets?: string[];
		emphasisMarker?: string;
		/** Truncate row labels longer than this many characters with an ellipsis. */
		maxLabelLength?: number;
		/** Reserve at least this many columns, so a short list doesn't stretch one bar across the chart. */
		minSlots?: number;
		/** Explicit y-axis ticks for the intersection-size axis. */
		yTicks?: number[];
		/** Number formatter for the y axis and bar labels. */
		formatSize?: (n: number) => string;
		/** Width/height of one matrix cell, px. */
		cellSize?: number;
		/** Cap the plot's width (number = px, or any CSS length); it scrolls horizontally inside. */
		maxWidth?: number | string;
		/** Shrink `cellSize` toward `minCellSize` so the matrix fits the container's width. */
		fit?: boolean;
		/** Smallest cell size `fit` shrinks to, px; below it the plot scrolls. */
		minCellSize?: number;
		/** Height of the intersection-size panel, px. */
		barHeight?: number;
		/** Width of the set-size panel, px. */
		setBarWidth?: number;
		/** Width reserved for set names / the intersection axis, px. */
		labelWidth?: number;
		/**
		 * Color of bars and active matrix dots; a function colors each intersection individually.
		 * Unset: the `--upset-bar` CSS custom property, then `#2b6cb0`.
		 */
		color?: string | ((intersection: Intersection<T>) => string);
		/** Per-set colors (set-size bars and, for single-set intersections, the intersection). */
		setColors?: Record<string, string>;
		/** Color used for the selected intersection. Defaults to `color`. */
		highlightColor?: string;
		/** Opacity of non-focused columns while hovering/selecting (1 disables dimming). */
		dimOpacity?: number;
		/** Matrix dot radius as a fraction of the cell size. */
		dotRadius?: number;
		/** Width of the matrix connector lines, px. */
		connectorWidth?: number;
		/** Padding between bars, 0-1. */
		barPadding?: number;
		/** Rounded bar corners, px. */
		barRadius?: number;
		/** Font size of labels, px. */
		fontSize?: number;
		/** Axis titles; omit to hide. */
		intersectionLabel?: string;
		setLabel?: string;
		/** Hover/focus tooltips on intersection columns and set bars. */
		tooltips?: boolean;
		/** Text for an intersection: the tooltip, `aria-label` and `data-tip` of its bar. */
		describe?: (intersection: Intersection<T>) => string;
		/** Replace the default tooltip content. */
		tooltip?: Snippet<[TooltipContext<T>]>;
		/** Called when the pointer or keyboard focus enters/leaves an intersection. */
		onhover?: (intersection: Intersection<T> | null) => void;
		/** Accessible name of the whole plot. */
		'aria-label'?: string;
		/** Color of inactive matrix dots. Unset: `--upset-dot-off`, then `#d4d4d8`. */
		inactiveColor?: string;
		/** Show size labels above intersection bars. */
		showLabels?: boolean;
		/** Alternate row shading in the matrix. */
		stripes?: boolean;
		/**
		 * Called when the selection changes (null when deselected). `previous` is the intersection
		 * that was selected before (null if none, or if it is no longer among the intersections).
		 */
		onselect?: (selected: Intersection<T> | null, previous: Intersection<T> | null) => void;
		/** Bindable id of the selected intersection. */
		selected?: string | null;
		/** Bindable scale of the size bars: `linear` (default), `log`, or `symlog` (shows 0). Drives both panels. */
		scale?: UpSetScale;
		/** Scale of the set-size panel when it should differ from `scale`. */
		setScale?: UpSetScale;
		/** Render a button that switches between linear and log (symlog when a size is 0). */
		scaleToggle?: boolean;
		/** Called when the toggle is pressed; with `controlled` it is the only effect. */
		onscalechange?: (next: UpSetScale, previous: UpSetScale) => void;
		/** Controlled mode: selecting, pressing Escape or the scale toggle only calls the callback; `selected` and `scale` are never assigned internally. */
		controlled?: boolean;
		/** Total intersections before truncation, when a precomputed list was cut elsewhere. */
		intersectionsTotal?: number;
		/** Called when the number of shown/hidden intersections changes. */
		onresult?: (r: UpSetReport) => void;
		/** Rendered below the plot, e.g. "the largest N of M combinations are drawn". */
		footer?: Snippet<[UpSetReport]>;
	}

	let {
		data,
		intersections,
		setSizes,
		total,
		sets,
		showSetSizes,
		setLabels,
		emphasizedSets = [],
		emphasisMarker = '●',
		maxLabelLength,
		minSlots = 0,
		yTicks,
		formatSize = (n: number) => String(n),
		cellSize: cellSizeProp = 28,
		maxWidth,
		fit = false,
		minCellSize = 12,
		barHeight = 200,
		setBarWidth = 150,
		labelWidth = 120,
		color,
		setColors,
		highlightColor,
		dimOpacity = 0.3,
		dotRadius = 0.3,
		connectorWidth = 3,
		barPadding = 0.3,
		barRadius = 2,
		fontSize = 12,
		intersectionLabel,
		setLabel,
		tooltips = true,
		describe: describeProp,
		tooltip,
		onhover,
		'aria-label': ariaLabel = 'UpSet plot',
		inactiveColor,
		showLabels = true,
		stripes = true,
		onselect,
		selected = $bindable(null),
		controlled = false,
		scale = $bindable('linear'),
		setScale,
		scaleToggle = false,
		onscalechange,
		intersectionsTotal,
		onresult,
		footer,
		mode,
		sortIntersectionsBy,
		sortIntersectionsOrder,
		sortSetsBy,
		sortSetsOrder,
		minSize,
		maxSize,
		minDegree,
		maxDegree,
		limit,
		keepItems,
		...rest
	}: Props = $props();

	const result = $derived<UpSetResult<T>>(
		intersections
			? (fromIntersections(sets, intersections, {
					setSizes,
					total,
					intersectionsTotal,
					sortIntersectionsBy,
					sortIntersectionsOrder,
					sortSetsBy,
					sortSetsOrder,
					minSize,
					maxSize,
					minDegree,
					maxDegree,
					limit
				}) as UpSetResult<T>)
			: computeUpset(data ?? [], sets, {
					mode,
					sortIntersectionsBy,
					sortIntersectionsOrder,
					sortSetsBy,
					sortSetsOrder,
					minSize,
					maxSize,
					minDegree,
					maxDegree,
					limit,
					keepItems
				})
	);

	const report = $derived(reportOf(result));
	let lastReport = '';
	$effect(() => {
		const key = `${report.shown}/${report.total}`;
		if (key === lastReport) return;
		lastReport = key;
		onresult?.(report);
	});

	const setPanel = $derived(showSetSizes ?? (intersections ? setSizes != null : true));
	const setPanelWidth = $derived(setPanel ? setBarWidth : 0);

	const setNames = $derived(result.sets.map((s) => s.name));
	const placeholders = $derived(
		Array.from({ length: Math.max(0, minSlots - result.intersections.length) }, (_, j) => `\0empty-${j}`)
	);
	const ids = $derived([...result.intersections.map((i) => i.id), ...placeholders]);
	const maxSetSize = $derived(Math.max(1, ...result.sets.map((s) => s.size)));
	const topSize = $derived(Math.max(1, ...result.intersections.map((i) => i.size)));

	// ---- size scales -------------------------------------------------------------------------
	const setKind = $derived(setScale ?? scale);
	const hasZero = $derived(
		result.intersections.some((i) => i.size <= 0) || (setPanel && result.sets.some((s) => s.size <= 0))
	);
	const yMax = $derived(yTicks ? Math.max(topSize, ...yTicks) : topSize);
	const yDomain = $derived<[number, number | null]>(
		scale === 'linear' ? [0, yTicks ? yMax : null] : sizeDomain(scale, yMax)
	);
	const yTickList = $derived(
		scale === 'linear'
			? yTicks
			: scale === 'log' && yTicks
				? yTicks.filter((t) => t > 0)
				: (yTicks ?? sizeTicks(scale, sizeDomain(scale, yMax)[1]))
	);
	const setDomain = $derived<[number, number]>(
		setKind === 'linear'
			? [maxSetSize, 0]
			: (() => {
					const [lo, hi] = sizeDomain(setKind, maxSetSize);
					return [hi, lo];
				})()
	);
	const setTickList = $derived(setKind === 'linear' ? [] : (sizeTicks(setKind, setDomain[0]) ?? []));

	function toggleScale() {
		const previous = scale;
		const next: UpSetScale = scale === 'linear' ? (hasZero ? 'symlog' : 'log') : 'linear';
		if (!controlled) scale = next;
		onscalechange?.(next, previous);
	}

	let containerWidth = $state(0);
	const cellSize = $derived(
		fit && containerWidth > 0
			? Math.min(
					cellSizeProp,
					Math.max(minCellSize, (containerWidth - setPanelWidth - labelWidth) / Math.max(1, ids.length))
				)
			: cellSizeProp
	);
	const scrolls = $derived(maxWidth != null || fit);

	const matrixWidth = $derived(Math.max(1, ids.length) * cellSize);
	const matrixHeight = $derived(Math.max(1, setNames.length) * cellSize);
	const topPad = 18;

	let root: HTMLDivElement | undefined = $state();
	let hovered = $state<string | null>(null);
	let focused = $state<string | null>(null);
	const focus = $derived(hovered ?? focused ?? selected);
	const opacity = (id: string) => (focus && focus !== id ? dimOpacity : 1);

	/** Color a prop dictates for this intersection; undefined leaves it to CSS (custom properties). */
	function colorOf(i: Intersection<T>): string | undefined {
		if (selected === i.id && highlightColor) return highlightColor;
		if (i.degree === 1 && setColors?.[i.sets[0]]) return setColors[i.sets[0]];
		return typeof color === 'function' ? color(i) : color;
	}
	/** Class that hands a mark's colour to CSS; empty when a prop sets it inline. */
	const themed = (inline: string | undefined, cls: string) => (inline === undefined ? cls : '');

	/** Display name of a set (no truncation or marker): used in tooltips and aria labels. */
	const labelOf = (name: string) =>
		typeof setLabels === 'function' ? setLabels(name) : (setLabels?.[name] ?? name);
	/** Matrix row label: truncated, and marked when emphasised. */
	const rowLabelOf = (name: string) => {
		let l = labelOf(name);
		if (maxLabelLength && l.length > maxLabelLength) l = l.slice(0, maxLabelLength - 1) + '…';
		return emphasizedSets.includes(name) ? `${l} ${emphasisMarker}`.trim() : l;
	};

	const describe = (i: Intersection<T>) => {
		if (describeProp) return describeProp(i);
		const pct = Number.isFinite(result.total) && result.total > 0 ? ` (${((100 * i.size) / result.total).toFixed(1)}%)` : '';
		return `${i.sets.map(labelOf).join(' ∩ ')}: ${formatSize(i.size)}${pct}`;
	};

	function select(i: Intersection<T>) {
		const previous = result.intersections.find((d) => d.id === selected) ?? null;
		const next = selected === i.id ? null : i.id;
		if (!controlled) selected = next;
		onselect?.(next ? i : null, previous);
	}

	// ---- tooltip -------------------------------------------------------------------------
	let tip = $state<{ x: number; y: number; ctx: TooltipContext<T> } | null>(null);

	function tipAtPointer(ctx: TooltipContext<T>, e: PointerEvent) {
		if (!tooltips || !root) return;
		const r = root.getBoundingClientRect();
		tip = { x: e.clientX - r.left, y: e.clientY - r.top, ctx };
	}
	function tipAtElement(ctx: TooltipContext<T>, el: Element) {
		if (!tooltips || !root) return;
		const r = root.getBoundingClientRect();
		const b = el.getBoundingClientRect();
		tip = { x: b.left + b.width / 2 - r.left, y: b.top - r.top, ctx };
	}
	const intersectionCtx = (i: Intersection<T>): TooltipContext<T> => ({
		kind: 'intersection',
		intersection: i,
		text: describe(i)
	});

	function enter(i: Intersection<T>, e: PointerEvent) {
		hovered = i.id;
		onhover?.(i);
		tipAtPointer(intersectionCtx(i), e);
	}
	function leave() {
		hovered = null;
		if (focused == null) tip = null;
		onhover?.(null);
	}

	// ---- keyboard ------------------------------------------------------------------------
	function barKeydown(e: KeyboardEvent, i: Intersection<T>) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			select(i);
			return;
		}
		if (e.key === 'Escape') {
			if (selected != null) {
				const previous = result.intersections.find((d) => d.id === selected) ?? null;
				if (!controlled) selected = null;
				onselect?.(null, previous);
			}
			return;
		}
		const bars = Array.from(root?.querySelectorAll<SVGElement>('[data-upset-bar]') ?? []);
		const at = bars.indexOf(e.currentTarget as SVGElement);
		const next =
			e.key === 'ArrowRight' ? at + 1
			: e.key === 'ArrowLeft' ? at - 1
			: e.key === 'Home' ? 0
			: e.key === 'End' ? bars.length - 1
			: null;
		if (next != null && bars[next]) {
			e.preventDefault();
			bars[next].focus();
		}
	}
	function barFocus(i: Intersection<T>, e: FocusEvent) {
		focused = i.id;
		onhover?.(i);
		(e.currentTarget as Element).scrollIntoView({ inline: 'nearest', block: 'nearest' });
		tipAtElement(intersectionCtx(i), e.currentTarget as Element);
	}
	function barBlur() {
		focused = null;
		if (hovered == null) tip = null;
		onhover?.(null);
	}
</script>

<div
	class="upset-scroll"
	class:scrolls
	style:max-width={typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth}
	style:width={maxWidth != null && !fit ? 'max-content' : undefined}
	bind:clientWidth={containerWidth}
>
<div
	{...rest}
	bind:this={root}
	class={['upset', rest.class]}
	role="group"
	aria-label={ariaLabel}
	style:font-size="{fontSize}px"
	data-scale={scale}
	style:grid-template-columns="{setPanelWidth}px {labelWidth + matrixWidth}px"
	style:grid-template-rows="{barHeight + topPad}px {matrixHeight}px"
	onpointerleave={() => {
		hovered = null;
		if (focused == null) tip = null;
	}}
>
	<div class="corner">{setPanel ? (setLabel ?? '') : ''}</div>
	{#if scaleToggle}
		<button
			type="button"
			class="upset-scale-toggle"
			style:left="{setPanelWidth + 4}px"
			aria-pressed={scale !== 'linear'}
			data-upset-scale-toggle=""
			title="Toggle between linear and logarithmic bar scale"
			onclick={toggleScale}
		>
			{scale === 'symlog' ? 'symlog' : 'log'}
		</button>
	{/if}

	<!-- Intersection size: vertical bars aligned to matrix columns -->
	<div class="panel">
		<Chart
			data={result.intersections}
			x="id"
			xScale={scaleBand().padding(barPadding)}
			xDomain={ids}
			y="size"
			yScale={sizeScale(scale)}
			{yDomain}
			yNice={scale === 'linear' && !yTicks}
			padding={{ top: topPad, right: 0, bottom: 0, left: labelWidth }}
		>
			{#snippet children({ context })}
				{@const xs = context.xScale as ScaleBand<string>}
				{@const ys = context.yScale as ScaleContinuousNumeric<number, number>}
				<Layer type="svg">
					<Axis
						placement="left"
						label={intersectionLabel}
						ticks={yTickList}
						format={(v: number) => formatSize(v)}
						grid={{ class: 'upset-grid' }}
						rule={false}
					/>
					{#each result.intersections as d (d.id)}
						{@const x = xs(d.id) ?? 0}
						{@const y = ys(clampSize(scale, d.size))}
						{@const isSel = selected === d.id}
						{@const fill = colorOf(d)}
						{@const label = describe(d)}
						<Rect
							{x}
							{y}
							width={xs.bandwidth()}
							height={Math.max(0, context.height - y)}
							{fill}
							fillOpacity={opacity(d.id)}
							stroke={isSel ? 'currentColor' : 'none'}
							strokeWidth={isSel ? 2 : 0}
							corners={[barRadius, barRadius, 0, 0]}
							class="clickable upset-bar {themed(fill, isSel ? 'upset-bar-selected' : 'upset-bar-fill')}"
							role="button"
							tabindex={0}
							aria-label={label}
							aria-pressed={isSel}
							data-upset-bar=""
							data-id={d.id}
							data-set={d.id}
							data-n={d.size}
							data-tip={label}
							onclick={() => select(d)}
							onkeydown={(e: KeyboardEvent) => barKeydown(e, d)}
							onfocus={(e: FocusEvent) => barFocus(d, e)}
							onblur={barBlur}
							onpointerenter={(e: PointerEvent) => enter(d, e)}
							onpointermove={(e: PointerEvent) => tipAtPointer(intersectionCtx(d), e)}
							onpointerleave={leave}
						/>
						{#if showLabels}
							<Text
								value={formatSize(d.size)}
								x={x + xs.bandwidth() / 2}
								{y}
								dy={-4}
								textAnchor="middle"
								class="upset-label"
								data-upset-count={d.id}
							/>
						{/if}
					{/each}
				</Layer>
			{/snippet}
		</Chart>
	</div>

	<!-- Set size: horizontal bars growing to the left, aligned to matrix rows -->
	<div class="panel">
		{#if setPanel}
			<Chart
				data={result.sets}
				y="name"
				yScale={scaleBand().padding(barPadding)}
				yDomain={setNames}
				x="size"
				xScale={sizeScale(setKind)}
				xDomain={setDomain}
				padding={{ top: 0, right: 6, bottom: 0, left: 30 }}
			>
				{#snippet children({ context })}
					{@const xs = context.xScale as ScaleContinuousNumeric<number, number>}
					{@const ys = context.yScale as ScaleBand<string>}
					<Layer type="svg">
						{#each setTickList as t (t)}
							<Line x1={xs(t)} x2={xs(t)} y1={0} y2={context.height} class="upset-grid" data-upset-set-tick={t} />
							<Text
								value={formatSize(t)}
								x={xs(t)}
								y={context.height}
								dy={-2}
								textAnchor="middle"
								class="upset-label upset-set-tick"
							/>
						{/each}
						{#each result.sets as s (s.name)}
							{@const y = ys(s.name) ?? 0}
							{@const x = xs(clampSize(setKind, s.size))}
							<Rect
								{x}
								{y}
								width={Math.max(0, context.width - x)}
								height={ys.bandwidth()}
								fill={setColors?.[s.name] ?? (typeof color === 'string' ? color : undefined)}
								class={themed(setColors?.[s.name] ?? (typeof color === 'string' ? color : undefined), 'upset-bar-fill')}
								corners={[barRadius, 0, 0, barRadius]}
								data-upset-set-bar={s.name}
								data-n={s.size}
								onpointerenter={(e: PointerEvent) =>
									tipAtPointer({ kind: 'set', set: s, text: `${labelOf(s.name)}: ${formatSize(s.size)}` }, e)}
								onpointermove={(e: PointerEvent) =>
									tipAtPointer({ kind: 'set', set: s, text: `${labelOf(s.name)}: ${formatSize(s.size)}` }, e)}
								onpointerleave={() => (tip = focused == null ? null : tip)}
							/>
							<Text
								value={formatSize(s.size)}
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
		{/if}
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
								class="upset-stripe"
							/>
						{/if}
						<Text
							value={rowLabelOf(name)}
							x={-8}
							y={y + h / 2}
							textAnchor="end"
							verticalAnchor="middle"
							class="upset-set-name"
							style={emphasizedSets.includes(name) ? 'font-weight: 700' : undefined}
							data-upset-row={name}
						/>
					{/each}

					{#each result.intersections as d (d.id)}
						{@const cx = (xs(d.id) ?? 0) + w / 2}
						{@const dot = colorOf(d)}
						{@const dotClass = selected === d.id ? 'upset-on-selected' : 'upset-on'}
						{@const rows = d.sets.map((s) => setNames.indexOf(s))}
						{@const top = Math.min(...rows)}
						{@const bottom = Math.max(...rows)}
						<!-- Mouse target only: the focusable control for each column is its bar. -->
						<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
						<g
							class="clickable"
							aria-hidden="true"
							data-upset-column={d.id}
							onclick={() => select(d)}
							onpointerenter={(e: PointerEvent) => enter(d, e)}
							onpointermove={(e: PointerEvent) => tipAtPointer(intersectionCtx(d), e)}
							onpointerleave={leave}
						>
							<Rect x={cx - w / 2} y={0} width={w} height={context.height} fill="transparent" />
							{#if d.degree > 1}
								<Line
									x1={cx}
									x2={cx}
									y1={top * h + h / 2}
									y2={bottom * h + h / 2}
									stroke={dot}
									class={themed(dot, dotClass)}
									strokeWidth={connectorWidth}
									opacity={opacity(d.id)}
								/>
							{/if}
							{#each setNames as name (name)}
								{@const on = d.sets.includes(name)}
								<Circle
									{cx}
									cy={(ys(name) ?? 0) + h / 2}
									r={Math.min(w, h) * dotRadius}
									fill={on ? dot : inactiveColor}
									class={on ? themed(dot, dotClass) : themed(inactiveColor, 'upset-off')}
									fillOpacity={on ? opacity(d.id) : 1}
								/>
							{/each}
						</g>
					{/each}
				</Layer>
			{/snippet}
		</Chart>
	</div>

	{#if footer}
		<div class="upset-footer">{@render footer(report)}</div>
	{/if}

	{#if tooltips && tip}
		<div class="upset-tooltip" role="tooltip" style:left="{tip.x}px" style:top="{tip.y}px">
			{#if tooltip}
				{@render tooltip(tip.ctx)}
			{:else}
				{tip.ctx.text}
			{/if}
		</div>
	{/if}
</div>
</div>

<style>
	.upset-scroll.scrolls {
		overflow-x: auto;
		/* room above the plot so the tooltip is not clipped by the scroll container */
		padding-top: 32px;
		margin-top: -32px;
	}
	.upset {
		display: grid;
		position: relative;
		width: max-content;
	}
	.corner {
		align-self: end;
		padding-left: 4px;
		opacity: 0.7;
	}
	.upset-scale-toggle {
		position: absolute;
		top: 0;
		z-index: 1;
		font: inherit;
		font-size: 0.85em;
		line-height: 1.2;
		padding: 0 6px;
		cursor: pointer;
		border-radius: 3px;
		color: var(--upset-control-fg, var(--upset-text, currentColor));
		background: transparent;
		border: 1px solid var(--upset-control-border, var(--upset-grid, color-mix(in srgb, currentColor 25%, transparent)));
	}
	.upset-scale-toggle[aria-pressed='true'] {
		border-color: var(--upset-control-on, var(--upset-bar, #2b6cb0));
		color: var(--upset-control-on, var(--upset-bar, #2b6cb0));
	}
	.upset :global(.upset-set-tick) {
		opacity: 0.6;
		font-size: 0.75em;
	}
	.upset-footer {
		grid-column: 1 / -1;
	}
	.panel {
		position: relative;
		min-width: 0;
		min-height: 0;
	}
	.upset :global(.clickable) {
		cursor: pointer;
	}
	.upset :global(.upset-bar:focus-visible) {
		outline: 2px solid currentColor;
		outline-offset: 1px;
	}
	.upset :global(.upset-label) {
		font-size: 0.92em;
		fill: var(--upset-text, currentColor);
	}
	.upset :global(.upset-set-name) {
		font-size: 1.08em;
		fill: var(--upset-text, currentColor);
	}
	/* Colours that no prop dictates come from custom properties (fallbacks = the old defaults). */
	.upset :global(.upset-bar-fill) {
		fill: var(--upset-bar, #2b6cb0);
	}
	.upset :global(.upset-bar-selected) {
		fill: var(--upset-bar-selected, var(--upset-bar, #2b6cb0));
	}
	.upset :global(circle.upset-on) {
		fill: var(--upset-dot-on, var(--upset-bar, #2b6cb0));
	}
	.upset :global(line.upset-on) {
		stroke: var(--upset-dot-on, var(--upset-bar, #2b6cb0));
	}
	.upset :global(circle.upset-on-selected) {
		fill: var(--upset-bar-selected, var(--upset-dot-on, var(--upset-bar, #2b6cb0)));
	}
	.upset :global(line.upset-on-selected) {
		stroke: var(--upset-bar-selected, var(--upset-dot-on, var(--upset-bar, #2b6cb0)));
	}
	.upset :global(.upset-off) {
		fill: var(--upset-dot-off, #d4d4d8);
	}
	/* Translucent mixes keep the old 12% / 6% opacity while the property is the final colour. */
	.upset :global(.upset-grid) {
		stroke: var(--upset-grid, color-mix(in srgb, currentColor 12%, transparent));
	}
	.upset :global(.upset-stripe) {
		fill: var(--upset-stripe, color-mix(in srgb, currentColor 6%, transparent));
	}
	.upset-tooltip {
		position: absolute;
		z-index: 10;
		transform: translate(-50%, calc(-100% - 10px));
		pointer-events: none;
		white-space: nowrap;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 0.95em;
		color: var(--upset-tooltip-fg, #fff);
		background: var(--upset-tooltip-bg, rgb(24 24 27 / 0.92));
		box-shadow: 0 2px 8px rgb(0 0 0 / 0.25);
	}
</style>
