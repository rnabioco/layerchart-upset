import { scaleLinear, scaleLog, scaleSymlog, type ScaleContinuousNumeric } from 'd3-scale';

export type UpSetMode = 'distinct' | 'intersect' | 'union';

/** The filters a user can change at runtime (`filterControls`, `bind:`), as `onfilterchange` reports them. */
export interface UpSetFilters {
	minSize?: number;
	maxSize?: number;
	minDegree?: number;
	maxDegree?: number;
	limit?: number;
	/** Sets removed from the plot. */
	hiddenSets: string[];
}

export interface UpSetOptions {
	/**
	 * How items are assigned to intersections (mirrors ComplexUpset's `mode`):
	 * - `distinct`: an item counts only in the exact combination of sets it belongs to (default)
	 * - `intersect`: an item counts in every combination that is a subset of its memberships
	 * - `union`: an item counts in every combination it overlaps with at least one set
	 */
	mode?: UpSetMode;
	/**
	 * `sets` orders by set rank (the row order of the matrix): intersections containing the earliest sets
	 * come first, a prefix before its extensions (A, A&B, A&C, B, B&C). `descending` (default) is that order;
	 * `ascending` reverses it.
	 */
	sortIntersectionsBy?: 'cardinality' | 'degree' | 'sets' | 'none';
	sortIntersectionsOrder?: 'descending' | 'ascending';
	sortSetsBy?: 'cardinality' | 'none';
	sortSetsOrder?: 'descending' | 'ascending';
	minSize?: number;
	maxSize?: number;
	minDegree?: number;
	maxDegree?: number;
	/** Keep only the first N intersections after sorting. */
	limit?: number;
	/**
	 * Keep each intersection's rows in `items` (default true). Set false for large inputs when only the
	 * counts matter: `items` is then empty, so `onselect` and tooltips see no rows.
	 */
	keepItems?: boolean;
	/**
	 * Also list combinations no item has, as size-0 columns (subject to the degree filters and `limit`).
	 * `minSize` then defaults to 0 instead of 1. Capped at {@link MAX_EMPTY_SETS} sets, since there are 2^n − 1
	 * combinations; above that nothing is added.
	 */
	showEmpty?: boolean;
}

/** `showEmpty` is ignored above this many sets (2^20 combinations). */
export const MAX_EMPTY_SETS = 20;

/** Every combination of `order` within the degree bounds, in ascending combination-mask order. */
function allCombos(order: string[], minDegree: number, maxDegree: number): string[][] {
	if (order.length > MAX_EMPTY_SETS) return [];
	const out: string[][] = [];
	for (let m = 1; m < 1 << order.length; m++) {
		const combo = order.filter((_, i) => m & (1 << i));
		if (combo.length >= minDegree && combo.length <= maxDegree) out.push(combo);
	}
	return out;
}

export interface Intersection<T> {
	/** Stable identifier, e.g. `"A&B"`. */
	id: string;
	/** Sets participating in this intersection (in display order). */
	sets: string[];
	degree: number;
	size: number;
	items: T[];
	/** The record this intersection was built from (precomputed input only). */
	source?: unknown;
}

/** One combination of sets with a known size, for input that was counted elsewhere. */
export interface PrecomputedIntersection {
	/** Stable identifier; defaults to the member set names joined with `&`. */
	id?: string | number;
	/** Names of the member sets (must appear in the `sets` list). */
	sets: string[];
	size: number;
	[key: string]: unknown;
}

export interface SetInfo {
	name: string;
	size: number;
}

/** What a tooltip describes: one intersection column, or one set's size bar. */
export type TooltipContext<T> =
	| { kind: 'intersection'; intersection: Intersection<T>; text: string }
	| { kind: 'set'; set: SetInfo; text: string };

export interface UpSetResult<T> {
	sets: SetInfo[];
	intersections: Intersection<T>[];
	/** Number of items in the input data. */
	total: number;
	/** Number of intersections before `limit` and the size/degree filters. */
	totalIntersections: number;
}

/** What `onresult` and the `footer` snippet receive: how many intersections are drawn vs. exist. */
export interface UpSetReport {
	shown: number;
	total: number;
	hidden: number;
}

