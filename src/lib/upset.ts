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
	 *
	 * `deviation` orders by observed minus expected size (see {@link expectedSize}): `descending` puts the
	 * most over-represented combinations first, `ascending` the most depleted. Needs a known total; without
	 * one every deviation is 0 and the order falls back to size.
	 */
	sortIntersectionsBy?: 'cardinality' | 'degree' | 'sets' | 'deviation' | 'none';
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

/** `mode: 'union'` (and the dense `intersect` path) use a 2^n table, so they stop at this many sets (64 MB). */
const MAX_DENSE_SETS = 24;

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
	/** Counts per `stack` category (precomputed input only; see {@link PrecomputedIntersection.segments}). */
	segments?: Record<string, number>;
	/** Counts per query id (precomputed input only; see {@link PrecomputedIntersection.counts}). */
	counts?: Record<string, number>;
}

/** One combination of sets with a known size, for input that was counted elsewhere. */
export interface PrecomputedIntersection {
	/** Stable identifier; defaults to the member set names joined with `&`. */
	id?: string | number;
	/** Names of the member sets (must appear in the `sets` list). */
	sets: string[];
	size: number;
	/**
	 * Breakdown of `size` by category, for `stack` without row data: `{ control: 25, treated: 15 }`. Should sum to
	 * `size`; a shortfall draws as `"(none)"`, an excess is drawn past the bar (and warned about once by `UpSet`).
	 */
	segments?: Record<string, number>;
	/** Counts per query id, for `queries` entries that have no `filter`: `{ significant: 12 }`. */
	counts?: Record<string, number>;
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

/**
 * Size an intersection would have if membership in each set were independent (the null model behind UpSet's
 * "deviation" view). With `p = size / total` per set:
 * - `distinct`: `total · Π p(member) · Π (1 − p(non-member))` over all `sets`
 * - `intersect`: `total · Π p(member)`
 * - `union`: `total · (1 − Π (1 − p(member)))`
 * NaN when `total` is unknown or not positive.
 */
export function expectedSize(
	members: string[],
	sets: SetInfo[],
	total: number,
	mode: UpSetMode = 'distinct'
): number {
	if (!(total > 0)) return NaN;
	const inside = new Set(members);
	let prod = 1;
	if (mode === 'union') {
		for (const s of sets) if (inside.has(s.name)) prod *= 1 - s.size / total;
		return total * (1 - prod);
	}
	for (const s of sets) {
		const p = s.size / total;
		if (inside.has(s.name)) prod *= p;
		else if (mode === 'distinct') prod *= 1 - p;
	}
	return total * prod;
}

/** Observed and expected size of every intersection in `result`, keyed by id. `deviation = size − expected`. */
export function deviations<T>(
	result: Pick<UpSetResult<T>, 'sets' | 'intersections' | 'total'>,
	mode: UpSetMode = 'distinct'
): Map<string, { expected: number; deviation: number }> {
	const out = new Map<string, { expected: number; deviation: number }>();
	for (const g of result.intersections) {
		const expected = expectedSize(g.sets, result.sets, result.total, mode);
		out.set(g.id, { expected, deviation: g.size - expected });
	}
	return out;
}

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

/**
 * Intersection id for a list of set names: names joined with `&`. A `&` or `\` inside a name is escaped with a
 * backslash, so `A`+`B` (`A&B`) and the single set `A&B` (`A\&B`) cannot collide. Names without those
 * characters give the same ids as before.
 */
/** Largest of `values`, at least `floor`. Loop-based: spreading a big array into `Math.max` throws RangeError. */
export function maxOf(values: Iterable<number>, floor = 1): number {
	let m = floor;
	for (const v of values) if (v > m) m = v;
	return m;
}

export function intersectionId(members: string[]): string {
	return members.map((m) => m.replace(/[\\&]/g, '\\$&')).join('&');
}

/**
 * Id builder for a given input set order: members are joined in the order the sets were passed in, so a
 * column keeps its id when `sortSetsBy` or `sortSetsOrder` reorders the display.
 */
function idBuilder(setNames: string[]): (members: string[]) => string {
	const rank = new Map(setNames.map((n, i) => [n, i]));
	return (members) => intersectionId([...members].sort((a, b) => rank.get(a)! - rank.get(b)!));
}

function assertUniqueSets(setNames: string[]): void {
	const seen = new Set<string>();
	for (const n of setNames) {
		if (seen.has(n)) throw new Error(`Duplicate set name "${n}"`);
		seen.add(n);
	}
}

/** Masks are 32-bit integers, so combination logic stops here; `distinct` mode goes on without them. */
const MAX_MASK_SETS = 30;

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

