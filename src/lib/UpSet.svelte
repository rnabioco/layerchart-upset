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
		queryCounts,
		stackSegments,
		reportOf,
		type StackBy,
		type Intersection,
		type PrecomputedIntersection,
		type SetInfo,
		type TooltipContext,
		type UpSetFilters,
		type UpSetOptions,
		type UpSetQuery,
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
		/**
		 * Subsets to highlight inside every column: each query draws an overlay bar (same width as the size bar)
		 * as tall as the number of the column's rows that pass `filter`. Overlays are painted in array order, so
		 * list the largest first; they do not stack. Needs `data` and `keepItems !== false` (otherwise ignored
		 * with a console warning). Overlays ignore the pointer, and the default tooltip lists the counts.
		 */
		queries?: UpSetQuery<T>[];
		/**
		 * Split each size bar into one segment per category of the column's rows: a key of the row or a function
		 * (missing values are `"(none)"`). Segment colors replace the bar fill; `color` still colors the matrix.
		 * Linear scale only (log scales draw the totals) and needs `data` and `keepItems !== false`; otherwise
		 * ignored with a console warning. Wins over `queries`.
		 */
		stackBy?: StackBy<T>;
		/** Segment colors by category (default: a built-in palette in stack order). */
		stackColors?: Record<string, string>;
		/** Categories bottom to top; the rest follow by overall count, descending. */
		stackOrder?: string[];
		/** Show a swatch legend above the plot. */
		stackLegend?: boolean;
		/** `total` labels the size axes and bar labels as a percentage of all items (bar lengths do not change). Needs a known total: with precomputed `intersections` pass `total`, otherwise counts are shown. */
		normalize?: 'none' | 'total';
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
		/** Bindable name of the selected set (a set bar or row label was clicked); columns without it are dimmed. */
		selectedSet?: string | null;
		/** Called when a set is selected or cleared (null). `previous` is the set selected before, if any. */
		onsetselect?: (set: SetInfo | null, previous: SetInfo | null) => void;
		/** Sets removed from the plot (bindable). With `data` the intersections are recomputed without them; with precomputed `intersections`, columns containing a hidden set are dropped. */
		hiddenSets?: string[];
		/** Render a bar above the plot to change `minSize`, `minDegree`, `maxDegree`, `limit` and which sets are shown. */
		filterControls?: boolean;
		/** Called when a filter control changes any filter; with `controlled` it is the only effect. */
		onfilterchange?: (filters: UpSetFilters, previous: UpSetFilters) => void;
		/** Controlled mode: selecting, pressing Escape, the scale toggle, choosing a set or changing a filter only calls the callback; `selected`, `selectedSet`, `scale`, the filter props and `hiddenSets` are never assigned internally. */
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
		selectedSet = $bindable(null),
		onsetselect,
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
		minSize = $bindable(),
		maxSize = $bindable(),
		minDegree = $bindable(),
		maxDegree = $bindable(),
		limit = $bindable(),
		hiddenSets = $bindable([]),
		filterControls = false,
		onfilterchange,
		keepItems,
		showEmpty,
		normalize = 'none',
		queries,
		stackBy,
		stackColors,
		stackOrder,
		stackLegend = false,
		...rest
	}: Props = $props();

	const visibleSets = $derived(sets.filter((s) => !hiddenSets.includes(s)));
	const visibleIntersections = $derived(
		intersections && hiddenSets.length
			? intersections.filter((i) => !i.sets.some((s) => hiddenSets.includes(s)))
			: intersections
	);

	const result = $derived<UpSetResult<T>>(
		visibleIntersections
			? (fromIntersections(visibleSets, visibleIntersections, {
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
					limit,
					showEmpty
				}) as UpSetResult<T>)
			: computeUpset(data ?? [], visibleSets, {
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
					showEmpty
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
	// normalize='total': axis ticks and bar labels read as a share of all items; bar lengths and tooltips (which
	// already add the percentage to the count) are unchanged. Falls back to counts when the total is unknown.
	const percent = $derived(normalize === 'total' && Number.isFinite(result.total) && result.total > 0);
	const axisFormat = $derived(
		percent
			? (n: number) => {
					const p = (100 * n) / result.total;
					return `${p < 10 && p !== 0 ? p.toFixed(1).replace(/\.0$/, '') : Math.round(p)}%`;
				}
			: formatSize
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
	/** Ids of the columns containing the selected set; null when no set is selected. */
	const inSelectedSet = $derived(
		selectedSet == null || !visibleSets.includes(selectedSet)
			? null
			: new Set(result.intersections.filter((i) => i.sets.includes(selectedSet!)).map((i) => i.id))
	);
	const opacity = (id: string) =>
		(focus && focus !== id) || (inSelectedSet && !inSelectedSet.has(id)) ? dimOpacity : 1;

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

	// Queries need the rows: with precomputed input or keepItems=false they are ignored (warned once).
	const rowsUsable = $derived(!intersections && keepItems !== false);
	// stackBy: needs the rows and a linear scale; it wins over queries.
	const stacking = $derived(stackBy != null && rowsUsable && scale === 'linear');
	const activeQueries = $derived(rowsUsable && !stacking && !stackBy ? (queries ?? []) : []);
	const counts = $derived(queryCounts(result, activeQueries));
	const stack = $derived(stacking ? stackSegments(result, stackBy!, stackOrder) : null);
	const PALETTE = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac'];
	const stackColor = (c: string) => stackColors?.[c] ?? PALETTE[(stack?.order.indexOf(c) ?? 0) % PALETTE.length];
	const warned = new Set<string>();
	function warnOnce(key: string, msg: string) {
		if (warned.has(key)) return;
		warned.add(key);
		console.warn(`UpSet: ${msg}`);
	}
	$effect(() => {
		if (queries?.length && !rowsUsable) warnOnce('queries', '`queries` need `data` and keepItems !== false; ignoring them.');
		if (stackBy != null && !rowsUsable) warnOnce('stack-rows', '`stackBy` needs `data` and keepItems !== false; ignoring it.');
		if (stackBy != null && rowsUsable && scale !== 'linear')
			warnOnce('stack-scale', '`stackBy` needs the linear scale; drawing totals.');
		if (stackBy != null && queries?.length) warnOnce('stack-queries', '`stackBy` and `queries` together: ignoring `queries`.');
	});

	const describe = (i: Intersection<T>) => {
		if (describeProp) return describeProp(i);
		const pct = Number.isFinite(result.total) && result.total > 0 ? ` (${((100 * i.size) / result.total).toFixed(1)}%)` : '';
		const q = activeQueries.map((query, k) => ` · ${query.id}: ${formatSize(counts.get(i.id)?.[k] ?? 0)}`).join('');
		const s = (stack?.segments.get(i.id) ?? []).map((g) => ` · ${g.category}: ${formatSize(g.n)}`).join('');
		return `${i.sets.map(labelOf).join(' ∩ ')}: ${formatSize(i.size)}${pct}${q}${s}`;
	};

	function select(i: Intersection<T>) {
		const previous = result.intersections.find((d) => d.id === selected) ?? null;
		const next = selected === i.id ? null : i.id;
		if (!controlled) selected = next;
		onselect?.(next ? i : null, previous);
	}

	// ---- filters -----------------------------------------------------------------------------
	const filtersNow = (): UpSetFilters => ({
		minSize,
		maxSize,
		minDegree,
		maxDegree,
		limit,
		hiddenSets: [...hiddenSets]
	});
	/** Apply a change: assign the props unless `controlled`, and report old and new either way. */
	function changeFilters(patch: Partial<UpSetFilters>) {
		const previous = filtersNow();
		const next: UpSetFilters = { ...previous, ...patch };
		if (!controlled) {
			minSize = next.minSize;
			maxSize = next.maxSize;
			minDegree = next.minDegree;
			maxDegree = next.maxDegree;
			limit = next.limit;
			hiddenSets = next.hiddenSets;
		}
		onfilterchange?.(next, previous);
	}
	const numberFilter = (key: 'minSize' | 'minDegree' | 'maxDegree' | 'limit') => (e: Event) => {
		const el = e.currentTarget as HTMLInputElement;
		const raw = el.value.trim();
		const n = Number(raw);
		changeFilters({ [key]: raw === '' || !Number.isFinite(n) ? undefined : n });
		// controlled: the input shows what the owner holds, not what was typed
		if (controlled) el.value = String({ minSize, minDegree, maxDegree, limit }[key] ?? '');
	};
	function toggleSetVisible(e: Event, name: string) {
		changeFilters({
			hiddenSets: hiddenSets.includes(name) ? hiddenSets.filter((s) => s !== name) : [...hiddenSets, name]
		});
		if (controlled) (e.currentTarget as HTMLInputElement).checked = !hiddenSets.includes(name);
	}
	const filtersActive = $derived(
		minSize != null || maxSize != null || minDegree != null || maxDegree != null || limit != null || hiddenSets.length > 0
	);

	function selectSet(name: string) {
		const info = result.sets.find((s) => s.name === name);
		if (!info) return;
		const previous = result.sets.find((s) => s.name === selectedSet) ?? null;
		const next = selectedSet === name ? null : name;
		if (!controlled) selectedSet = next;
		onsetselect?.(next ? info : null, previous);
	}
	function setKeydown(e: KeyboardEvent, name: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			selectSet(name);
			return;
		}
		if (e.key === 'Escape') {
			if (selectedSet != null) {
				const previous = result.sets.find((s) => s.name === selectedSet) ?? null;
				if (!controlled) selectedSet = null;
				onsetselect?.(null, previous);
			}
			return;
		}
		const bars = Array.from(root?.querySelectorAll<SVGElement>('[data-upset-set-bar]') ?? []);
		const at = bars.indexOf(e.currentTarget as SVGElement);
		const next =
			e.key === 'ArrowDown' ? at + 1
			: e.key === 'ArrowUp' ? at - 1
			: e.key === 'Home' ? 0
			: e.key === 'End' ? bars.length - 1
			: null;
		if (next != null && bars[next]) {
			e.preventDefault();
			bars[next].focus();
		}
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

{#if stackLegend && stack}
	<ul class="upset-legend" aria-label="Stack categories" data-upset-legend="">
		{#each stack.order as c (c)}
			<li data-upset-legend-item={c}>
				<span class="upset-swatch" style:background={stackColor(c)}></span>{c}
			</li>
		{/each}
	</ul>
{/if}

{#if filterControls}
	<div class="upset-filters" role="group" aria-label="Filters" data-upset-filters="">
		<label>
			min size
			<input
				type="number"
				min="0"
				value={minSize ?? ''}
				placeholder="1"
				data-upset-filter="minSize"
				onchange={numberFilter('minSize')}
			/>
		</label>
		<label>
			min degree
			<input
				type="number"
				min="1"
				value={minDegree ?? ''}
				placeholder="1"
				data-upset-filter="minDegree"
				onchange={numberFilter('minDegree')}
			/>
		</label>
		<label>
			max degree
			<input
				type="number"
				min="1"
				value={maxDegree ?? ''}
				data-upset-filter="maxDegree"
				onchange={numberFilter('maxDegree')}
			/>
		</label>
		<label>
			limit
			<input
				type="number"
				min="1"
				value={limit ?? ''}
				data-upset-filter="limit"
				onchange={numberFilter('limit')}
			/>
		</label>
		<span class="upset-filter-sets">
			{#each sets as name (name)}
				<label>
					<input
						type="checkbox"
						checked={!hiddenSets.includes(name)}
						disabled={!hiddenSets.includes(name) && visibleSets.length <= 1}
						data-upset-filter-set={name}
						onchange={(e) => toggleSetVisible(e, name)}
					/>
					{labelOf(name)}
				</label>
			{/each}
		</span>
		<button
			type="button"
			disabled={!filtersActive}
			data-upset-filter-reset=""
			onclick={() =>
				changeFilters({
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
{/if}

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
						format={(v: number) => axisFormat(v)}
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
							fillOpacity={stack ? 0 : opacity(d.id)}
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
						{#if stack}
							{@const segs = stack.segments.get(d.id) ?? []}
							{#each segs as seg, k (seg.category)}
								{@const below = segs.slice(0, k).reduce((s, g) => s + g.n, 0)}
								{@const top = ys(below + seg.n)}
								<Rect
									{x}
									y={top}
									width={xs.bandwidth()}
									height={Math.max(0, ys(below) - top)}
									fill={stackColor(seg.category)}
									fillOpacity={opacity(d.id)}
									corners={k === segs.length - 1 ? [barRadius, barRadius, 0, 0] : 0}
									class="upset-stack"
									style="pointer-events: none"
									data-upset-stack={seg.category}
									data-id={d.id}
									data-n={seg.n}
								/>
							{/each}
						{/if}
						{#each activeQueries as q, k (q.id)}
							{@const n = counts.get(d.id)?.[k] ?? 0}
							{#if n > 0}
								{@const qy = ys(clampSize(scale, n))}
								<Rect
									{x}
									y={qy}
									width={xs.bandwidth()}
									height={Math.max(0, context.height - qy)}
									fill={q.color}
									fillOpacity={opacity(d.id)}
									corners={[barRadius, barRadius, 0, 0]}
									class="upset-query"
									style="pointer-events: none"
									data-upset-query={q.id}
									data-id={d.id}
									data-n={n}
								/>
							{/if}
						{/each}
						{#if showLabels}
							<Text
								value={axisFormat(d.size)}
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
								value={axisFormat(t)}
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
								class="clickable upset-set-bar {themed(setColors?.[s.name] ?? (typeof color === 'string' ? color : undefined), 'upset-bar-fill')}"
								corners={[barRadius, 0, 0, barRadius]}
								fillOpacity={selectedSet != null && selectedSet !== s.name ? dimOpacity : 1}
								stroke={selectedSet === s.name ? 'currentColor' : 'none'}
								strokeWidth={selectedSet === s.name ? 2 : 0}
								role="button"
								tabindex={0}
								aria-label={`${labelOf(s.name)}: ${formatSize(s.size)}`}
								aria-pressed={selectedSet === s.name}
								data-upset-set-bar={s.name}
								data-n={s.size}
								onclick={() => selectSet(s.name)}
								onkeydown={(e: KeyboardEvent) => setKeydown(e, s.name)}
								onpointerenter={(e: PointerEvent) =>
									tipAtPointer({ kind: 'set', set: s, text: `${labelOf(s.name)}: ${formatSize(s.size)}` }, e)}
								onpointermove={(e: PointerEvent) =>
									tipAtPointer({ kind: 'set', set: s, text: `${labelOf(s.name)}: ${formatSize(s.size)}` }, e)}
								onpointerleave={() => (tip = focused == null ? null : tip)}
							/>
							<Text
								value={axisFormat(s.size)}
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
							class="clickable upset-set-name"
							style={emphasizedSets.includes(name) || selectedSet === name ? 'font-weight: 700' : undefined}
							data-upset-row={name}
							onclick={() => selectSet(name)}
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
	.upset :global(.upset-bar:focus-visible),
	.upset :global(.upset-set-bar:focus-visible) {
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
