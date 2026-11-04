export type UpSetMode = 'distinct' | 'intersect' | 'union';

export interface UpSetOptions {
	/**
	 * How items are assigned to intersections (mirrors ComplexUpset's `mode`):
	 * - `distinct`: an item counts only in the exact combination of sets it belongs to (default)
	 * - `intersect`: an item counts in every combination that is a subset of its memberships
	 * - `union`: an item counts in every combination it overlaps with at least one set
	 */
	mode?: UpSetMode;
	sortIntersectionsBy?: 'cardinality' | 'degree' | 'none';
	sortIntersectionsOrder?: 'descending' | 'ascending';
	sortSetsBy?: 'cardinality' | 'none';
	sortSetsOrder?: 'descending' | 'ascending';
	minSize?: number;
	maxSize?: number;
	minDegree?: number;
	maxDegree?: number;
	/** Keep only the first N intersections after sorting. */
	limit?: number;
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
}

/** Build the set of members for a row given boolean (or truthy) membership columns. */
function membership<T extends Record<string, unknown>>(row: T, sets: string[]): string[] {
	return sets.filter((s) => Boolean(row[s]));
}

function combos(names: string[]): string[][] {
	const out: string[][] = [];
	const n = names.length;
	for (let mask = 1; mask < 1 << n; mask++) {
		out.push(names.filter((_, i) => mask & (1 << i)));
	}
	return out;
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
		minSize = 1,
		maxSize = Infinity,
		minDegree = 1,
		maxDegree = Infinity,
		limit
	} = options;

	const sizes = new Map<string, number>(setNames.map((s) => [s, 0]));
	for (const row of data) for (const s of membership(row, setNames)) sizes.set(s, sizes.get(s)! + 1);

	let sets: SetInfo[] = setNames.map((name) => ({ name, size: sizes.get(name)! }));
	if (sortSetsBy === 'cardinality') {
		const dir = sortSetsOrder === 'descending' ? -1 : 1;
		sets = sets.sort((a, b) => dir * (a.size - b.size));
	}
	const order = sets.map((s) => s.name);
	const rank = new Map(order.map((s, i) => [s, i]));
	const byRank = (xs: string[]) => [...xs].sort((a, b) => rank.get(a)! - rank.get(b)!);

	const groups = new Map<string, Intersection<T>>();
	const add = (members: string[], row: T) => {
		const id = members.join('&');
		let g = groups.get(id);
		if (!g) {
			g = { id, sets: members, degree: members.length, size: 0, items: [] };
			groups.set(id, g);
		}
		g.items.push(row);
		g.size++;
	};

	for (const row of data) {
		const members = byRank(membership(row, setNames));
		if (members.length === 0) continue;
		if (mode === 'distinct') {
			add(members, row);
		} else {
			for (const combo of combos(order)) {
				const hit =
					mode === 'intersect'
						? combo.every((s) => members.includes(s))
						: combo.some((s) => members.includes(s));
				if (hit) add(combo, row);
			}
		}
	}

	const intersections = rankAndFilter([...groups.values()], {
		sortIntersectionsBy,
		sortIntersectionsOrder,
		minSize,
		maxSize,
		minDegree,
		maxDegree,
		limit
	});

	return { sets, intersections, total: data.length };
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
>;

function rankAndFilter<T>(all: Intersection<T>[], o: RankOptions): Intersection<T>[] {
	const {
		sortIntersectionsBy = 'cardinality',
		sortIntersectionsOrder = 'descending',
		minSize = 1,
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
		out = [...out].sort((a, b) => {
			const primary =
				sortIntersectionsBy === 'cardinality' ? a.size - b.size : a.degree - b.degree;
			if (primary !== 0) return dir * primary;
			// stable, readable tie-break: secondary metric, then by id
			const secondary =
				sortIntersectionsBy === 'cardinality' ? a.degree - b.degree : b.size - a.size;
			if (secondary !== 0) return secondary;
			return a.id.localeCompare(b.id);
		});
	}
	return limit != null ? out.slice(0, limit) : out;
}

export interface PrecomputedOptions extends UpSetOptions {
	/** Known set sizes. When omitted they are summed from the intersections (exact for disjoint counts). */
	setSizes?: Record<string, number>;
	/** Total item count, used for percentages in tooltips. */
	total?: number;
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
	const { setSizes, total, sortSetsBy = 'none', sortSetsOrder = 'descending' } = options;
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

	const sizes = new Map(setNames.map((n) => [n, setSizes?.[n] ?? 0]));
	if (!setSizes) for (const g of all) for (const n of g.sets) sizes.set(n, sizes.get(n)! + g.size);
	let sets: SetInfo[] = setNames.map((name) => ({ name, size: sizes.get(name)! }));
	if (sortSetsBy === 'cardinality') {
		const dir = sortSetsOrder === 'descending' ? -1 : 1;
		sets = [...sets].sort((a, b) => dir * (a.size - b.size));
	}

	const intersections = rankAndFilter(all, { sortIntersectionsBy: 'none', ...options });
	return { sets, intersections, total: total ?? NaN };
}