	assertUniqueSets(setNames);
	const idOf = idBuilder(setNames);
	const sizes = new Map<string, number>(setNames.map((s) => [s, 0]));
	for (const row of data) for (const s of membership(row, setNames)) sizes.set(s, sizes.get(s)! + 1);

	let sets: SetInfo[] = setNames.map((name) => ({ name, size: sizes.get(name)! }));
	if (sortSetsBy === 'cardinality') {
		const dir = sortSetsOrder === 'descending' ? -1 : 1;
		sets = sets.sort((a, b) => dir * (a.size - b.size));
	}
	const order = sets.map((s) => s.name);

	if (order.length > MAX_MASK_SETS) {
		if (mode !== 'distinct')
			throw new Error(`mode "${mode}" supports at most ${MAX_MASK_SETS} sets (got ${order.length}); use "distinct".`);
		// Too many sets for 32-bit masks: group rows by their member list directly.
		const wide = new Map<string, Intersection<T>>();
		for (const row of data) {
			const members = order.filter((s) => Boolean(row[s]));
			if (members.length === 0) continue;
			const id = idOf(members);
			let g = wide.get(id);
			if (!g) wide.set(id, (g = { id, sets: members, degree: members.length, size: 0, items: [] }));
			g.size++;
			if (keepItems) g.items.push(row);
		}
		const r = rankAndFilter(
			[...wide.values()],
			{ sortIntersectionsBy, sortIntersectionsOrder, minSize, maxSize, minDegree, maxDegree, limit },
			order,
			(g) => expectedSize(g.sets, sets, data.length)
		);
		return { sets, intersections: r.intersections, total: data.length, totalIntersections: r.totalIntersections };
	}

	// Work on integer masks (bit i = the i-th set in display order) and build ids only for the groups that
	// exist. Counting never touches the rows again: each distinct membership mask is counted once, then
	// expanded to the combinations it belongs to.
	const n = order.length;
	const bitOf = new Map(order.map((s, i) => [s, 1 << i]));
	const comboOf = (mask: number) => order.filter((_, i) => mask & (1 << i));
	const rowMasks = new Int32Array(data.length);
	const distinct = new Map<number, number>(); // membership mask -> rows, in first-seen order
	data.forEach((row, r) => {
		let M = 0;
		for (const s of membership(row, setNames)) M |= bitOf.get(s) ?? 0;
		rowMasks[r] = M;
		if (M !== 0) distinct.set(M, (distinct.get(M) ?? 0) + 1);
	});

	const counts = new Map<number, number>(); // combination mask -> size, in group order
	const add = (mask: number, by: number) => counts.set(mask, (counts.get(mask) ?? 0) + by);
	if (mode === 'distinct') {
		for (const [M, c] of distinct) counts.set(M, c);
	} else {
		let sparseCost = 0;
		for (const M of distinct.keys()) sparseCost += 2 ** popcount(M);
		const denseCost = n * 2 ** n;
		if (mode === 'intersect' && !(n <= MAX_DENSE_SETS && sortIntersectionsBy !== 'none' && sparseCost > denseCost)) {
			// every non-empty subset of the row's own memberships, ascending
			for (const [M, c] of distinct) for (let s = (0 - M) & M; s !== 0; s = (s - M) & M) add(s, c);
		} else {
			if (n > MAX_DENSE_SETS)
				throw new Error(`mode "union" supports at most ${MAX_DENSE_SETS} sets (got ${n}); use "distinct" or "intersect".`);
			// one 2^n table and an n-pass sum over subsets/supersets instead of a loop per distinct mask
			const f = new Int32Array(1 << n);
			let nonEmpty = 0;
			for (const [M, c] of distinct) {
				f[M] = c;
				nonEmpty += c;
			}
			const full = (1 << n) - 1;
			if (mode === 'intersect') {
				// rows whose membership contains the combination
				for (let i = 0; i < n; i++) for (let m = 0; m <= full; m++) if (!(m & (1 << i))) f[m] += f[m | (1 << i)];
				for (let m = 1; m <= full; m++) if (f[m] > 0) counts.set(m, f[m]);
			} else {
				// rows overlapping the combination = all rows minus rows entirely inside its complement
				for (let i = 0; i < n; i++) for (let m = 0; m <= full; m++) if (m & (1 << i)) f[m] += f[m ^ (1 << i)];
				for (let m = 1; m <= full; m++) {
					const c = nonEmpty - f[full ^ m];
					if (c > 0) counts.set(m, c);
				}
			}
		}
	}
	if (showEmpty && n <= MAX_EMPTY_SETS) {
		for (let m = 1; m < 1 << n; m++) {
			const d = popcount(m);
			if (d >= minDegree && d <= maxDegree && !counts.has(m)) counts.set(m, 0);
		}
	}

