import { describe, expect, it } from 'vitest';
import {
	LOG_FLOOR,
	maxOf,
	clampSize,
	computeUpset,
	intersectionId,
	membersOf,
	queryCounts,
	reportOf,
	stackSegments,
	summarize,
	toCSV,
	sizeDomain,
	sizeScale,
	sizeTicks,
	sizeTop
} from './upset.js';

const data = [
	{ A: true, B: false, C: false },
	{ A: true, B: false, C: false },
	{ A: true, B: true, C: false },
	{ A: false, B: true, C: true },
	{ A: true, B: true, C: true },
	{ A: false, B: false, C: false } // in no set: ignored
];
const sets = ['A', 'B', 'C'];

describe('computeUpset', () => {
	it('computes set sizes sorted descending', () => {
		const { sets: s } = computeUpset(data, sets);
		expect(s).toEqual([
			{ name: 'A', size: 4 },
			{ name: 'B', size: 3 },
			{ name: 'C', size: 2 }
		]);
	});

	it('distinct mode counts exact combinations only', () => {
		const { intersections } = computeUpset(data, sets);
		const sizes = Object.fromEntries(intersections.map((i) => [i.id, i.size]));
		expect(sizes).toEqual({ A: 2, 'A&B': 1, 'B&C': 1, 'A&B&C': 1 });
		expect(intersections[0].id).toBe('A');
	});

	it('intersect mode counts supersets too', () => {
		const sizes = Object.fromEntries(
			computeUpset(data, sets, { mode: 'intersect' }).intersections.map((i) => [i.id, i.size])
		);
		expect(sizes['A']).toBe(4);
		expect(sizes['A&B']).toBe(2);
		expect(sizes['A&B&C']).toBe(1);
	});

	it('union mode counts items hitting any set', () => {
		const sizes = Object.fromEntries(
			computeUpset(data, sets, { mode: 'union' }).intersections.map((i) => [i.id, i.size])
		);
		expect(sizes['A&B&C']).toBe(5);
	});

	it('filters and limits', () => {
		expect(computeUpset(data, sets, { minSize: 2 }).intersections.map((i) => i.id)).toEqual(['A']);
		expect(computeUpset(data, sets, { minDegree: 2 }).intersections.every((i) => i.degree >= 2)).toBe(true);
		expect(computeUpset(data, sets, { limit: 2 }).intersections).toHaveLength(2);
	});

	it('sorts by degree', () => {
		const degs = computeUpset(data, sets, { sortIntersectionsBy: 'degree' }).intersections.map((i) => i.degree);
		expect(degs).toEqual([...degs].sort((a, b) => b - a));
	});
});

import { fromIntersections } from './upset.js';

describe('fromIntersections', () => {
	const sets = ['x', 'y', 'z'];
	const input = [
		{ id: 5, sets: ['x'], size: 3 },
		{ id: 6, sets: ['z', 'x'], size: 10 },
		{ sets: ['y'], size: 7 }
	];

	it('keeps the given order and the given ids', () => {
		const r = fromIntersections(sets, input);
		expect(r.intersections.map((i) => i.id)).toEqual(['5', '6', 'y']);
		expect(r.sets.map((s) => s.name)).toEqual(sets);
		expect(r.intersections[1].sets).toEqual(['x', 'z']); // normalised to set order
		expect(r.intersections[1].degree).toBe(2);
		expect((r.intersections[1].source as { id: number }).id).toBe(6);
	});

	it('sums set sizes from intersections unless provided', () => {
		expect(fromIntersections(sets, input).sets.map((s) => s.size)).toEqual([13, 7, 10]);
		expect(fromIntersections(sets, input, { setSizes: { x: 1, y: 2, z: 3 } }).sets.map((s) => s.size)).toEqual([1, 2, 3]);
	});

	it('sorts and filters on request', () => {
		const r = fromIntersections(sets, input, { sortIntersectionsBy: 'cardinality', minSize: 5 });
		expect(r.intersections.map((i) => i.size)).toEqual([10, 7]);
	});

	it('rejects unknown sets', () => {
		expect(() => fromIntersections(sets, [{ sets: ['q'], size: 1 }])).toThrow(/unknown set/);
	});
});

