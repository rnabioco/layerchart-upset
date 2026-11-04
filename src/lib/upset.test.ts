import { describe, expect, it } from 'vitest';
import { computeUpset } from './upset.js';

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