	const maskOf = new Map<Intersection<T>, number>();
	const all: Intersection<T>[] = [];
	for (const [mask, size] of counts) {
		const members = comboOf(mask);
		const g: Intersection<T> = { id: idOf(members), sets: members, degree: members.length, size, items: [] };
		maskOf.set(g, mask);
		all.push(g);
	}

	const { intersections, totalIntersections } = rankAndFilter(
		all,
		{
			sortIntersectionsBy,
			sortIntersectionsOrder,
			minSize,
			maxSize,
			minDegree,
			maxDegree,
			limit
		},
		order,
		sortIntersectionsBy === 'deviation' ? (g) => expectedSize(g.sets, sets, data.length, mode) : undefined
	);

	if (keepItems) attachItems(intersections, maskOf, rowMasks, data, mode);
	return { sets, intersections, total: data.length, totalIntersections };
}

function popcount(m: number): number {
	let c = 0;
	for (; m; m &= m - 1) c++;
	return c;
}

/**
 * Give each kept intersection a lazy `items`: the rows are bucketed once, on the first read of any
 * `items`, and only into the intersections that survived the filters and `limit`.
 */
function attachItems<T>(
	kept: Intersection<T>[],
	maskOf: Map<Intersection<T>, number>,
	rowMasks: Int32Array,
	data: T[],
	mode: UpSetMode
): void {
	let buckets: Map<Intersection<T>, T[]> | null = null;
	const build = () => {
		const b = new Map<Intersection<T>, T[]>(kept.map((g) => [g, []]));
		const byMask = new Map<number, Intersection<T>>(kept.map((g) => [maskOf.get(g)!, g]));
		const hitCache = new Map<number, Intersection<T>[]>();
		const hitsFor = (M: number): Intersection<T>[] => {
			let hits = hitCache.get(M);
			if (hits) return hits;
			hits = [];
			if (mode === 'distinct') {
				const g = byMask.get(M);
				if (g) hits.push(g);
			} else if (mode === 'intersect' && 2 ** popcount(M) <= kept.length) {
				for (let s = (0 - M) & M; s !== 0; s = (s - M) & M) {
					const g = byMask.get(s);
					if (g) hits.push(g);
				}
			} else {
				for (const g of kept) {
					const m = maskOf.get(g)!;
					if (mode === 'union' ? (m & M) !== 0 : (m & M) === m) hits.push(g);
				}
			}
			hitCache.set(M, hits);
			return hits;
		};
		for (let r = 0; r < data.length; r++) {
			const M = rowMasks[r];
			if (M !== 0) for (const g of hitsFor(M)) b.get(g)!.push(data[r]);
		}
		return b;
	};
	for (const g of kept) {
		Object.defineProperty(g, 'items', {
			enumerable: true,
			configurable: true,
			get() {
				buckets ??= build();
				return buckets.get(g)!;
			},
			set(v: T[]) {
				Object.defineProperty(g, 'items', { value: v, writable: true, enumerable: true, configurable: true });
			}
		});
	}
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
	order: string[] = [],
	/** Expected size of an intersection, for `sortIntersectionsBy: 'deviation'`. */
	expectedOf?: (g: Intersection<T>) => number
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
		const dev = new Map<Intersection<T>, number>();
		if (sortIntersectionsBy === 'deviation') {
			for (const g of out) {
				const d = g.size - (expectedOf?.(g) ?? NaN);
				dev.set(g, Number.isFinite(d) ? d : 0);
			}
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
						: sortIntersectionsBy === 'deviation'
							? dev.get(a)! - dev.get(b)!
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

function checkCounts(
	counts: Record<string, number>,
	field: string,
	raw: PrecomputedIntersection
): Record<string, number> {
	for (const [k, v] of Object.entries(counts)) {
		if (typeof v !== 'number' || !Number.isFinite(v) || v < 0)
			throw new Error(`Intersection "${raw.id ?? raw.sets.join('&')}" has an invalid ${field} count for "${k}" (${String(v)}); expected a number >= 0`);
	}
	return counts;
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
	assertUniqueSets(setNames);
	const known = new Set(setNames);
	const all: Intersection<never>[] = input.map((raw) => {
		for (const name of raw.sets) {
			if (!known.has(name)) throw new Error(`Intersection references unknown set "${name}"`);
		}
		if (typeof raw.size !== 'number' || !Number.isFinite(raw.size) || raw.size < 0)
			throw new Error(`Intersection "${raw.id ?? raw.sets.join('&')}" has an invalid size (${String(raw.size)}); expected a number >= 0`);
		const members = setNames.filter((n) => raw.sets.includes(n));
		return {
			id: raw.id != null ? String(raw.id) : intersectionId(members),
			sets: members,
			degree: members.length,
			size: raw.size,
			items: [],
			source: raw,
			...(raw.segments ? { segments: checkCounts(raw.segments, 'segments', raw) } : {}),
			...(raw.counts ? { counts: checkCounts(raw.counts, 'counts', raw) } : {})
		};
	});

	const ids = new Set<string>();
	for (const g of all) {
		if (ids.has(g.id)) throw new Error(`Duplicate intersection id "${g.id}"`);
		ids.add(g.id);
	}

	if (options.showEmpty) {
		const have = new Set(all.map((g) => g.id));
		for (const combo of allCombos(setNames, options.minDegree ?? 1, options.maxDegree ?? Infinity)) {
			const id = intersectionId(combo);
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
		sets.map((s) => s.name),
		(g) => expectedSize(g.sets, sets, total ?? NaN)
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

/**
 * One SVG path `d` drawing a circle of radius `r` at each `[cx, cy]`. Replaces thousands of <circle> nodes (the empty
 * cells of the membership matrix) with a single element.
 */
export function dotsPath(points: Iterable<[number, number]>, r: number): string {
	const f = (n: number) => String(Math.round(n * 100) / 100);
	const d = f(2 * r);
	let out = '';
	for (const [cx, cy] of points) out += `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${d} 0a${f(r)} ${f(r)} 0 1 0 -${d} 0`;
	return out;
}

const SUPER: Record<string, string> = {
	'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻'
};

/** An exact power of ten as `10⁶`; anything else (0, 2, 50, 1.5e6) goes through `fallback`. */
export function powerLabel(n: number, fallback: (n: number) => string = String): string {
	if (!(n > 0) || !Number.isFinite(n)) return fallback(n);
	const e = Math.round(Math.log10(n));
	if (10 ** e !== n) return fallback(n);
	return '10' + [...String(e)].map((c) => SUPER[c]).join('');
}

/**
 * Drop ticks whose labels would collide on an axis `width` px long. Powers of ten win over 5s, 5s over 2s, so a narrow
 * axis keeps 1, 10, 100 … and a wider one gains the in-between ticks. `label` renders a tick; `charPx` is the
 * estimated width of one character. Input order is preserved.
 */
export function thinTicks(
	ticks: number[],
	kind: UpSetScale,
	domain: [number, number],
	width: number,
	label: (t: number) => string,
	charPx: number
): number[] {
	const x = sizeScale(kind).domain(domain).range([0, width]);
	const rank = (t: number) => {
		if (t <= 0) return 0;
		const m = t / 10 ** Math.floor(Math.log10(t));
		return m === 1 ? 0 : m === 5 ? 1 : 2;
	};
	const kept: { px: number; half: number }[] = [];
	const keep = new Set<number>();
	for (const t of [...ticks].sort((a, b) => rank(a) - rank(b))) {
		const px = x(t);
		const half = (label(t).length * charPx) / 2 + 3;
		if (kept.every((k) => Math.abs(k.px - px) >= k.half + half)) {
			kept.push({ px, half });
			keep.add(t);
		}
	}
	return ticks.filter((t) => keep.has(t));
}

// ---- export helpers --------------------------------------------------------------------------

/** The rows behind an intersection (empty for an unknown id, or for precomputed input / `keepItems: false`). */
export function membersOf<T>(result: Pick<UpSetResult<T>, 'intersections'>, id: string): T[] {
	return result.intersections.find((g) => g.id === id)?.items ?? [];
}

/** A subset of the items to highlight inside every column: `UpSet`'s `queries` draw one overlay bar each. */
export interface UpSetQuery<T> {
	id: string;
	color: string;
	/** Which rows count. Omit it for precomputed input, where the count comes from the intersection's `counts[id]`. */
	filter?: (item: T) => boolean;
}

/**
 * For each intersection id, how many of its `items` pass each query (same order as `queries`).
 * A query with a `filter` needs the rows (it counts nothing for precomputed input or `keepItems: false`); one without
 * reads `counts[id]` of each precomputed intersection.
 */
export function queryCounts<T>(
	result: Pick<UpSetResult<T>, 'intersections'>,
	queries: UpSetQuery<T>[]
): Map<string, number[]> {
	const out = new Map<string, number[]>();
	for (const g of result.intersections) {
		out.set(
			g.id,
			queries.map((q) => {
				const { filter } = q;
				if (!filter) return g.counts?.[q.id] ?? 0;
				let n = 0;
				for (const item of g.items) if (filter(item)) n++;
				return n;
			})
		);
	}
	return out;
}

/** What an `annotation` snippet receives for one column. `x` and `width` are px relative to the matrix. */
export interface AnnotationContext<T> {
	intersection: Intersection<T>;
	/** Position of the column, left to right. */
	index: number;
	x: number;
	width: number;
	height: number;
}

/** The category of an item for `stack`: a key of the row or a function; missing values are `"(none)"`. */
/** The `stack` prop of `UpSet`: split each size bar by a row attribute. */
export type StackOptions<T> = {
	/**
	 * A key of the row or a function; missing values are `"(none)"`. Omit it with precomputed `intersections` to
	 * use each intersection's `segments`.
	 */
	by?: StackBy<T>;
	/** Segment colors by category (default: a built-in palette in stack order). */
	colors?: Record<string, string>;
	/** Categories bottom to top; the rest follow by overall count, descending. */
	order?: string[];
	/** Show a swatch legend above the plot. */
	legend?: boolean;
};

export type StackBy<T> = (keyof T & string) | ((item: T) => string | null | undefined);

export const STACK_NONE = '(none)';

export interface StackResult {
	/** Categories bottom to top: `order` first, then the rest by overall count, descending, ties alphabetical. */
	order: string[];
	/** For each intersection id, the non-empty categories in `order`, each with its count. */
	segments: Map<string, { category: string; n: number }[]>;
}

/** Stack from the `segments` of precomputed intersections; a shortfall against `size` is `"(none)"`. */
function segmentStack<T>(result: Pick<UpSetResult<T>, 'intersections'>, order: string[]): StackResult {
	const overall = new Map<string, number>();
	const per = new Map<string, Map<string, number>>();
	for (const g of result.intersections) {
		const m = new Map<string, number>();
		let sum = 0;
		for (const [c, n] of Object.entries(g.segments ?? {})) {
			if (n > 0) {
				m.set(c, n);
				sum += n;
			}
		}
		if (g.segments && g.size > sum) m.set(STACK_NONE, (m.get(STACK_NONE) ?? 0) + (g.size - sum));
		for (const [c, n] of m) overall.set(c, (overall.get(c) ?? 0) + n);
		per.set(g.id, m);
	}
	const rest = [...overall.keys()]
		.filter((c) => !order.includes(c))
		.sort((a, b) => overall.get(b)! - overall.get(a)! || a.localeCompare(b));
	const full = [...order, ...rest];
	const segments = new Map<string, { category: string; n: number }[]>();
	for (const [id, m] of per) {
		segments.set(id, full.filter((c) => m.has(c)).map((category) => ({ category, n: m.get(category)! })));
	}
	return { order: full, segments };
}

/** Split each intersection's `items` by category. Needs the rows (nothing is counted without them). */
export function stackSegments<T>(
	result: Pick<UpSetResult<T>, 'intersections'>,
	by: StackBy<T> | undefined,
	order: string[] = []
): StackResult {
	if (by === undefined) return segmentStack(result, order);
	const of = (item: T): string => {
		const v = typeof by === 'function' ? by(item) : (item as Record<string, unknown>)[by];
		return v == null || v === '' ? STACK_NONE : String(v);
	};
	const per = new Map<string, Map<string, number>>();
	const overall = new Map<string, number>();
	for (const g of result.intersections) {
		const m = new Map<string, number>();
		for (const item of g.items) {
			const c = of(item);
			m.set(c, (m.get(c) ?? 0) + 1);
			overall.set(c, (overall.get(c) ?? 0) + 1);
		}
		per.set(g.id, m);
	}
	const rest = [...overall.keys()]
		.filter((c) => !order.includes(c))
		.sort((a, b) => overall.get(b)! - overall.get(a)! || a.localeCompare(b));
	const full = [...order, ...rest];
	const segments = new Map<string, { category: string; n: number }[]>();
	for (const [id, m] of per) {
		segments.set(
			id,
			full.filter((c) => m.has(c)).map((category) => ({ category, n: m.get(category)! }))
		);
	}
	return { order: full, segments };
}

/** Five-number summary of a numeric attribute in one column, as drawn by a Tukey box plot. */
export interface Summary {
	/** Number of finite values. */
	n: number;
	min: number;
	q1: number;
	median: number;
	q3: number;
	max: number;
	mean: number;
	/** Smallest value that is not below `q1 - 1.5 * IQR`. */
	whiskerLow: number;
	/** Largest value that is not above `q3 + 1.5 * IQR`. */
	whiskerHigh: number;
	/** Values outside the whiskers, ascending. */
	outliers: number[];
}

/** Linear-interpolated quantile (R type 7) of an ascending, non-empty array. */
function quantile(sorted: number[], p: number): number {
	const h = (sorted.length - 1) * p;
	const lo = Math.floor(h);
	const hi = Math.min(lo + 1, sorted.length - 1);
	return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

/**
 * Summarise a numeric attribute of the rows in every column: quartiles (type 7, linear interpolation), mean and
 * Tukey whiskers (1.5 * IQR) with outliers, keyed by intersection id. `valueOf` is a key of the row or a function;
 * `null`, `undefined`, `NaN` and other non-finite values are ignored. A column whose rows have no usable value gets
 * `n: 0` and `NaN` in every other field (`outliers` is empty). Needs the rows: for precomputed input or
 * `keepItems: false` there are no rows, so the map is empty.
 */
export function summarize<T>(
	result: Pick<UpSetResult<T>, 'intersections'>,
	valueOf: (keyof T & string) | ((item: T) => number | null | undefined)
): Map<string, Summary> {
	const out = new Map<string, Summary>();
	for (const g of result.intersections) {
		const items = g.items;
		if (items.length === 0) continue;
		const v: number[] = [];
		for (const item of items) {
			const x = typeof valueOf === 'function' ? valueOf(item) : (item as Record<string, unknown>)[valueOf];
			if (typeof x === 'number' && Number.isFinite(x)) v.push(x);
		}
		if (v.length === 0) {
			const nan = NaN;
			out.set(g.id, { n: 0, min: nan, q1: nan, median: nan, q3: nan, max: nan, mean: nan, whiskerLow: nan, whiskerHigh: nan, outliers: [] });
			continue;
		}
		v.sort((a, b) => a - b);
		const q1 = quantile(v, 0.25);
		const q3 = quantile(v, 0.75);
		const lo = q1 - 1.5 * (q3 - q1);
		const hi = q3 + 1.5 * (q3 - q1);
		const inside = v.filter((x) => x >= lo && x <= hi);
		out.set(g.id, {
			n: v.length,
			min: v[0],
			q1,
			median: quantile(v, 0.5),
			q3,
			max: v[v.length - 1],
			mean: v.reduce((a, b) => a + b, 0) / v.length,
			whiskerLow: inside[0],
			whiskerHigh: inside[inside.length - 1],
			outliers: v.filter((x) => x < lo || x > hi)
		});
	}
	return out;
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