describe('hidden intersection count', () => {
	const names = ['A', 'B', 'C', 'D', 'E', 'F'];
	// 50 distinct combinations, sizes 1..50
	const fifty = Array.from({ length: 63 }, (_, k) => k + 1)
		.slice(0, 50)
		.map((mask, k) => ({
			sets: names.filter((_, i) => mask & (1 << i)),
			size: k + 1
		}));

	it('limit_reports_hidden_count', () => {
		const r = fromIntersections(names, fifty, { limit: 30 });
		expect(reportOf(r)).toEqual({ shown: 30, total: 50, hidden: 20 });
		const rows = Array.from({ length: 5 }, (_, i) => ({ A: i < 3, B: i % 2 === 0, C: i === 4 }));
		const c = computeUpset(rows, ['A', 'B', 'C'], { limit: 1 });
		expect(c.totalIntersections).toBeGreaterThan(1);
		expect(reportOf(c).hidden).toBe(c.totalIntersections - 1);
	});

	it('filters_count_toward_hidden', () => {
		const r = fromIntersections(names, fifty, { minSize: 41 });
		expect(reportOf(r)).toEqual({ shown: 10, total: 50, hidden: 40 });
		const d = fromIntersections(names, fifty, { minSize: 41, limit: 4 });
		expect(reportOf(d)).toEqual({ shown: 4, total: 50, hidden: 46 });
	});

	it('no_limit_hides_nothing', () => {
		expect(reportOf(fromIntersections(names, fifty))).toEqual({ shown: 50, total: 50, hidden: 0 });
		const c = computeUpset([{ A: true }, { A: false, B: true }], ['A', 'B']);
		expect(reportOf(c).hidden).toBe(0);
	});

	it('intersectionsTotal overrides the given list length', () => {
		const r = fromIntersections(names, fifty, { intersectionsTotal: 212, limit: 30 });
		expect(reportOf(r)).toEqual({ shown: 30, total: 212, hidden: 182 });
	});
});

describe('size scales', () => {
	it('scale_log_floor_and_top', () => {
		expect(sizeTop(300)).toBe(1000);
		expect(sizeTop(1000)).toBe(1000);
		expect(sizeTop(1)).toBe(10);
		expect(sizeDomain('log', 300)).toEqual([LOG_FLOOR, 1000]);
		expect(sizeDomain('symlog', 300)).toEqual([0, 1000]);
		// a size of 1 must have a visible bar: it sits above the floor
		const y = sizeScale('log').domain(sizeDomain('log', 300)).range([200, 0]);
		expect(y(1)).toBeLessThan(y(LOG_FLOOR));
	});

	it('scale_log_ticks', () => {
		expect(sizeTicks('log', 100)).toEqual([1, 2, 5, 10, 20, 50, 100]);
		expect(sizeTicks('log', 10000)).toEqual([1, 10, 100, 1000, 10000]);
	});

	it('scale_symlog_ticks', () => {
		expect(sizeTicks('symlog', 100)).toEqual([0, 1, 2, 5, 10, 20, 50, 100]);
		expect(sizeTicks('symlog', 10000)?.[0]).toBe(0);
		expect(sizeTicks('linear', 100)).toBeUndefined();
	});

	it('scale_zero_clamped', () => {
		expect(clampSize('log', 0)).toBe(LOG_FLOOR);
		expect(clampSize('log', 7)).toBe(7);
		expect(clampSize('symlog', 0)).toBe(0);
		expect(clampSize('linear', 0)).toBe(0);
		const y = sizeScale('symlog').domain(sizeDomain('symlog', 50)).range([200, 0]);
		expect(y(0)).toBe(200);
	});
});

describe('export helpers', () => {
	const r = computeUpset(data, sets);

	it('to_csv_escapes_quotes', () => {
		const rows = [{ A: true, name: 'say "hi", ok' }];
		const c = computeUpset(rows, ['A']);
		const csv = toCSV(c, { items: (x) => String(x.name) });
		expect(csv).toBe('id,degree,size,A,items\nA,1,1,1,"say ""hi"", ok"\n');
	});

	it('to_csv_has_a_column_per_set', () => {
		const lines = toCSV(r).trim().split('\n');
		expect(lines[0]).toBe(['id', 'degree', 'size', ...r.sets.map((s) => s.name)].join(','));
		expect(lines.length).toBe(r.intersections.length + 1);
		const first = r.intersections[0];
		expect(lines[1].split(',').slice(0, 3)).toEqual([first.id, String(first.degree), String(first.size)]);
	});

	it('members_of_unknown_id_is_empty', () => {
		expect(membersOf(r, 'nope')).toEqual([]);
		const g = r.intersections[0];
		expect(membersOf(r, g.id)).toEqual(g.items);
	});
});