/** Summarise how many intersections are shown out of how many existed before filtering. */
export function reportOf(result: Pick<UpSetResult<unknown>, 'intersections' | 'totalIntersections'>): UpSetReport {
	const shown = result.intersections.length;
	const total = result.totalIntersections;
	return { shown, total, hidden: Math.max(0, total - shown) };
}

/** Build the set of members for a row given boolean (or truthy) membership columns. */
function membership<T extends Record<string, unknown>>(row: T, sets: string[]): string[] {
	return sets.filter((s) => Boolean(row[s]));
}


/**
 * Compute set sizes and intersections from rows with one boolean column per set —
 * the same input shape ComplexUpset uses.
 */
export function computeUpset<T extends Record<string, unknown>>(
	data: T[],
	setNames: string[],
	options: UpSetOptions = {}
): UpSetResult<T> {
	const {
		mode = 'distinct',
		sortIntersectionsBy = 'cardinality',
		sortIntersectionsOrder = 'descending',
		sortSetsBy = 'cardinality',
		sortSetsOrder = 'descending',
		showEmpty = false,
		minSize = showEmpty ? 0 : 1,
		maxSize = Infinity,
		minDegree = 1,
		maxDegree = Infinity,
		limit,
		keepItems = true
	} = options;

	const sizes = new Map<string, number>(setNames.map((s) => [s, 0]));
	for (const row of data) for (const s of membership(row, setNames)) sizes.set(s, sizes.get(s)! + 1);

	let sets: SetInfo[] = setNames.map((name) => ({ name, size: sizes.get(name)! }));
	if (sortSetsBy === 'cardinality') {
		const dir = sortSetsOrder === 'descending' ? -1 : 1;
		sets = sets.sort((a, b) => dir * (a.size - b.size));
	}
	const order = sets.map((s) => s.name);

	const groups = new Map<string, Intersection<T>>();
	const groupOf = (members: string[]) => {
		const id = members.join('&');
		let g = groups.get(id);
		if (!g) {
			g = { id, sets: members, degree: members.length, size: 0, items: [] };
			groups.set(id, g);
		}
		return g;
	};

	// Rows with the same memberships hit the same groups, so work them out once per membership mask.
	// Within a mask, groups come in ascending combination-mask order (the order they were created in
	// before), which matters for `sortIntersectionsBy: 'none'`.
	const bit = new Map(order.map((s, i) => [s, 1 << i]));
	const comboOf = (mask: number) => order.filter((_, i) => mask & (1 << i));
	const hitCache = new Map<number, Intersection<T>[]>();
	const hitsFor = (M: number): Intersection<T>[] => {
		let hits = hitCache.get(M);
		if (hits) return hits;
		hits = [];
		if (mode === 'distinct') {
			hits.push(groupOf(comboOf(M)));
		} else if (mode === 'intersect') {
			// every non-empty subset of the row's own memberships, ascending
			for (let s = (0 - M) & M; s !== 0; s = (s - M) & M) hits.push(groupOf(comboOf(s)));
		} else {
			for (let s = 1; s < 1 << order.length; s++) if (s & M) hits.push(groupOf(comboOf(s)));
		}
		hitCache.set(M, hits);
		return hits;
	};

	for (const row of data) {
		let M = 0;
		for (const s of membership(row, setNames)) M |= bit.get(s) ?? 0;
		if (M === 0) continue;
		for (const g of hitsFor(M)) {
			if (keepItems) g.items.push(row);
			g.size++;
		}
	}

	if (showEmpty) for (const combo of allCombos(order, minDegree, maxDegree)) groupOf(combo);

	const { intersections, totalIntersections } = rankAndFilter(
		[...groups.values()],
		{
			sortIntersectionsBy,
			sortIntersectionsOrder,
			minSize,
			maxSize,
			minDegree,
			maxDegree,
			limit
		},
		order
	);

	return { sets, intersections, total: data.length, totalIntersections };
}

type RankOptions = Pick<
	UpSetOptions,
	| 'sortIntersectionsBy'
	| 'sortIntersectionsOrder'
	| 'minSize'
	| 'maxSize'
	| 'minDegree'
	| 'maxDegree'
	| 'limit'
	| 'showEmpty'
>;

