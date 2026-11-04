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
}

export interface SetInfo {
	name: string;
	size: number;
}

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

	let intersections = [...groups.values()].filter(
		(g) =>
			g.size >= minSize && g.size <= maxSize && g.degree >= minDegree && g.degree <= maxDegree
	);

	if (sortIntersectionsBy !== 'none') {
		const dir = sortIntersectionsOrder === 'descending' ? -1 : 1;
		intersections.sort((a, b) => {
			const primary =
				sortIntersectionsBy === 'cardinality' ? a.size - b.size : a.degree - b.degree;
			if (primary !== 0) return dir * primary;
			// stable, readable tie-break: secondary metric, then by set order
			const secondary =
				sortIntersectionsBy === 'cardinality' ? a.degree - b.degree : b.size - a.size;
			if (secondary !== 0) return secondary;
			return a.id.localeCompare(b.id);
		});
	}
	if (limit != null) intersections = intersections.slice(0, limit);

	return { sets, intersections, total: data.length };
}