describe('computeUpset modes against a brute-force reference', () => {
	// The original algorithm: every row against every non-empty combination of sets.
	function reference(rows: Record<string, boolean>[], names: string[], mode: 'distinct' | 'intersect' | 'union') {
		const { sets: ranked } = computeUpset(rows, names, { minSize: 0 });
		const order = ranked.map((s) => s.name);
		const out = new Map<string, number[]>();
		rows.forEach((row, r) => {
			const members = order.filter((s) => row[s]);
			if (!members.length) return;
			for (let m = 1; m < 1 << order.length; m++) {
				const combo = order.filter((_, i) => m & (1 << i));
				const hit =
					mode === 'distinct'
						? combo.length === members.length && combo.every((s) => members.includes(s))
						: mode === 'intersect'
							? combo.every((s) => members.includes(s))
							: combo.some((s) => members.includes(s));
				if (hit) {
					const key = names.filter((n) => combo.includes(n)).join('&'); // ids use input order
					out.set(key, [...(out.get(key) ?? []), r]);
				}
			}
		});
		return out;
	}

	const names = ['A', 'B', 'C', 'D', 'E'];
	let seed = 7;
	const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
	const rows = Array.from({ length: 400 }, () => Object.fromEntries(names.map((n) => [n, rnd() < 0.4])));

	for (const mode of ['distinct', 'intersect', 'union'] as const) {
		it(`${mode}_matches_bruteforce`, () => {
			const got = computeUpset(rows, names, { mode, minSize: 0, sortIntersectionsBy: 'none' });
			const want = reference(rows, names, mode);
			expect(got.intersections.length).toBe(want.size);
			for (const g of got.intersections) {
				const idx = want.get(g.id);
				expect(idx, g.id).toBeDefined();
				expect(g.size).toBe(idx!.length);
				expect(g.items).toEqual(idx!.map((r) => rows[r]));
			}
		});
	}

	it('keep_items_false_empties_items', () => {
		const r = computeUpset(rows, names, { mode: 'intersect', keepItems: false });
		const k = computeUpset(rows, names, { mode: 'intersect' });
		expect(r.intersections.every((g) => g.items.length === 0)).toBe(true);
		expect(r.intersections.map((g) => [g.id, g.size])).toEqual(k.intersections.map((g) => [g.id, g.size]));
	});

	it('sort_by_sets_orders_by_set_rank', () => {
		const r = computeUpset(rows, names, { mode: 'intersect', sortIntersectionsBy: 'sets', sortSetsBy: 'none' });
		const ids = r.intersections.map((g) => g.id);
		expect(ids.slice(0, 5)).toEqual(['A', 'A&B', 'A&B&C', 'A&B&C&D', 'A&B&C&D&E']);
		expect(ids.indexOf('A&B&C&D&E')).toBeLessThan(ids.indexOf('A&B&C&E'));
		expect(ids[ids.length - 1]).toBe('E');
	});

	it('sort_by_sets_respects_order_flag', () => {
		const down = computeUpset(rows, names, { mode: 'intersect', sortIntersectionsBy: 'sets', sortSetsBy: 'none' });
		const up = computeUpset(rows, names, {
			mode: 'intersect',
			sortIntersectionsBy: 'sets',
			sortIntersectionsOrder: 'ascending',
			sortSetsBy: 'none'
		});
		expect(up.intersections.map((g) => g.id)).toEqual(down.intersections.map((g) => g.id).reverse());
		// precomputed input follows the given set order too
		const p = fromIntersections(['B', 'A'], [{ sets: ['A'], size: 1 }, { sets: ['B'], size: 1 }], {
			sortIntersectionsBy: 'sets'
		});
		expect(p.intersections.map((g) => g.id)).toEqual(['B', 'A']);
	});

	it('intersect_scales_to_many_sets', () => {
		const many = Array.from({ length: 15 }, (_, i) => `S${i}`);
		const big = Array.from({ length: 20000 }, () => Object.fromEntries(many.map((n) => [n, rnd() < 0.15])));
		const t = performance.now();
		computeUpset(big, many, { mode: 'intersect', keepItems: false });
		expect(performance.now() - t).toBeLessThan(5000);
	});
});