function rankAndFilter<T>(
	all: Intersection<T>[],
	o: RankOptions,
	/** Display order of the sets, for `sortIntersectionsBy: 'sets'`. */
	order: string[] = []
): { intersections: Intersection<T>[]; totalIntersections: number } {
	const {
		sortIntersectionsBy = 'cardinality',
		sortIntersectionsOrder = 'descending',
		minSize = o.showEmpty ? 0 : 1,
		maxSize = Infinity,
		minDegree = 1,
		maxDegree = Infinity,
		limit
	} = o;
	let out = all.filter(
		(g) => g.size >= minSize && g.size <= maxSize && g.degree >= minDegree && g.degree <= maxDegree
	);
	if (sortIntersectionsBy !== 'none') {
		const dir = sortIntersectionsOrder === 'descending' ? -1 : 1;
		// 'sets': compare the ascending set ranks of each intersection lexicographically, a prefix first.
		// Descending (the default) puts the earliest-ranked sets first, matching how cardinality puts the
		// biggest first.
		const rk = new Map(order.map((s, i) => [s, i]));
		const keys = new Map<Intersection<T>, number[]>();
		if (sortIntersectionsBy === 'sets') {
			for (const g of out) keys.set(g, g.sets.map((s) => rk.get(s) ?? 0).sort((x, y) => x - y));
		}
		const bySets = (a: Intersection<T>, b: Intersection<T>) => {
			const ka = keys.get(a)!;
			const kb = keys.get(b)!;
			for (let i = 0; i < Math.min(ka.length, kb.length); i++) if (ka[i] !== kb[i]) return kb[i] - ka[i];
			return kb.length - ka.length;
		};
		out = [...out].sort((a, b) => {
			const primary =
				sortIntersectionsBy === 'sets'
					? bySets(a, b)
					: sortIntersectionsBy === 'cardinality'
						? a.size - b.size
						: a.degree - b.degree;
			if (primary !== 0) return dir * primary;
			// stable, readable tie-break: secondary metric, then by id
			const secondary =
				sortIntersectionsBy === 'cardinality' ? a.degree - b.degree : b.size - a.size;
			if (secondary !== 0) return secondary;
			return a.id.localeCompare(b.id);
		});
	}
	return {
		intersections: limit != null ? out.slice(0, limit) : out,
		totalIntersections: all.length
	};
}

export interface PrecomputedOptions extends UpSetOptions {
	/** Known set sizes. When omitted they are summed from the intersections (exact for disjoint counts). */
	setSizes?: Record<string, number>;
	/** Total item count, used for percentages in tooltips. */
	total?: number;
	/**
	 * Number of intersections that existed before the list was truncated elsewhere. Overrides the
	 * length of the given list when reporting how many were hidden.
	 */
	intersectionsTotal?: number;
}

/**
 * Build an {@link UpSetResult} from intersections that were counted elsewhere.
 * Unlike {@link computeUpset}, the order you pass is kept unless you ask for sorting:
 * `sets` stay in the given order and intersections are not re-sorted by default.
 */
export function fromIntersections(
	setNames: string[],
	input: PrecomputedIntersection[],
	options: PrecomputedOptions = {}
): UpSetResult<never> {
	const { setSizes, total, intersectionsTotal, sortSetsBy = 'none', sortSetsOrder = 'descending' } = options;
	const known = new Set(setNames);
	const all: Intersection<never>[] = input.map((raw) => {
		for (const name of raw.sets) {
			if (!known.has(name)) throw new Error(`Intersection references unknown set "${name}"`);
		}
		const members = setNames.filter((n) => raw.sets.includes(n));
		return {
			id: raw.id != null ? String(raw.id) : members.join('&'),
			sets: members,
			degree: members.length,
			size: raw.size,
			items: [],
			source: raw
		};
	});

	if (options.showEmpty) {
		const have = new Set(all.map((g) => g.id));
		for (const combo of allCombos(setNames, options.minDegree ?? 1, options.maxDegree ?? Infinity)) {
			const id = combo.join('&');
			if (!have.has(id)) all.push({ id, sets: combo, degree: combo.length, size: 0, items: [] });
		}
	}

	const sizes = new Map(setNames.map((n) => [n, setSizes?.[n] ?? 0]));
	if (!setSizes) for (const g of all) for (const n of g.sets) sizes.set(n, sizes.get(n)! + g.size);
	let sets: SetInfo[] = setNames.map((name) => ({ name, size: sizes.get(name)! }));
	if (sortSetsBy === 'cardinality') {
		const dir = sortSetsOrder === 'descending' ? -1 : 1;
		sets = [...sets].sort((a, b) => dir * (a.size - b.size));
	}

	const ranked = rankAndFilter(
		all,
		{ sortIntersectionsBy: 'none', ...options },
		sets.map((s) => s.name)
	);
	return {
		sets,
		intersections: ranked.intersections,
		total: total ?? NaN,
		totalIntersections: intersectionsTotal ?? ranked.totalIntersections
	};
}


