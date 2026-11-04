import { describe, expect, it } from 'vitest';
import {
	LOG_FLOOR,
	clampSize,
	computeUpset,
	reportOf,
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