describe('queryCounts', () => {
	const rows = data.map((r, i) => ({ ...r, i }));
	it('query_counts_match_filter', () => {
		const result = computeUpset(rows, sets);
		const even = (r: { i: number }) => r.i % 2 === 0;
		const counts = queryCounts(result, [
			{ id: 'even', color: 'red', filter: even },
			{ id: 'none', color: 'blue', filter: () => false },
			{ id: 'all', color: 'green', filter: () => true }
		]);
		for (const g of result.intersections) {
			const [e, none, all] = counts.get(g.id)!;
			expect(e).toBe(g.items.filter(even).length);
			expect(none).toBe(0);
			expect(all).toBe(g.size);
		}
	});

	it('query_ignored_without_items', () => {
		const result = computeUpset(rows, sets, { keepItems: false });
		const counts = queryCounts(result, [{ id: 'all', color: 'red', filter: () => true }]);
		expect([...counts.values()].every((c) => c[0] === 0)).toBe(true);
	});
});

describe('stackSegments', () => {
	const rows = data.map((r, i) => ({ ...r, kind: i % 3 === 0 ? 'x' : i % 3 === 1 ? 'y' : null }));
	it('stack_segments_sum_to_size', () => {
		const result = computeUpset(rows, sets);
		const { segments } = stackSegments(result, 'kind');
		for (const g of result.intersections) {
			expect(segments.get(g.id)!.reduce((s, c) => s + c.n, 0)).toBe(g.size);
		}
	});

	it('stack_order_default_by_count', () => {
		const result = computeUpset(rows, sets);
		const { order } = stackSegments(result, 'kind');
		expect(new Set(order)).toEqual(new Set(['x', 'y', '(none)']));
		const counts = new Map(order.map((c) => [c, 0]));
		for (const g of result.intersections) for (const it of g.items) counts.set(it.kind ?? '(none)', counts.get(it.kind ?? '(none)')! + 1);
		for (let i = 1; i < order.length; i++) expect(counts.get(order[i - 1])!).toBeGreaterThanOrEqual(counts.get(order[i])!);
		// explicit order wins, unknown categories follow
		expect(stackSegments(result, 'kind', ['y']).order[0]).toBe('y');
		// a function works too
		expect(stackSegments(result, (r) => (r.A ? 'a' : 'not a')).order.sort()).toEqual(['a', 'not a']);
	});

	it('stack_needs_items', () => {
		const result = computeUpset(rows, sets, { keepItems: false });
		const { order, segments } = stackSegments(result, 'kind');
		expect(order).toEqual([]);
		expect([...segments.values()].every((s) => s.length === 0)).toBe(true);
	});
});

describe('showEmpty', () => {
	it('show_empty_adds_missing_combinations', () => {
		const base = computeUpset(data, sets);
		const all = computeUpset(data, sets, { showEmpty: true });
		expect(all.intersections).toHaveLength(7); // 2^3 - 1
		expect(all.intersections.filter((g) => g.size === 0).length).toBe(7 - base.intersections.length);
		// real columns keep their sizes; empty ones sort last under the default cardinality order
		for (const g of base.intersections) expect(all.intersections.find((x) => x.id === g.id)!.size).toBe(g.size);
		expect(all.intersections.slice(-2).every((g) => g.size === 0)).toBe(true);
		expect(base.intersections.every((g) => g.size > 0)).toBe(true);
	});

	it('show_empty_respects_degree_filter', () => {
		const r = computeUpset(data, sets, { showEmpty: true, minDegree: 2, maxDegree: 2 });
		expect(r.intersections.map((g) => g.degree)).toEqual([2, 2, 2]);
		expect(r.intersections.some((g) => g.size === 0)).toBe(true);
	});

	it('show_empty_precomputed_and_minsize', () => {
		const r = fromIntersections(['A', 'B'], [{ sets: ['A'], size: 3 }], { showEmpty: true });
		expect(r.intersections.map((g) => [g.id, g.size])).toEqual([
			['A', 3],
			['B', 0],
			['A&B', 0]
		]);
		// an explicit minSize still wins
		expect(computeUpset(data, sets, { showEmpty: true, minSize: 1 }).intersections.every((g) => g.size > 0)).toBe(true);
	});
});

