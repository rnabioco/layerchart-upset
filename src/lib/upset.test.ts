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
