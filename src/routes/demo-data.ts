export const genres = ['Drama', 'Comedy', 'Action', 'Thriller', 'Romance', 'Sci-Fi'];
const weights = [0.5, 0.4, 0.25, 0.2, 0.15, 0.1];

/** Deterministic pseudo-random genre membership (movies-like toy data). */
export function makeData(n = 600, seed = 42) {
	const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
	return Array.from({ length: n }, (_, i) => {
		const row: Record<string, unknown> = { id: i };
		genres.forEach((g, j) => (row[g] = rand() < weights[j]));
		return row;
	});
}