describe('S2 remaining: union, lazy items, scale', () => {
	const names = ['A', 'B', 'C', 'D', 'E', 'F'];
	let seed = 11;
	const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
	const rows = Array.from({ length: 3000 }, () => Object.fromEntries(names.map((n) => [n, rnd() < 0.5])));
	const key = (r: ReturnType<typeof computeUpset>) =>
		JSON.stringify(r.intersections.map((g) => [g.id, g.size, g.degree]));

	it('dense_and_sparse_intersect_agree', () => {
		// sorted -> dense table (many distinct masks); unsorted -> sparse enumeration
		const dense = computeUpset(rows, names, { mode: 'intersect', minSize: 0 });
		const sparse = computeUpset(rows, names, { mode: 'intersect', minSize: 0, sortIntersectionsBy: 'none' });
		const byId = new Map(sparse.intersections.map((g) => [g.id, g.size]));
		expect(dense.intersections.length).toBe(sparse.intersections.length);
		for (const g of dense.intersections) expect(byId.get(g.id)).toBe(g.size);
	});

	it('items_are_lazy_and_only_for_kept_columns', () => {
		const r = computeUpset(rows, names, { mode: 'union', limit: 3 });
		for (const g of r.intersections) expect(g.items.length).toBe(g.size);
		const all = computeUpset(rows, names, { mode: 'union', limit: 3, sortIntersectionsBy: 'none' });
		expect(all.intersections).toHaveLength(3);
	});

	it('union_too_many_sets_throws', () => {
		const wide = Array.from({ length: 26 }, (_, i) => `S${i}`);
		expect(() => computeUpset([{ S0: true }], wide, { mode: 'union' })).toThrow(/at most 24/);
	});

	it('scale_15_sets_100k_rows_under_2s', () => {
		const sets15 = Array.from({ length: 15 }, (_, i) => `S${i}`);
		const big = Array.from({ length: 100_000 }, () => Object.fromEntries(sets15.map((n) => [n, rnd() < 0.15])));
		for (const mode of ['distinct', 'intersect', 'union'] as const) {
			const t = performance.now();
			const r = computeUpset(big, sets15, { mode, limit: 50 });
			expect(r.intersections).toHaveLength(50);
			expect(performance.now() - t).toBeLessThan(2000);
		}
	});
});

describe('set identity and input validation', () => {
	it('many_sets_over_31', () => {
		const wide = Array.from({ length: 33 }, (_, i) => `S${i}`);
		const rows = [{ S0: true }, { S32: true }, { S0: true, S32: true }];
		const r = computeUpset(rows, wide, { sortSetsBy: 'none' });
		const sizes = Object.fromEntries(r.intersections.map((g) => [g.id, g.size]));
		expect(sizes).toEqual({ S0: 1, S32: 1, 'S0&S32': 1 });
		expect(r.sets.find((s) => s.name === 'S32')!.size).toBe(2);
		expect(r.intersections.every((g) => g.items.length === g.size)).toBe(true);
	});

	it('wide_sets_reject_combination_modes', () => {
		const wide = Array.from({ length: 33 }, (_, i) => `S${i}`);
		expect(() => computeUpset([{ S0: true }], wide, { mode: 'intersect' })).toThrow(/at most 30/);
	});

	it('thirty_sets_use_every_bit', () => {
		const names30 = Array.from({ length: 30 }, (_, i) => `S${i}`);
		const rows = [{ S29: true }, { S29: true, S0: true }];
		const r = computeUpset(rows, names30, { mode: 'intersect', sortSetsBy: 'none' });
		expect(Object.fromEntries(r.intersections.map((g) => [g.id, g.size]))).toEqual({ S29: 2, S0: 1, 'S0&S29': 1 });
	});

	it('ampersand_set_name', () => {
		const rows = [{ A: true, B: true }, { 'A&B': true }];
		const r = computeUpset(rows, ['A', 'B', 'A&B'], { sortSetsBy: 'none' });
		const ids = r.intersections.map((g) => g.id).sort();
		expect(ids).toEqual(['A&B', 'A\\&B']);
		expect(r.intersections.every((g) => g.size === 1)).toBe(true);
		expect(intersectionId(['A', 'B'])).toBe('A&B'); // ids of ordinary names are unchanged
	});

	it('duplicate_set_names_throw', () => {
		expect(() => computeUpset([{ A: true }], ['A', 'A'])).toThrow(/Duplicate set name "A"/);
		expect(() => fromIntersections(['A', 'A'], [])).toThrow(/Duplicate set name/);
	});

	it('precomputed_invalid_size_throws', () => {
		for (const size of [NaN, -3, Infinity]) {
			expect(() => fromIntersections(['A', 'B'], [{ sets: ['A'], size }])).toThrow(/invalid size/);
		}
		expect(fromIntersections(['A'], [{ sets: ['A'], size: 0 }], { minSize: 0 }).intersections[0].size).toBe(0);
	});

	it('precomputed_duplicate_ids_throw', () => {
		expect(() =>
			fromIntersections(['A', 'B'], [{ sets: ['A'], size: 1 }, { id: 'A', sets: ['B'], size: 2 }])
		).toThrow(/Duplicate intersection id "A"/);
	});
});

