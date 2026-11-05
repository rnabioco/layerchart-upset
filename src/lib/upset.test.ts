import { describe, expect, it } from 'vitest';
import {
	LOG_FLOOR,
	clampSize,
	computeUpset,
	membersOf,
	queryCounts,
	reportOf,
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
				if (hit) out.set(combo.join('&'), [...(out.get(combo.join('&')) ?? []), r]);
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