// ---- size scales ----------------------------------------------------------------------------

/** How bar lengths map to sizes. `symlog` shows 0 natively; `log` clamps sizes below `LOG_FLOOR`. */
export type UpSetScale = 'linear' | 'log' | 'symlog';

/** Lower bound of a log domain: below 1 so that a size of 1 still has a visible bar. */
export const LOG_FLOOR = 0.5;

/** A fresh d3 scale of the given kind (domain and range are set by the caller). */
export function sizeScale(kind: UpSetScale): ScaleContinuousNumeric<number, number> {
	return kind === 'log' ? scaleLog() : kind === 'symlog' ? scaleSymlog().constant(1) : scaleLinear();
}

/** Round `max` up to the next power of ten (at least 10), the top of a non-linear domain. */
export function sizeTop(max: number): number {
	return Math.max(10, 10 ** Math.ceil(Math.log10(Math.max(1, max))));
}

/** Domain for a non-linear scale: `[LOG_FLOOR, top]` for log, `[0, top]` for symlog. */
export function sizeDomain(kind: 'log' | 'symlog', max: number): [number, number] {
	return [kind === 'log' ? LOG_FLOOR : 0, sizeTop(max)];
}

/** Size to feed the scale: log cannot draw 0 (or less), so those sit at the floor and get no bar. */
export function clampSize(kind: UpSetScale, n: number): number {
	return kind === 'log' ? Math.max(n, LOG_FLOOR) : n;
}

/**
 * Ticks for a non-linear scale with the given top: powers of ten, plus 2 and 5 of each when the
 * domain spans two decades or fewer; symlog also has 0. Linear returns undefined (the axis picks).
 */
export function sizeTicks(kind: UpSetScale, top: number): number[] | undefined {
	if (kind === 'linear') return undefined;
	const decades = Math.round(Math.log10(top));
	const out: number[] = kind === 'symlog' ? [0] : [];
	for (let d = 0; d <= decades; d++) {
		const p = 10 ** d;
		for (const m of decades <= 2 ? [1, 2, 5] : [1]) if (m * p <= top) out.push(m * p);
	}
	return out;
}

// ---- export helpers --------------------------------------------------------------------------

/** The rows behind an intersection (empty for an unknown id, or for precomputed input / `keepItems: false`). */
export function membersOf<T>(result: Pick<UpSetResult<T>, 'intersections'>, id: string): T[] {
	return result.intersections.find((g) => g.id === id)?.items ?? [];
}

export interface CsvOptions<T> {
	/** Adds an `items` column: this text for each row of the intersection, joined with `;`. */
	items?: (item: T) => string;
}

/**
 * One line per intersection: `id,degree,size`, then a 0/1 column per set (in display order), then
 * optionally the items. Fields with commas, quotes or newlines are quoted. Returns a string; saving
 * it is up to the caller.
 */
export function toCSV<T>(
	result: Pick<UpSetResult<T>, 'sets' | 'intersections'>,
	options: CsvOptions<T> = {}
): string {
	const q = (v: string | number) => {
		const s = String(v);
		return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
	};
	const names = result.sets.map((s) => s.name);
	const lines = [['id', 'degree', 'size', ...names, ...(options.items ? ['items'] : [])].map(q).join(',')];
	for (const g of result.intersections) {
		const row: (string | number)[] = [g.id, g.degree, g.size, ...names.map((n) => (g.sets.includes(n) ? 1 : 0))];
		if (options.items) row.push(g.items.map(options.items).join(';'));
		lines.push(row.map(q).join(','));
	}
	return lines.join('\n') + '\n';
}