describe('maxOf', () => {
	it('matches Math.max with a floor and survives huge arrays', () => {
		expect(maxOf([3, 7, 2], 1)).toBe(7);
		expect(maxOf([], 1)).toBe(1);
		expect(maxOf([0, -2], 1)).toBe(1);
		expect(maxOf(Array.from({ length: 300000 }, (_, i) => i), 1)).toBe(299999);
	});
});

describe('summarize', () => {
	// every row is in set A only, so a single column holds all the values
	const mk = (vals: (number | null | undefined | string)[]) =>
		vals.map((v) => ({ A: true, B: false, v }));
	const one = (vals: (number | null | undefined | string)[], by: any = 'v', opts = {}) => {
		const r = computeUpset(mk(vals), ['A', 'B'], opts);
		return summarize(r, by).get('A')!;
	};

	it('summarize_quartiles_match_reference', () => {
		// odd n: 1..5 -> q1 2, median 3, q3 4 (type 7)
		const a = one([5, 1, 3, 2, 4]);
		expect([a.n, a.min, a.q1, a.median, a.q3, a.max, a.mean]).toEqual([5, 1, 2, 3, 4, 5, 3]);
		// even n: 1,2,3,4 -> q1 1.75, median 2.5, q3 3.25
		const b = one([4, 3, 2, 1]);
		expect([b.q1, b.median, b.q3, b.mean]).toEqual([1.75, 2.5, 3.25, 2.5]);
		expect([b.whiskerLow, b.whiskerHigh, b.outliers]).toEqual([1, 4, []]);
	});

	it('summarize_ignores_non_finite', () => {
		const s = one([1, 2, 3, null, undefined, NaN, Infinity, -Infinity, 'x']);
		expect(s.n).toBe(3);
		expect(s.median).toBe(2);
		const none = one([null, NaN]);
		expect(none.n).toBe(0);
		expect(Number.isNaN(none.median)).toBe(true);
		expect(none.outliers).toEqual([]);
	});

	it('summarize_outliers_tukey', () => {
		// q1 2.25, q3 4.75, IQR 2.5 -> fences -1.5 and 8.5
		const hi = one([1, 2, 3, 4, 5, 100]);
		expect(hi.outliers).toEqual([100]);
		expect([hi.whiskerLow, hi.whiskerHigh, hi.max]).toEqual([1, 5, 100]);
		// q1 1.25, q3 3.75, IQR 2.5 -> fences -2.5 and 7.5
		const lo = one([-100, 1, 2, 3, 4, 5]);
		expect(lo.outliers).toEqual([-100]);
		expect([lo.whiskerLow, lo.whiskerHigh, lo.min]).toEqual([1, 5, -100]);
	});

	it('summarize_empty_without_items', () => {
		expect(summarize(computeUpset(mk([1, 2, 3]), ['A', 'B'], { keepItems: false }), 'v').size).toBe(0);
		const pre = fromIntersections(['A', 'B'], [{ sets: ['A'], size: 3 }]);
		expect(summarize(pre, 'v' as never).size).toBe(0);
	});

	it('summarize_by_function_and_key', () => {
		const rows = mk([1, 2, 3, 4]);
		const r = computeUpset(rows, ['A', 'B']);
		const k = summarize(r, 'v').get('A')!;
		const f = summarize(r, (row: { v: unknown }) => (row.v as number) * 2).get('A')!;
		expect(f.median).toBe(k.median * 2);
		expect(f.mean).toBe(k.mean * 2);
		expect([...summarize(r, 'v').keys()]).toEqual(r.intersections.map((g) => g.id));
	});
});

describe('stable ids', () => {
	it('ids do not change when set display order changes', () => {
		const data = [{ a: 1, b: 1 }, { a: 1, b: 1 }, { a: 1, b: 0 }, { a: 0, b: 1 }, { a: 0, b: 1 }, { a: 0, b: 1 }];
		const ids = (o: object) => computeUpset(data, ['a', 'b'], o).intersections.map((g) => g.id).sort();
		const base = ids({ sortSetsBy: 'none' });
		expect(base).toEqual(['a', 'a&b', 'b']);
		expect(ids({ sortSetsBy: 'cardinality', sortSetsOrder: 'descending' })).toEqual(base);
		expect(ids({ sortSetsBy: 'cardinality', sortSetsOrder: 'ascending' })).toEqual(base);
	});
});
